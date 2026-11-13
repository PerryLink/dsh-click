# dsh-click native helper (Windows PowerShell 5.1).
#
# One request = one process: JSON request on stdin, JSON response on stdout
# (exit code 0 even for handled failures; the error envelope is the response).
# The harness drives this through ctx.subprocess; nothing here ever writes to
# any other stream, and nothing here steals foreground focus unless the
# `focusFallback` flag is explicitly true (config-gated, approval-gated).
#
# Operations: windows, apps, metrics, shot, tree, snapshot, click, type, scroll,
# key, launch.
# The helper is NOT a security boundary by itself - the harness-side
# freshness check, approval gate, and process-identity check are. This file
# only refuses to invent global input: actions address one window by handle.

$ErrorActionPreference = 'Stop'

try {
  [Console]::InputEncoding = [System.Text.Encoding]::UTF8
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch { }

# ---------------------------------------------------------------------------
# Win32 interop (one Add-Type block; PS 5.1 safe C#).
# ---------------------------------------------------------------------------
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public static class DshClickWin32 {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);

  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll")]
  public static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);

  // ---- dsh-click input patch: real keyboard injection + reliable focus ----
  [DllImport("user32.dll")]
  public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

  [DllImport("user32.dll")]
  public static extern IntPtr SetFocus(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

  [DllImport("user32.dll")]
  public static extern bool IsIconic(IntPtr hWnd);

  [DllImport("kernel32.dll")]
  public static extern uint GetCurrentThreadId();

  [DllImport("user32.dll")]
  public static extern short VkKeyScanW(char ch);

  [StructLayout(LayoutKind.Sequential)]
  public struct KEYBDINPUT {
    public ushort wVk;
    public ushort wScan;
    public uint dwFlags;
    public uint time;
    public IntPtr dwExtraInfo;
  }

  [StructLayout(LayoutKind.Explicit, Size = 40)]
  public struct INPUT {
    [FieldOffset(0)] public uint type;
    [FieldOffset(8)] public KEYBDINPUT ki;
  }

  [DllImport("user32.dll", SetLastError = true)]
  public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

  public static uint SendUnicodeText(string text) {
    if (string.IsNullOrEmpty(text)) return 0;
    var list = new List<INPUT>();
    foreach (char c in text) {
      INPUT down = new INPUT();
      down.type = 1;
      down.ki.wScan = (ushort)c;
      down.ki.dwFlags = 0x0004;
      list.Add(down);
      INPUT up = new INPUT();
      up.type = 1;
      up.ki.wScan = (ushort)c;
      up.ki.dwFlags = 0x0004 | 0x0002;
      list.Add(up);
    }
    return SendInput((uint)list.Count, list.ToArray(), Marshal.SizeOf(typeof(INPUT)));
  }

  public static uint SendVirtualKey(ushort vk, bool up) {
    INPUT inp = new INPUT();
    inp.type = 1;
    inp.ki.wVk = vk;
    inp.ki.dwFlags = up ? 0x0002u : 0u;
    return SendInput(1, new INPUT[] { inp }, Marshal.SizeOf(typeof(INPUT)));
  }

  public static bool BringToFront(IntPtr hWnd) {
    if (IsIconic(hWnd)) ShowWindow(hWnd, 9);
    if (GetForegroundWindow() == hWnd) return true;
    IntPtr fg = GetForegroundWindow();
    uint ignored;
    uint fgThread = GetWindowThreadProcessId(fg, out ignored);
    uint targetThread = GetWindowThreadProcessId(hWnd, out ignored);
    uint myThread = GetCurrentThreadId();
    bool a1 = AttachThreadInput(myThread, fgThread, true);
    bool a2 = AttachThreadInput(myThread, targetThread, true);
    SetForegroundWindow(hWnd);
    SetFocus(hWnd);
    if (a2) AttachThreadInput(myThread, targetThread, false);
    if (a1) AttachThreadInput(myThread, fgThread, false);
    System.Threading.Thread.Sleep(40);
    return GetForegroundWindow() == hWnd;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct POINT { public int X; public int Y; }

  [DllImport("user32.dll")]
  public static extern bool ScreenToClient(IntPtr hWnd, ref POINT point);

  [DllImport("user32.dll")]
  public static extern bool GetClientRect(IntPtr hWnd, out RECT rect);

  [DllImport("user32.dll")]
  public static extern int GetSystemMetrics(int index);

  // PrintWindow: ask a window to paint itself into a DC. Flag 2 is
  // PW_RENDERFULLCONTENT (Windows 8.1+), which makes DWM/DirectComposition
  // windows render their real content instead of a blank or chrome-only
  // frame; flag 0 is the legacy path for windows that ignore the newer flag.
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);

  // DPI awareness. The helper is hosted by powershell.exe, whose manifest
  // declares no DPI awareness, so GetWindowRect/GetSystemMetrics/GetClientRect
  // return logical pixels while UIA BoundingRectangle and the screen DC are
  // physical. On a 200% display that is a clean 2x mismatch (and a 1:1 BitBlt
  // of a logical-sized rect is a crop of the physical surface, not a scaled
  // image). Per-Monitor V2 is set before any window or metric API runs.
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool SetProcessDpiAwarenessContext(IntPtr context);

  [DllImport("user32.dll")]
  public static extern IntPtr GetThreadDpiAwarenessContext();

  [DllImport("user32.dll")]
  public static extern int GetAwarenessFromDpiAwarenessContext(IntPtr context);

  [DllImport("shcore.dll")]
  public static extern int SetProcessDpiAwareness(int awareness);

  [DllImport("user32.dll")]
  public static extern bool SetProcessDPIAware();

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern IntPtr OpenProcess(uint access, bool inherit, uint processId);

  [DllImport("kernel32.dll")]
  public static extern bool CloseHandle(IntPtr handle);

  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool QueryFullProcessImageName(IntPtr handle, uint flags, StringBuilder buffer, ref uint size);

  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left; public int Top; public int Right; public int Bottom;
  }

  public static IntPtr[] EnumVisibleWindows() {
    var list = new List<IntPtr>();
    EnumWindows(delegate(IntPtr hWnd, IntPtr lParam) {
      if (IsWindowVisible(hWnd)) list.Add(hWnd);
      return true;
    }, IntPtr.Zero);
    return list.ToArray();
  }

  public static string WindowTitle(IntPtr hWnd) {
    var sb = new StringBuilder(1024);
    GetWindowText(hWnd, sb, sb.Capacity);
    return sb.ToString();
  }

  public static string WindowClass(IntPtr hWnd) {
    var sb = new StringBuilder(512);
    GetClassName(hWnd, sb, sb.Capacity);
    return sb.ToString();
  }
}
'@ | Out-Null

# ---------------------------------------------------------------------------
# DPI awareness (must run before any HWND/metric API).
# ---------------------------------------------------------------------------
# DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 = -4. Each helper process serves
# exactly one request, so setting it once here is enough. Fall back to the
# 8.1+ shcore call and then to the Vista-era system-aware call; if every call
# fails, keep the old behaviour instead of breaking the request.
$script:DpiAwareness = 0
try {
  if ([DshClickWin32]::SetProcessDpiAwarenessContext([IntPtr](-4))) { $script:DpiAwareness = 2 }
} catch { }
if ($script:DpiAwareness -eq 0) {
  try {
    if ([DshClickWin32]::SetProcessDpiAwareness(2) -eq 0) { $script:DpiAwareness = 2 }
  } catch { }
}
if ($script:DpiAwareness -eq 0) {
  try {
    if ([DshClickWin32]::SetProcessDPIAware()) { $script:DpiAwareness = 1 }
  } catch { }
}
if ($script:DpiAwareness -eq 0) {
  try {
    $script:DpiAwareness = [DshClickWin32]::GetAwarenessFromDpiAwarenessContext([DshClickWin32]::GetThreadDpiAwarenessContext())
  } catch { }
}

# ---------------------------------------------------------------------------
# Response plumbing.
# ---------------------------------------------------------------------------
function Write-DshResponse($payload) {
  $json = $payload | ConvertTo-Json -Depth 24 -Compress
  [Console]::Out.WriteLine($json)
}

function Write-DshError($code, $message) {
  Write-DshResponse @{ ok = $false; error = @{ code = $code; message = $message } }
}

function ConvertTo-DshJsonValue($value) {
  # PS 5.1 lacks -AsHashtable; round-trip through ConvertTo-Json/ConvertFrom-Json
  # is unnecessary here - property bags serialized directly.
  return $value
}

# ---------------------------------------------------------------------------
# UIA + drawing assemblies.
# ---------------------------------------------------------------------------
try {
  Add-Type -AssemblyName UIAutomationClient | Out-Null
  Add-Type -AssemblyName UIAutomationTypes | Out-Null
  Add-Type -AssemblyName System.Drawing | Out-Null
} catch {
  Write-DshError 'UIA_FAILED' ("cannot load UIAutomation/System.Drawing: " + ($_.Exception.Message))
  exit 0
}

# ---------------------------------------------------------------------------
# Small helpers.
# ---------------------------------------------------------------------------
function Get-WindowRectInfo($hwnd) {
  $rect = New-Object DshClickWin32+RECT
  [void][DshClickWin32]::GetWindowRect($hwnd, [ref]$rect)
  return @{
    x = [int]$rect.Left; y = [int]$rect.Top
    width = [int]($rect.Right - $rect.Left); height = [int]($rect.Bottom - $rect.Top)
  }
}

function Get-ProcessFacts($hwnd) {
  $pidValue = 0
  [void][DshClickWin32]::GetWindowThreadProcessId($hwnd, [ref]$pidValue)
  $pidInt = [int]$pidValue
  $path = $null
  if ($pidInt -gt 0) {
    $handle = [DshClickWin32]::OpenProcess(0x1000, $false, [uint32]$pidInt)  # PROCESS_QUERY_LIMITED_INFORMATION
    if ($handle -ne [IntPtr]::Zero) {
      try {
        $size = [uint32]1024
        $buffer = New-Object System.Text.StringBuilder 1024
        if ([DshClickWin32]::QueryFullProcessImageName($handle, 0, $buffer, [ref]$size)) {
          $path = $buffer.ToString()
        }
      } finally {
        [void][DshClickWin32]::CloseHandle($handle)
      }
    }
  }
  return @{ pid = $pidInt; executablePath = $path }
}

function Get-StringHash($text) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    $hashBytes = $sha.ComputeHash($bytes)
    return ([System.BitConverter]::ToString($hashBytes)).Replace('-', '').ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Get-BitmapHash($bitmap) {
  $rect = New-Object System.Drawing.Rectangle(0, 0, $bitmap.Width, $bitmap.Height)
  $data = $bitmap.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    $byteCount = [Math]::Abs($data.Stride) * $bitmap.Height
    $bytes = New-Object byte[] $byteCount
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $byteCount)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
      $hashBytes = $sha.ComputeHash($bytes)
      return ([System.BitConverter]::ToString($hashBytes)).Replace('-', '').ToLowerInvariant()
    } finally {
      $sha.Dispose()
    }
  } finally {
    $bitmap.UnlockBits($data)
  }
}

function Get-UiaElement($hwnd) {
  return [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]$hwnd)
}

function ConvertTo-Hwnd($value) {
  if ($value -eq $null) { return [IntPtr]::Zero }
  if ($value -is [int]) { return [IntPtr][int64]$value }
  if ($value -is [int64]) { return [IntPtr]$value }
  if ($value -is [double]) { return [IntPtr][int64]$value }
  return [IntPtr]::Zero
}

function Resolve-Window($target) {
  if ($target -eq $null) { $target = @{} }
  $hwnd = ConvertTo-Hwnd $target.windowId
  if ($hwnd -ne [IntPtr]::Zero) {
    $rect = Get-WindowRectInfo $hwnd
    if ($rect.width -le 0 -or $rect.height -le 0) {
      # A handle that no longer resolves to a window.
      $script:ErrorCode = 'WINDOW_NOT_FOUND'
      throw "window $($target.windowId) not found"
    }
    return $hwnd
  }
  $title = $target.windowTitle
  if ($title -ne $null -and $title -is [string] -and $title.Length -gt 0) {
    foreach ($candidate in [DshClickWin32]::EnumVisibleWindows()) {
      if ([DshClickWin32]::WindowTitle($candidate) -like "*$title*") { return $candidate }
    }
    $script:ErrorCode = 'WINDOW_NOT_FOUND'
    throw "no visible window matches title '$title'"
  }
  $processId = $target.processId
  if ($processId -ne $null -and $processId -is [int] -and $processId -gt 0) {
    foreach ($candidate in [DshClickWin32]::EnumVisibleWindows()) {
      $pidValue = 0
      [void][DshClickWin32]::GetWindowThreadProcessId($candidate, [ref]$pidValue)
      if ([int]$pidValue -eq [int]$processId) { return $candidate }
    }
    $script:ErrorCode = 'WINDOW_NOT_FOUND'
    throw "no visible window owned by process $processId"
  }
  $foreground = [DshClickWin32]::GetForegroundWindow()
  if ($foreground -eq [IntPtr]::Zero) {
    $script:ErrorCode = 'WINDOW_NOT_FOUND'
    throw 'no foreground window and no target given'
  }
  return $foreground
}

# One target resolver for the observer ops. `tree`/`shot` always read
# `args.target`; `snapshot` historically read `args.windowId`. Both spellings
# now go through here, so `{"op":"snapshot","args":{"target":{"windowId":N}}}`
# addresses window N instead of silently falling back to the foreground window.
# `args.target` wins when both are present; the legacy top-level `windowId` is
# only a fallback, so old callers keep working.
function Resolve-OpTarget($opArgs) {
  $target = @{}
  if ($opArgs.target -ne $null) {
    $candidate = $opArgs.target
    if ($candidate.windowId -ne $null) { $target.windowId = $candidate.windowId }
    if ($candidate.windowTitle -ne $null) { $target.windowTitle = $candidate.windowTitle }
    if ($candidate.processId -ne $null) { $target.processId = $candidate.processId }
  }
  if ($target.windowId -eq $null -and $target.windowTitle -eq $null -and $target.processId -eq $null) {
    if ($opArgs.windowId -ne $null) { $target.windowId = $opArgs.windowId }
  }
  return $target
}

function Test-TargetPresent($target) {
  return ($target.windowId -ne $null) -or ($target.windowTitle -ne $null) -or ($target.processId -ne $null)
}

# ---------------------------------------------------------------------------
# Accessibility walk (canonical: the same walk builds treeHash everywhere).
# ---------------------------------------------------------------------------
$script:TreeNodes = @()

function Get-RuntimeIdString($element) {
  try {
    $ids = $element.GetRuntimeId()
    $parts = @()
    foreach ($id in $ids) { $parts += [string][int]$id }
    return ($parts -join '.')
  } catch {
    return ''
  }
}

function Get-ElementPatterns($element) {
  $patterns = @()
  $value = $null
  if ($element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$value)) { $patterns += 'value' }
  $invoke = $null
  if ($element.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$invoke)) { $patterns += 'invoke' }
  $scroll = $null
  if ($element.TryGetCurrentPattern([System.Windows.Automation.ScrollPattern]::Pattern, [ref]$scroll)) { $patterns += 'scroll' }
  return $patterns
}

function Get-ElementRecord($element) {
  $name = ''
  $controlType = ''
  $automationId = ''
  $enabled = $false
  $rect = @{ x = 0; y = 0; width = 0; height = 0 }
  try {
    $name = [string]$element.Current.Name
    $controlType = [string]$element.Current.ControlType.ProgrammaticName
    if ($controlType -like 'ControlType.*') { $controlType = $controlType.Substring(12) }
    $automationId = [string]$element.Current.AutomationId
    $enabled = [bool]$element.Current.IsEnabled
    $bounds = $element.Current.BoundingRectangle
    if (-not $bounds.IsEmpty) {
      $rect = @{ x = [int]$bounds.X; y = [int]$bounds.Y; width = [int]$bounds.Width; height = [int]$bounds.Height }
    }
  } catch { }
  return @{
    elementId = (Get-RuntimeIdString $element)
    controlType = $controlType
    name = $name
    automationId = $automationId
    rect = $rect
    enabled = $enabled
    patterns = @(Get-ElementPatterns $element)
  }
}

function Walk-UiaTree($element, $depth, $maxDepth, $maxElements, $includePixels) {
  if ($script:TreeNodes.Count -ge $maxElements -or $depth -gt $maxDepth -or $element -eq $null) { return }
  $record = Get-ElementRecord $element
  if ($record.elementId -ne '') {
    $script:TreeNodes += $record
  }
  if ($script:TreeNodes.Count -ge $maxElements) { return }
  $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
  try {
    $child = $walker.GetFirstChild($element)
    while ($child -ne $null -and $script:TreeNodes.Count -lt $maxElements -and $depth -lt $maxDepth) {
      Walk-UiaTree $child ($depth + 1) $maxDepth $maxElements $includePixels
      if ($script:TreeNodes.Count -ge $maxElements) { break }
      $child = $walker.GetNextSibling($child)
    }
  } catch { }
}

function Get-TreeHashText($nodes) {
  $material = @()
  foreach ($node in $nodes) {
    $r = $node.rect
    $material += "$($node.elementId)|$($node.controlType)|$($node.name)|$($r.x),$($r.y),$($r.width),$($r.height)"
  }
  return ($material -join ';')
}

# ---------------------------------------------------------------------------
# Screenshot.
# ---------------------------------------------------------------------------
# A window is captured in three steps, best first:
#   1. PrintWindow(hwnd, hdc, 2)  PW_RENDERFULLCONTENT - the window paints its
#      own content, so identity and pixels do not depend on occlusion/Z-order.
#   2. PrintWindow(hwnd, hdc, 0)  legacy windows that ignore the newer flag.
#   3. CopyFromScreen             last resort; correct only while unobscured.
# PrintWindow reports success for frames that carry no content at all (a blank
# Electron frame, or a Chromium window that paints only its title-bar buttons),
# so every candidate goes through Test-BitmapLooksBlank before it is accepted.
# Measured on Windows 11: PW(2) carries content for WinUI3/Electron/Chromium;
# PW(0/1) is blank or chrome-only for the latter two. The thresholds below are
# fitted to that matrix: a pure-color check alone is fooled by a gray frame with
# three title-bar buttons, so the color-count floor is 6 quantized colors.
$script:CaptureInset = 40       # px trimmed from each edge before sampling
$script:CaptureGrid = 16        # interior sample grid (16x16)
$script:CaptureDarkGrid = 32    # full-frame sample grid for the dark-ratio test

function Get-BitmapLuminance($color) {
  return (0.299 * [double]$color.R) + (0.587 * [double]$color.G) + (0.114 * [double]$color.B)
}

# True when a captured frame carries no usable content: a flat interior, an
# almost entirely black frame, or (on the no-flag PrintWindow path only) a few
# flat colors with chrome painted in a corner.
#
# The color-count rule is `strict` because a legitimate all-white page can also
# sample as 3 quantized colors: measured on a 2582x1550 Chrome new-tab window,
# PrintWindow(2) gives 3 colors but a luminance sd of 9.6, while the chrome-only
# frame the no-flag path paints on Chromium gives 4-5 colors with sd 13-14. The
# two are indistinguishable by color count alone, so the count rule is applied
# only where chrome-only frames are known to come from (PrintWindow flag 0).
# A blank all-black frame is caught on every path by the sd/dark-ratio rules.
function Test-BitmapLooksBlank($bitmap, $strict) {
  if ($null -eq $bitmap -or $bitmap.Width -le 0 -or $bitmap.Height -le 0) { return $true }
  $width = $bitmap.Width
  $height = $bitmap.Height

  # Interior region: drop the outer band (border, shadow, title-bar buttons)
  # where a failed PrintWindow can still paint a plausible-looking frame.
  $insetX = [Math]::Min($script:CaptureInset, [int][Math]::Floor(($width - 1) / 2))
  $insetY = [Math]::Min($script:CaptureInset, [int][Math]::Floor(($height - 1) / 2))
  $left = $insetX
  $top = $insetY
  $right = $width - 1 - $insetX
  $bottom = $height - 1 - $insetY
  if (($right - $left) -lt 8 -or ($bottom - $top) -lt 8) {
    # Tiny window: the inset leaves nothing to sample, so use the full frame.
    $left = 0; $top = 0; $right = $width - 1; $bottom = $height - 1
  }
  $spanX = [Math]::Max(1, $right - $left)
  $spanY = [Math]::Max(1, $bottom - $top)
  $stepX = [Math]::Max(1, [int][Math]::Ceiling($spanX / $script:CaptureGrid))
  $stepY = [Math]::Max(1, [int][Math]::Ceiling($spanY / $script:CaptureGrid))

  $colors = @{}
  $sum = 0.0
  $sumSquares = 0.0
  $count = 0
  for ($x = $left; $x -le $right; $x += $stepX) {
    for ($y = $top; $y -le $bottom; $y += $stepY) {
      $color = $bitmap.GetPixel($x, $y)
      # 5-bit quantization: UI colors cluster, and an exact ARGB count is both
      # noisy and slower than needed for a blank/non-blank verdict.
      $key = ([int]($color.R -band 0xF8) -shl 16) -bor ([int]($color.G -band 0xF8) -shl 8) -bor [int]($color.B -band 0xF8)
      $colors[$key] = $true
      $luminance = Get-BitmapLuminance $color
      $sum += $luminance
      $sumSquares += $luminance * $luminance
      $count += 1
    }
  }
  if ($count -eq 0) { return $true }
  $mean = $sum / $count
  $variance = [Math]::Max(0.0, ($sumSquares / $count) - ($mean * $mean))
  $deviation = [Math]::Sqrt($variance)
  # A frame that painted nothing is flat AND dark (mean 0 for a failed PrintWindow, whether
  # transparent or opaque black). A flat but bright frame is a real solid-colour UI - an
  # unfocused, empty window whose title bar matches the client area - so the variance alone
  # must not reject it: at 200% scaling those windows were falling back to CopyFromScreen and
  # capturing whatever covered them (#35). Dark/flat and the 99%-dark rule below still catch
  # the frames that really are empty.
  if ($deviation -lt 2 -and $mean -lt 8) { return $true }
  if ($strict -and $colors.Count -le 6) { return $true }

  # Full-frame dark ratio: a PrintWindow frame that painted nothing at all.
  $dark = 0
  $samples = 0
  $darkStepX = [Math]::Max(1, [int][Math]::Ceiling($width / $script:CaptureDarkGrid))
  $darkStepY = [Math]::Max(1, [int][Math]::Ceiling($height / $script:CaptureDarkGrid))
  for ($x = 0; $x -lt $width; $x += $darkStepX) {
    for ($y = 0; $y -lt $height; $y += $darkStepY) {
      if ((Get-BitmapLuminance $bitmap.GetPixel($x, $y)) -lt 8) { $dark += 1 }
      $samples += 1
    }
  }
  if ($samples -gt 0 -and (($dark * 100) -ge (99 * $samples))) { return $true }
  return $false
}

function New-CaptureBitmap($width, $height) {
  if ($width -le 0 -or $height -le 0) { throw "cannot allocate a ${width}x${height} capture bitmap" }
  return New-Object System.Drawing.Bitmap($width, $height)
}

# One PrintWindow attempt; returns $null when the API refuses, otherwise the
# bitmap (which may still be blank - the caller decides).
function Get-PrintWindowFrame($hwnd, $rectInfo, $flags) {
  $bitmap = New-CaptureBitmap $rectInfo.width $rectInfo.height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $hdc = [IntPtr]::Zero
  $painted = $false
  try {
    $hdc = $graphics.GetHdc()
    $painted = [DshClickWin32]::PrintWindow($hwnd, $hdc, [uint32]$flags)
  } catch {
    $painted = $false
  } finally {
    if ($hdc -ne [IntPtr]::Zero) {
      try { $graphics.ReleaseHdc($hdc) } catch { }
    }
    $graphics.Dispose()
  }
  if (-not $painted) {
    $bitmap.Dispose()
    return $null
  }
  return $bitmap
}

# Capture one window: returns @{ bitmap; method; rect }. The caller owns the
# bitmap and must dispose it. Minimized windows are refused up front: IsIconic
# windows report a placeholder rect, and PrintWindow paints only the small
# window-icon band even when it answers true, so there is no honest image.
function Get-WindowCapture($hwnd) {
  $rectInfo = Get-WindowRectInfo $hwnd
  if ($rectInfo.width -le 0 -or $rectInfo.height -le 0) {
    $script:ErrorCode = 'WINDOW_NOT_FOUND'
    throw "window $hwnd has no drawable rect"
  }
  if ([DshClickWin32]::IsIconic($hwnd)) {
    $script:ErrorCode = 'WINDOW_MINIMIZED'
    throw "window $hwnd is minimized; a minimized window has no capturable pixels - restore it, then re-observe"
  }

  $candidate = Get-PrintWindowFrame $hwnd $rectInfo 2   # PW_RENDERFULLCONTENT
  if ($candidate -ne $null) {
    if (-not (Test-BitmapLooksBlank $candidate $false)) {
      return @{ bitmap = $candidate; method = 'printwindow-fullcontent'; rect = $rectInfo }
    }
    $candidate.Dispose()
  }
  $candidate = Get-PrintWindowFrame $hwnd $rectInfo 0   # legacy PrintWindow
  if ($candidate -ne $null) {
    if (-not (Test-BitmapLooksBlank $candidate $true)) {
      return @{ bitmap = $candidate; method = 'printwindow'; rect = $rectInfo }
    }
    $candidate.Dispose()
  }

  # Screen-region copy: the old path, kept for windows that refuse PrintWindow.
  $bitmap = New-CaptureBitmap $rectInfo.width $rectInfo.height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.CopyFromScreen($rectInfo.x, $rectInfo.y, 0, 0, (New-Object System.Drawing.Size($rectInfo.width, $rectInfo.height)))
  } catch {
    $bitmap.Dispose()
    throw
  } finally {
    $graphics.Dispose()
  }
  return @{ bitmap = $bitmap; method = 'copyfromscreen'; rect = $rectInfo }
}

# Resolve the requested screen rectangle. `virtual` is the whole desktop
# (negative origins on multi-monitor setups) and stays experimental: only the
# single-monitor case is covered by the verification runs, and BitBlt across
# negative virtual-screen coordinates is untested here. If the virtual metrics
# are unusable, fall back to the primary screen rather than failing the call.
function Get-ScreenMetrics($scope) {
  if ($scope -eq 'virtual') {
    $virtualX = [int][DshClickWin32]::GetSystemMetrics(76)      # SM_XVIRTUALSCREEN
    $virtualY = [int][DshClickWin32]::GetSystemMetrics(77)      # SM_YVIRTUALSCREEN
    $virtualWidth = [int][DshClickWin32]::GetSystemMetrics(78)  # SM_CXVIRTUALSCREEN
    $virtualHeight = [int][DshClickWin32]::GetSystemMetrics(79) # SM_CYVIRTUALSCREEN
    if ($virtualWidth -gt 0 -and $virtualHeight -gt 0) {
      return @{ scope = 'virtual'; x = $virtualX; y = $virtualY; width = $virtualWidth; height = $virtualHeight }
    }
  }
  return @{
    scope = 'primary'; x = 0; y = 0
    width = [int][DshClickWin32]::GetSystemMetrics(0)   # SM_CXSCREEN
    height = [int][DshClickWin32]::GetSystemMetrics(1)  # SM_CYSCREEN
  }
}

# Capture a screen region: returns @{ bitmap; method; scope; rect }.
function Get-ScreenCapture($scope) {
  $metrics = Get-ScreenMetrics $scope
  if ($metrics.width -le 0 -or $metrics.height -le 0) { throw 'the screen reports no drawable area' }
  $bitmap = New-CaptureBitmap $metrics.width $metrics.height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.CopyFromScreen($metrics.x, $metrics.y, 0, 0, (New-Object System.Drawing.Size($metrics.width, $metrics.height)))
  } catch {
    $bitmap.Dispose()
    throw
  } finally {
    $graphics.Dispose()
  }
  return @{
    bitmap = $bitmap
    method = 'copyfromscreen'
    scope = $metrics.scope
    rect = @{ x = $metrics.x; y = $metrics.y; width = $metrics.width; height = $metrics.height }
  }
}

function Resize-BitmapIfNeeded($bitmap, $maxSide) {
  $longest = [Math]::Max($bitmap.Width, $bitmap.Height)
  if ($longest -le $maxSide) { return $bitmap }
  $scale = $maxSide / $longest
  $newWidth = [int][Math]::Max(1, [Math]::Round($bitmap.Width * $scale))
  $newHeight = [int][Math]::Max(1, [Math]::Round($bitmap.Height * $scale))
  $resized = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
  $graphics = [System.Drawing.Graphics]::FromImage($resized)
  try {
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($bitmap, 0, 0, $newWidth, $newHeight)
  } finally {
    $graphics.Dispose()
  }
  $bitmap.Dispose()
  return $resized
}

function Get-BitmapBase64($bitmap) {
  $stream = New-Object System.IO.MemoryStream
  try {
    $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
    return [Convert]::ToBase64String($stream.ToArray())
  } finally {
    $stream.Dispose()
  }
}

function Get-PixelColorText($bitmap, $x, $y) {
  if ($x -lt 0 -or $y -lt 0 -or $x -ge $bitmap.Width -or $y -ge $bitmap.Height) { return $null }
  $color = $bitmap.GetPixel($x, $y)
  return "rgb($($color.R), $($color.G), $($color.B))"
}

# ---------------------------------------------------------------------------
# Element lookup.
# ---------------------------------------------------------------------------
function Find-ElementByRuntimeId($windowElement, $runtimeIdText) {
  $ids = @()
  foreach ($part in ($runtimeIdText -split '\.')) { $ids += [int]$part }
  if ($ids.Count -eq 0) { return $null }
  $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::RuntimeIdProperty, [int[]]$ids)
  try {
    return $windowElement.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
  } catch {
    return $null
  }
}

function Get-ElementCenter($element) {
  $bounds = $element.Current.BoundingRectangle
  if ($bounds.IsEmpty) { throw 'element has no bounding rectangle' }
  return @{ x = [int]($bounds.X + $bounds.Width / 2); y = [int]($bounds.Y + $bounds.Height / 2) }
}

function Get-ClientPoint($hwnd, $windowRect, $screenX, $screenY) {
  # Exact client-area mapping via ScreenToClient (window rects include the
  # border and title bar, so plain subtraction lands ~8px/~31px off). The
  # mapping is non-regressive: if the interop call is unavailable, fall back to
  # the rectangle arithmetic and the old containment check.
  try {
    $point = New-Object DshClickWin32+POINT
    $point.X = [int]$screenX
    $point.Y = [int]$screenY
    $client = New-Object DshClickWin32+RECT
    if ([DshClickWin32]::ScreenToClient($hwnd, [ref]$point) -and [DshClickWin32]::GetClientRect($hwnd, [ref]$client)) {
      if ($point.X -lt 0 -or $point.Y -lt 0 -or $point.X -ge $client.Right -or $point.Y -ge $client.Bottom) {
        throw "point ($screenX, $screenY) lies outside the client area of window $hwnd"
      }
      return @{ x = $point.X; y = $point.Y }
    }
  } catch [System.Management.Automation.RuntimeException] {
    throw
  } catch { }
  $cx = $screenX - $windowRect.x
  $cy = $screenY - $windowRect.y
  if ($cx -lt 0 -or $cy -lt 0 -or $cx -ge $windowRect.width -or $cy -ge $windowRect.height) {
    throw "point ($screenX, $screenY) lies outside the target window"
  }
  return @{ x = $cx; y = $cy }
}

function Get-LParam($cx, $cy) {
  return [IntPtr](($cy -shl 16) -bor ($cx -band 0xFFFF))
}

function Post-Click($hwnd, $cx, $cy, $button) {
  $down = if ($button -eq 'right') { 0x204 } else { 0x201 }
  $up = if ($button -eq 'right') { 0x205 } else { 0x202 }
  $lparam = Get-LParam $cx $cy
  [void][DshClickWin32]::PostMessage($hwnd, $down, [IntPtr]1, $lparam)
  [void][DshClickWin32]::PostMessage($hwnd, $up, [IntPtr]0, $lparam)
}

function Get-VirtualKey([string]$token) {
  $names = @{
    'ENTER' = 0x0D; 'RETURN' = 0x0D; 'TAB' = 0x09; 'ESC' = 0x1B; 'ESCAPE' = 0x1B;
    'SPACE' = 0x20; 'BACKSPACE' = 0x08; 'DELETE' = 0x2E; 'DEL' = 0x2E; 'INSERT' = 0x2D;
    'HOME' = 0x24; 'END' = 0x23; 'PAGEUP' = 0x21; 'PGUP' = 0x21; 'PAGEDOWN' = 0x22; 'PGDN' = 0x22;
    'UP' = 0x26; 'DOWN' = 0x28; 'LEFT' = 0x25; 'RIGHT' = 0x27;
    'CTRL' = 0x11; 'CONTROL' = 0x11; 'SHIFT' = 0x10; 'ALT' = 0x12; 'MENU' = 0x12;
    'WIN' = 0x5B; 'WINDOWS' = 0x5B; 'LWIN' = 0x5B; 'RWIN' = 0x5C; 'APPS' = 0x5D;
    'CAPSLOCK' = 0x14; 'NUMLOCK' = 0x90; 'SCROLLLOCK' = 0x91; 'PRINTSCREEN' = 0x2C;
    'PAUSE' = 0x13; 'COMMA' = 0xBC; 'PERIOD' = 0xBE; 'SLASH' = 0xBF; 'SEMICOLON' = 0xBA;
    'QUOTE' = 0xDE; 'LBRACKET' = 0xDB; 'RBRACKET' = 0xDD; 'BACKSLASH' = 0xDC;
    'MINUS' = 0xBD; 'PLUS' = 0xBB; 'TILDE' = 0xC0
  }
  if ($names.ContainsKey($token)) { return [int]$names[$token] }
  if ($token -match '^F([1-9]|1[0-2])$') { return 0x6F + [int]$Matches[1] }
  if ($token.Length -eq 1) {
    $scan = [DshClickWin32]::VkKeyScanW([char]$token)
    if ($scan -ne -1) { return [int]($scan -band 0xFF) }
    return [int][char]$token
  }
  throw "unknown key '$token'"
}

function Post-KeyCombo($hwnd, $keysText) {
  $tokens = @()
  foreach ($token in ($keysText -split '\+')) {
    $trimmed = $token.Trim()
    if ($trimmed.Length -eq 0) { continue }
    $tokens += $trimmed.ToUpperInvariant()
  }
  if ($tokens.Count -eq 0) { throw 'empty key combination' }
  $modifierNames = @('CTRL', 'CONTROL', 'SHIFT', 'ALT', 'MENU', 'WIN', 'WINDOWS', 'LWIN', 'RWIN')
  $modifiers = @()
  $mainKeys = @()
  foreach ($token in $tokens) {
    if ($modifierNames -contains $token) { $modifiers += $token } else { $mainKeys += $token }
  }
  $focused = $false
  try { $focused = [DshClickWin32]::BringToFront($hwnd) } catch { $focused = $false }
  if (-not $focused) {
    # Last resort: posted messages (only works for windows that accept posted input).
    foreach ($modifier in $modifiers) {
      [void][DshClickWin32]::PostMessage($hwnd, 0x100, [IntPtr](Get-VirtualKey $modifier), [IntPtr]0)
    }
    foreach ($key in $mainKeys) {
      $vk = Get-VirtualKey $key
      [void][DshClickWin32]::PostMessage($hwnd, 0x100, [IntPtr]$vk, [IntPtr]0)
      [void][DshClickWin32]::PostMessage($hwnd, 0x101, [IntPtr]$vk, [IntPtr]0)
    }
    for ($i = $modifiers.Count - 1; $i -ge 0; $i--) {
      [void][DshClickWin32]::PostMessage($hwnd, 0x101, [IntPtr](Get-VirtualKey $modifiers[$i]), [IntPtr]0)
    }
    return
  }
  foreach ($modifier in $modifiers) { [void][DshClickWin32]::SendVirtualKey([uint16](Get-VirtualKey $modifier), $false) }
  foreach ($key in $mainKeys) {
    $vk = [uint16](Get-VirtualKey $key)
    [void][DshClickWin32]::SendVirtualKey($vk, $false)
    [void][DshClickWin32]::SendVirtualKey($vk, $true)
  }
  for ($i = $modifiers.Count - 1; $i -ge 0; $i--) {
    [void][DshClickWin32]::SendVirtualKey([uint16](Get-VirtualKey $modifiers[$i]), $true)
  }
}

# ---------------------------------------------------------------------------
# Operations.
# ---------------------------------------------------------------------------
function Invoke-OpWindows {
  $windows = @()
  foreach ($hwnd in [DshClickWin32]::EnumVisibleWindows()) {
    $pidValue = 0
    [void][DshClickWin32]::GetWindowThreadProcessId($hwnd, [ref]$pidValue)
    # A minimized window still enumerates, but GetWindowRect then returns the
    # CW_USEDEFAULT placeholder (-32000,-32000 314x50). Report the state and
    # suppress the placeholder rect instead of handing it to coordinate math.
    $minimized = [DshClickWin32]::IsIconic($hwnd)
    $windows += @{
      windowId = [int64]$hwnd
      processId = if ([int]$pidValue -gt 0) { [int]$pidValue } else { $null }
      title = [DshClickWin32]::WindowTitle($hwnd)
      className = [DshClickWin32]::WindowClass($hwnd)
      rect = if ($minimized) { $null } else { Get-WindowRectInfo $hwnd }
      minimized = $minimized
      executablePath = $null
      visible = $true
    }
  }
  # Attach executable paths per window (one handle open per unique pid).
  $pidCache = @{}
  foreach ($window in $windows) {
    if ($window.processId -eq $null) { continue }
    if (-not $pidCache.ContainsKey($window.processId)) {
      $facts = Get-ProcessFacts ([IntPtr][int64]$window.windowId)
      $pidCache[$window.processId] = $facts.executablePath
    }
    $window.executablePath = $pidCache[$window.processId]
  }
  return $windows
}

function Invoke-OpApps {
  $byPid = @{}
  foreach ($hwnd in [DshClickWin32]::EnumVisibleWindows()) {
    $pidValue = 0
    [void][DshClickWin32]::GetWindowThreadProcessId($hwnd, [ref]$pidValue)
    $pidInt = [int]$pidValue
    if ($pidInt -le 0) { continue }
    if (-not $byPid.ContainsKey($pidInt)) { $byPid[$pidInt] = @() }
    $minimized = [DshClickWin32]::IsIconic($hwnd)
    $byPid[$pidInt] += @{
      windowId = [int64]$hwnd
      processId = $pidInt
      title = [DshClickWin32]::WindowTitle($hwnd)
      className = [DshClickWin32]::WindowClass($hwnd)
      rect = if ($minimized) { $null } else { Get-WindowRectInfo $hwnd }
      minimized = $minimized
      executablePath = $null
      visible = $true
    }
  }
  $apps = @()
  foreach ($pidInt in ($byPid.Keys | Sort-Object)) {
    $windows = $byPid[$pidInt]
    $facts = Get-ProcessFacts ([IntPtr][int64]$windows[0].windowId)
    $name = ''
    try {
      $process = Get-Process -Id $pidInt -ErrorAction Stop
      $name = [string]$process.ProcessName
    } catch { }
    foreach ($window in $windows) { $window.executablePath = $facts.executablePath }
    $apps += @{
      processId = $pidInt
      name = $name
      executablePath = $facts.executablePath
      windows = $windows
    }
  }
  return $apps
}

function Get-SnapshotRecord($hwnd, $maxElements, $maxDepth, $capture) {
  $ownsCapture = $false
  if ($null -eq $capture) {
    $capture = Get-WindowCapture $hwnd
    $ownsCapture = $true
  }
  try {
    $facts = Get-ProcessFacts $hwnd
    $rect = Get-WindowRectInfo $hwnd
    $foreground = ([DshClickWin32]::GetForegroundWindow() -eq $hwnd)
    $script:TreeNodes = @()
    $element = Get-UiaElement $hwnd
    Walk-UiaTree $element 0 $maxDepth $maxElements $false
    $treeHash = Get-StringHash (Get-TreeHashText $script:TreeNodes)
    # The hash is taken from the same frame the caller will ship as the
    # screenshot (or compare later), not from a second capture: two captures
    # can disagree on a busy window and on which capture path succeeded.
    $shotHash = Get-BitmapHash $capture.bitmap
    return @{
      windowId = [int64]$hwnd
      processId = $facts.pid
      executablePath = $facts.executablePath
      title = [DshClickWin32]::WindowTitle($hwnd)
      className = [DshClickWin32]::WindowClass($hwnd)
      rect = $rect
      foreground = $foreground
      treeHash = $treeHash
      shotHash = $shotHash
      elementCount = $script:TreeNodes.Count
    }
  } finally {
    if ($ownsCapture) { $capture.bitmap.Dispose() }
  }
}

function Invoke-OpSnapshot($opArgs) {
  $target = Resolve-OpTarget $opArgs
  if (-not (Test-TargetPresent $target)) {
    # This used to fall back to the foreground window without saying so, which
    # reported a different window than the caller asked for. Refuse instead.
    $script:ErrorCode = 'NO_TARGET'
    throw 'snapshot requires windowId or target; it never guesses the foreground window'
  }
  $hwnd = Resolve-Window $target
  $maxElements = if ($opArgs.maxElements -ne $null) { [int]$opArgs.maxElements } else { 500 }
  $maxDepth = if ($opArgs.maxDepth -ne $null) { [int]$opArgs.maxDepth } else { 32 }
  $capture = Get-WindowCapture $hwnd
  try {
    return (Get-SnapshotRecord $hwnd $maxElements $maxDepth $capture)
  } finally {
    $capture.bitmap.Dispose()
  }
}

function Invoke-OpShot($opArgs) {
  $target = Resolve-OpTarget $opArgs
  $scope = if ($opArgs.scope -ne $null) { [string]$opArgs.scope } else { 'primary' }
  if ($scope -ne 'primary' -and $scope -ne 'virtual') {
    $script:ErrorCode = 'INVALID_SCOPE'
    throw "unknown scope '$scope' (expected 'primary' or 'virtual')"
  }
  $maxSide = if ($opArgs.maxSide -ne $null) { [int]$opArgs.maxSide } else { 2560 }
  $maxElements = if ($opArgs.maxElements -ne $null) { [int]$opArgs.maxElements } else { 500 }
  $maxDepth = if ($opArgs.maxDepth -ne $null) { [int]$opArgs.maxDepth } else { 32 }
  $capture = $null
  $bitmap = $null
  try {
    if (Test-TargetPresent $target) {
      $hwnd = Resolve-Window $target
      $capture = Get-WindowCapture $hwnd
      $captureScope = 'window'
      $snapshot = Get-SnapshotRecord $hwnd $maxElements $maxDepth $capture
    } else {
      # No target means the screen, not the foreground window: the result says
      # `scope: primary` and its snapshot is titled "primary screen" (windowId 0).
      $capture = Get-ScreenCapture $scope
      $captureScope = $capture.scope
      $snapshot = @{
        windowId = 0; processId = 0; executablePath = $null
        title = if ($capture.scope -eq 'virtual') { 'virtual screen' } else { 'primary screen' }
        className = 'Screen'
        rect = $capture.rect
        foreground = $true; treeHash = ''; shotHash = ''; elementCount = 0
      }
    }
    $bitmap = $capture.bitmap
    if ([Math]::Max($bitmap.Width, $bitmap.Height) -gt $maxSide) {
      # Resize-BitmapIfNeeded disposes the original; the finally below disposes
      # whichever bitmap is current, and Dispose is idempotent.
      $bitmap = Resize-BitmapIfNeeded $capture.bitmap $maxSide
    }
    $base64 = Get-BitmapBase64 $bitmap
    return @{
      pngBase64 = $base64
      width = $bitmap.Width
      height = $bitmap.Height
      captureMethod = $capture.method
      scope = $captureScope
      snapshot = $snapshot
    }
  } finally {
    if ($null -ne $bitmap) { $bitmap.Dispose() }
    elseif ($null -ne $capture) { $capture.bitmap.Dispose() }
  }
}

function Invoke-OpTree($opArgs) {
  $target = Resolve-OpTarget $opArgs
  $maxElements = if ($opArgs.maxElements -ne $null) { [int]$opArgs.maxElements } else { 500 }
  $maxDepth = if ($opArgs.maxDepth -ne $null) { [int]$opArgs.maxDepth } else { 32 }
  $includePixels = if ($opArgs.includePixels -ne $null) { [bool]$opArgs.includePixels } else { $true }
  # An empty target still means the foreground window here (documented for
  # screen_read); only `snapshot` refuses the guess.
  $hwnd = Resolve-Window $target
  $capture = Get-WindowCapture $hwnd
  try {
    $snapshot = Get-SnapshotRecord $hwnd $maxElements $maxDepth $capture
    $script:TreeNodes = @()
    $element = Get-UiaElement $hwnd
    Walk-UiaTree $element 0 $maxDepth $maxElements $includePixels
    $pixels = @()
    if ($includePixels) {
      $rectInfo = $capture.rect
      $count = 0
      foreach ($node in $script:TreeNodes) {
        if ($count -ge 200) { break }
        $r = $node.rect
        if ($r.width -le 0 -or $r.height -le 0) { continue }
        $cx = $r.x + [int]($r.width / 2) - $rectInfo.x
        $cy = $r.y + [int]($r.height / 2) - $rectInfo.y
        $color = Get-PixelColorText $capture.bitmap $cx $cy
        if ($color -ne $null) {
          $label = if ($node.name -ne '') { $node.name } else { "$($node.controlType)[$($node.elementId)]" }
          $pixels += @{ label = $label; x = $r.x + [int]($r.width / 2); y = $r.y + [int]($r.height / 2); color = $color }
          $count += 1
        }
      }
    }
    return @{
      snapshot = $snapshot
      elements = @($script:TreeNodes)
      pixels = $pixels
    }
  } finally {
    $capture.bitmap.Dispose()
  }
}

function Get-ActionOutcome($hwnd, $action, $delivered, $restored, $detail) {
  $before = Get-ProcessFacts $hwnd
  $after = Get-ProcessFacts $hwnd
  $outcome = @{
    windowId = [int64]$hwnd
    action = $action
    delivered = $delivered
    processBefore = $before
    processAfter = $after
  }
  if ($restored -ne $null) { $outcome.restored = [bool]$restored }
  # The focus-fallback verdict rides every action outcome: a refused
  # SetForegroundWindow must be visible to the model, not silently discarded.
  $merged = @()
  if ($detail -ne $null) { $merged += [string]$detail }
  if ($script:focusFallbackDetail -ne $null) { $merged += [string]$script:focusFallbackDetail }
  if ($merged.Count -gt 0) { $outcome.detail = ($merged -join '; ') }
  return $outcome
}

# The sanctioned focus escape hatch: attempt to bring the window forward and
# record the verdict for the outcome. Never throws - the action itself has
# already been delivered or is about to be.
function Set-DshFocusFallback($hwnd) {
  try {
    if (-not [DshClickWin32]::SetForegroundWindow($hwnd)) {
      $script:focusFallbackDetail = 'focusFallback requested but the OS refused SetForegroundWindow; the action was delivered without foreground focus'
    }
  } catch {
    $script:focusFallbackDetail = "focusFallback requested but SetForegroundWindow threw: $($_.Exception.Message)"
  }
}

function Invoke-OpClick($opArgs) {
  $request = $opArgs.request
  $focusFallback = if ($opArgs.focusFallback -ne $null) { [bool]$opArgs.focusFallback } else { $false }
  $hwnd = Resolve-Window @{ windowId = $request.windowId }
  if ($focusFallback) { Set-DshFocusFallback $hwnd }
  $windowRect = Get-WindowRectInfo $hwnd
  $delivered = 'posted'
  $windowElement = Get-UiaElement $hwnd
  if ($request.elementId -ne $null -and $request.elementId -is [string] -and $request.elementId.Length -gt 0) {
    $element = Find-ElementByRuntimeId $windowElement ([string]$request.elementId)
    if ($element -eq $null) { throw "element '$($request.elementId)' not found in window $hwnd (re-run screen_read)" }
    $invoke = $null
    if ($element.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$invoke)) {
      $invoke.Invoke()
      $delivered = 'uia'
    } else {
      $center = Get-ElementCenter $element
      $client = Get-ClientPoint $hwnd $windowRect $center.x $center.y
      Post-Click $hwnd $client.x $client.y ([string]$request.button)
      $delivered = 'posted'
    }
  } else {
    if ($request.x -eq $null -or $request.y -eq $null) { throw 'click requires elementId or (x, y)' }
    $client = Get-ClientPoint $hwnd $windowRect ([int]$request.x) ([int]$request.y)
    Post-Click $hwnd $client.x $client.y ([string]$request.button)
    $delivered = 'posted'
  }
  return (Get-ActionOutcome $hwnd 'click' $delivered $null $null)
}

function Invoke-OpType($opArgs) {
  $request = $opArgs.request
  $focusFallback = if ($opArgs.focusFallback -ne $null) { [bool]$opArgs.focusFallback } else { $false }
  $rollback = if ($request.rollback -ne $null) { [bool]$request.rollback } else { $true }
  $hwnd = Resolve-Window @{ windowId = $request.windowId }
  if ($focusFallback) { Set-DshFocusFallback $hwnd }
  $windowElement = Get-UiaElement $hwnd
  $element = Find-ElementByRuntimeId $windowElement ([string]$request.elementId)
  if ($element -eq $null) { throw "element '$($request.elementId)' not found in window $hwnd (re-run screen_read)" }
  $value = $null
  if ($element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$value)) {
    $original = [string]$value.Current.Value
    try {
      $value.SetValue([string]$request.text)
      return (Get-ActionOutcome $hwnd 'type' 'uia' $false $null)
    } catch {
      $restored = $false
      if ($rollback) {
        try {
          $value.SetValue($original)
          $restored = $true
        } catch { }
      }
      throw "type failed and rollback $(if ($restored) { 'restored the original text' } else { 'could NOT restore the original text' }): $($_.Exception.Message)"
    }
  }
  # dsh-click input patch: real keyboard input (SendInput) instead of posted WM_CHAR.
  $center = Get-ElementCenter $element
  $windowRect = Get-WindowRectInfo $hwnd
  $client = Get-ClientPoint $hwnd $windowRect $center.x $center.y
  Post-Click $hwnd $client.x $client.y 'left'
  $focused = $false
  try { $focused = [DshClickWin32]::BringToFront($hwnd) } catch { $focused = $false }
  if ($focused) {
    $sent = [DshClickWin32]::SendUnicodeText([string]$request.text)
    if ($sent -gt 0) {
      return (Get-ActionOutcome $hwnd 'type' 'posted' $null "typed $($sent / 2) chars via SendInput")
    }
  }
  if (-not $focusFallback) {
    throw "element '$($request.elementId)' exposes no value pattern and the window could not be focused - refusing to type into it"
  }
  foreach ($ch in [char[]][string]$request.text) {
    [void][DshClickWin32]::PostMessage($hwnd, 0x102, [IntPtr][int]$ch, [IntPtr]0)
  }
  return (Get-ActionOutcome $hwnd 'type' 'posted' $null 'typed via posted WM_CHAR (SendInput unavailable)')
}

function Invoke-OpScroll($opArgs) {
  $request = $opArgs.request
  $focusFallback = if ($opArgs.focusFallback -ne $null) { [bool]$opArgs.focusFallback } else { $false }
  $amount = if ($request.amount -ne $null) { [int]$request.amount } else { 3 }
  if ($amount -lt 1) { throw 'scroll amount must be positive' }
  $hwnd = Resolve-Window @{ windowId = $request.windowId }
  $windowElement = Get-UiaElement $hwnd
  $scroll = $null
  $element = $null
  if ($request.elementId -ne $null -and $request.elementId -is [string] -and $request.elementId.Length -gt 0) {
    $element = Find-ElementByRuntimeId $windowElement ([string]$request.elementId)
    if ($element -eq $null) { throw "element '$($request.elementId)' not found in window $hwnd (re-run screen_read)" }
    if (-not $element.TryGetCurrentPattern([System.Windows.Automation.ScrollPattern]::Pattern, [ref]$scroll)) {
      $scroll = $null
    }
  }
  if ($scroll -ne $null) {
    if ($focusFallback) { Set-DshFocusFallback $hwnd }
    $vertical = [System.Windows.Automation.ScrollAmount]::NoAmount
    switch ([string]$request.direction) {
      'up' { $vertical = [System.Windows.Automation.ScrollAmount]::SmallIncrement }
      'down' { $vertical = [System.Windows.Automation.ScrollAmount]::SmallDecrement }
      'page-up' { $vertical = [System.Windows.Automation.ScrollAmount]::LargeIncrement }
      'page-down' { $vertical = [System.Windows.Automation.ScrollAmount]::LargeDecrement }
      default { throw "unknown scroll direction '$($request.direction)'" }
    }
    for ($i = 0; $i -lt $amount; $i++) {
      $scroll.Scroll([System.Windows.Automation.ScrollAmount]::NoAmount, $vertical)
    }
    return (Get-ActionOutcome $hwnd 'scroll' 'uia' $null $null)
  }
  if ($focusFallback) { Set-DshFocusFallback $hwnd }
  $direction = [string]$request.direction
  $page = ($direction -eq 'page-up' -or $direction -eq 'page-down')
  $sign = if ($direction -eq 'up' -or $direction -eq 'page-up') { 1 } else { -1 }
  $notches = if ($page) { 3 } else { 1 }
  $delta = [int]($sign * $notches * $amount * 120)
  $wparam = [IntPtr][int64]($delta * 65536)
  $rect = Get-WindowRectInfo $hwnd
  $client = Get-ClientPoint $hwnd $rect ([int]($rect.x + $rect.width / 2)) ([int]($rect.y + $rect.height / 2))
  [void][DshClickWin32]::PostMessage($hwnd, 0x20A, $wparam, (Get-LParam $client.x $client.y))
  return (Get-ActionOutcome $hwnd 'scroll' 'posted' $null 'posted wheel message to the window')
}

function Invoke-OpKey($opArgs) {
  $request = $opArgs.request
  $focusFallback = if ($opArgs.focusFallback -ne $null) { [bool]$opArgs.focusFallback } else { $false }
  $hwnd = Resolve-Window @{ windowId = $request.windowId }
  if ($focusFallback) { Set-DshFocusFallback $hwnd }
  Post-KeyCombo $hwnd ([string]$request.keys)
  return (Get-ActionOutcome $hwnd 'key' 'posted' $null $null)
}

function Invoke-OpLaunch($opArgs) {
  $name = [string]$opArgs.name
  $launchArgs = @()
  if ($opArgs.args -ne $null) {
    foreach ($item in @($opArgs.args)) { $launchArgs += [string]$item }
  }
  $target = $name
  if ($name -notmatch '[\\/]' -and $name -notmatch '\.exe$') {
    $command = Get-Command $name -ErrorAction SilentlyContinue
    if ($command -ne $null) { $target = $command.Source } else { throw "cannot resolve application '$name' on the search path" }
  }
  # An empty -ArgumentList binds to nothing useful and can fail the launch
  # outright, so the parameter is omitted when there are no arguments.
  if ($launchArgs.Count -gt 0) {
    $process = Start-Process -FilePath $target -ArgumentList $launchArgs -PassThru
  } else {
    $process = Start-Process -FilePath $target -PassThru
  }
  $path = $null
  try {
    $path = $process.Path
  } catch {
    $path = $null
  }
  return @{ processId = [int]$process.Id; executablePath = $path }
}

# ---------------------------------------------------------------------------
# Metrics: DPU/DPI diagnostics without touching a window.
# ---------------------------------------------------------------------------
function Invoke-OpMetrics {
  # 0 = unaware (legacy bug), 1 = system-aware, 2 = per-monitor.
  return @{
    awareness = [int]$script:DpiAwareness
    screen = @{
      width = [int][DshClickWin32]::GetSystemMetrics(0)   # SM_CXSCREEN
      height = [int][DshClickWin32]::GetSystemMetrics(1)  # SM_CYSCREEN
    }
    virtualScreen = @{
      x = [int][DshClickWin32]::GetSystemMetrics(76)      # SM_XVIRTUALSCREEN
      y = [int][DshClickWin32]::GetSystemMetrics(77)      # SM_YVIRTUALSCREEN
      width = [int][DshClickWin32]::GetSystemMetrics(78)  # SM_CXVIRTUALSCREEN
      height = [int][DshClickWin32]::GetSystemMetrics(79) # SM_CYVIRTUALSCREEN
    }
    monitors = [int][DshClickWin32]::GetSystemMetrics(80) # SM_CMONITORS
  }
}

# ---------------------------------------------------------------------------
# Entry point.
# ---------------------------------------------------------------------------
try {
  $raw = [Console]::In.ReadToEnd()
  $request = $raw | ConvertFrom-Json
  $opArgs = if ($request.args -ne $null) { $request.args } else { @{} }
  $result = $null
  # Per-request focus-fallback verdict (set by Set-DshFocusFallback, consumed by
  # Get-ActionOutcome); one helper process serves exactly one request.
  $script:focusFallbackDetail = $null
  # Per-request failure code; a plain `throw` still defaults to HELPER_ERROR,
  # while the capture/scope guards set a precise code for the caller.
  $script:ErrorCode = $null
  switch ([string]$request.op) {
    'windows' { $result = Invoke-OpWindows }
    'metrics' { $result = Invoke-OpMetrics }
    'apps' { $result = Invoke-OpApps }
    'snapshot' { $result = Invoke-OpSnapshot $opArgs }
    'shot' { $result = Invoke-OpShot $opArgs }
    'tree' { $result = Invoke-OpTree $opArgs }
    'click' { $result = Invoke-OpClick $opArgs }
    'type' { $result = Invoke-OpType $opArgs }
    'scroll' { $result = Invoke-OpScroll $opArgs }
    'key' { $result = Invoke-OpKey $opArgs }
    'launch' { $result = Invoke-OpLaunch $opArgs }
    default { throw "unknown op '$($request.op)'" }
  }
  Write-DshResponse @{ ok = $true; result = $result }
  exit 0
} catch {
  $message = $_.Exception.Message
  if ($message -eq $null -or $message.Length -eq 0) { $message = 'unknown helper failure' }
  $code = if ($script:ErrorCode -ne $null -and [string]$script:ErrorCode -ne '') { [string]$script:ErrorCode } else { 'HELPER_ERROR' }
  Write-DshError $code $message
  exit 0
}
