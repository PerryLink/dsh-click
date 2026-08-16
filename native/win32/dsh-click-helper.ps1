# dsh-click native helper (Windows PowerShell 5.1).
#
# One request = one process: JSON request on stdin, JSON response on stdout
# (exit code 0 even for handled failures; the error envelope is the response).
# The harness drives this through ctx.subprocess; nothing here ever writes to
# any other stream, and nothing here steals foreground focus unless the
# `focusFallback` flag is explicitly true (config-gated, approval-gated).
#
# Operations: windows, apps, shot, tree, snapshot, click, type, scroll, key, launch.
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

  [DllImport("user32.dll")]
  public static extern int GetSystemMetrics(int index);

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
    if ($rect.width -le 0 -and $rect.height -le 0) {
      # A handle that no longer resolves to a window.
      throw "window $($target.windowId) not found"
    }
    return $hwnd
  }
  $title = $target.windowTitle
  if ($title -ne $null -and $title -is [string] -and $title.Length -gt 0) {
    foreach ($candidate in [DshClickWin32]::EnumVisibleWindows()) {
      if ([DshClickWin32]::WindowTitle($candidate) -like "*$title*") { return $candidate }
    }
    throw "no visible window matches title '$title'"
  }
  $processId = $target.processId
  if ($processId -ne $null -and $processId -is [int] -and $processId -gt 0) {
    foreach ($candidate in [DshClickWin32]::EnumVisibleWindows()) {
      $pidValue = 0
      [void][DshClickWin32]::GetWindowThreadProcessId($candidate, [ref]$pidValue)
      if ([int]$pidValue -eq [int]$processId) { return $candidate }
    }
    throw "no visible window owned by process $processId"
  }
  $foreground = [DshClickWin32]::GetForegroundWindow()
  if ($foreground -eq [IntPtr]::Zero) { throw 'no foreground window and no target given' }
  return $foreground
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
function Get-WindowBitmap($hwnd) {
  $rectInfo = Get-WindowRectInfo $hwnd
  if ($rectInfo.width -le 0 -or $rectInfo.height -le 0) { throw "window $hwnd has no drawable rect" }
  $bitmap = New-Object System.Drawing.Bitmap($rectInfo.width, $rectInfo.height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.CopyFromScreen($rectInfo.x, $rectInfo.y, 0, 0, (New-Object System.Drawing.Size($rectInfo.width, $rectInfo.height)))
  } finally {
    $graphics.Dispose()
  }
  return $bitmap
}

function Get-PrimaryBitmap() {
  $width = [DshClickWin32]::GetSystemMetrics(0)   # SM_CXSCREEN
  $height = [DshClickWin32]::GetSystemMetrics(1)  # SM_CYSCREEN
  $bitmap = New-Object System.Drawing.Bitmap($width, $height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.CopyFromScreen(0, 0, 0, 0, (New-Object System.Drawing.Size($width, $height)))
  } finally {
    $graphics.Dispose()
  }
  return $bitmap
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
  $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::RuntimeIdProperty, $ids)
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

function Get-ClientPoint($windowRect, $screenX, $screenY) {
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

function Get-KeyMap() {
  $map = @{}
  $map['ENTER'] = @(0x0D, $true)
  $map['RETURN'] = @(0x0D, $true)
  $map['TAB'] = @(0x09, $true)
  $map['ESC'] = @(0x1B, $true)
  $map['ESCAPE'] = @(0x1B, $true)
  $map['BACKSPACE'] = @(0x08, $true)
  $map['DELETE'] = @(0x2E, $true)
  $map['DEL'] = @(0x2E, $true)
  $map['SPACE'] = @(0x20, $true)
  $map['INSERT'] = @(0x2D, $true)
  $map['HOME'] = @(0x24, $true)
  $map['END'] = @(0x23, $true)
  $map['PAGEUP'] = @(0x21, $true)
  $map['PGUP'] = @(0x21, $true)
  $map['PAGEDOWN'] = @(0x22, $true)
  $map['PGDN'] = @(0x22, $true)
  $map['UP'] = @(0x26, $true)
  $map['DOWN'] = @(0x28, $true)
  $map['LEFT'] = @(0x25, $true)
  $map['RIGHT'] = @(0x27, $true)
  $map['CTRL'] = @(0x11, $false)
  $map['CONTROL'] = @(0x11, $false)
  $map['SHIFT'] = @(0x10, $false)
  $map['ALT'] = @(0x12, $false)
  $map['MENU'] = @(0x12, $false)
  $map['WIN'] = @(0x5B, $false)
  $map['WINDOWS'] = @(0x5B, $false)
  foreach ($n in 1..12) { $map["F$n"] = @(0x6F + $n, $true) }
  foreach ($c in 0..9) { $map["$c"] = @(0x30 + $c, $true) }
  foreach ($c in 'A'..'Z') {
    $code = [int][char]$c
    $map[$c] = @(0x41 + ($code - 65), $true)
  }
  return $map
}

function Post-KeyCombo($hwnd, $keysText) {
  $map = Get-KeyMap
  $tokens = @()
  foreach ($token in ($keysText -split '\+')) {
    $trimmed = $token.Trim()
    if ($trimmed.Length -eq 0) { continue }
    $tokens += $trimmed.ToUpperInvariant()
  }
  if ($tokens.Count -eq 0) { throw 'empty key combination' }
  $modifiers = @()
  $mainKeys = @()
  foreach ($token in $tokens) {
    if ($token -in @('CTRL', 'CONTROL', 'SHIFT', 'ALT', 'MENU', 'WIN', 'WINDOWS')) {
      $modifiers += $token
    } elseif ($map.ContainsKey($token)) {
      $mainKeys += $token
    } elseif ($token.Length -eq 1) {
      $mainKeys += $token
    } else {
      throw "unknown key '$token'"
    }
  }
  foreach ($modifier in $modifiers) {
    $entry = $map[$modifier]
    [void][DshClickWin32]::PostMessage($hwnd, 0x100, [IntPtr]$entry[0], [IntPtr]0)
  }
  foreach ($key in $mainKeys) {
    $isSpecial = $map.ContainsKey($key)
    if ($isSpecial) {
      $entry = $map[$key]
      [void][DshClickWin32]::PostMessage($hwnd, 0x100, [IntPtr]$entry[0], [IntPtr]0)
      [void][DshClickWin32]::PostMessage($hwnd, 0x101, [IntPtr]$entry[0], [IntPtr]0)
    } else {
      $charCode = [int][char]$key
      [void][DshClickWin32]::PostMessage($hwnd, 0x100, [IntPtr]$charCode, [IntPtr]0)
      [void][DshClickWin32]::PostMessage($hwnd, 0x102, [IntPtr]$charCode, [IntPtr]0)
      [void][DshClickWin32]::PostMessage($hwnd, 0x101, [IntPtr]$charCode, [IntPtr]0)
    }
  }
  for ($i = $modifiers.Count - 1; $i -ge 0; $i--) {
    $entry = $map[$modifiers[$i]]
    [void][DshClickWin32]::PostMessage($hwnd, 0x101, [IntPtr]$entry[0], [IntPtr]0)
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
    $windows += @{
      windowId = [int64]$hwnd
      processId = if ([int]$pidValue -gt 0) { [int]$pidValue } else { $null }
      title = [DshClickWin32]::WindowTitle($hwnd)
      className = [DshClickWin32]::WindowClass($hwnd)
      rect = (Get-WindowRectInfo $hwnd)
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
    $byPid[$pidInt] += @{
      windowId = [int64]$hwnd
      processId = $pidInt
      title = [DshClickWin32]::WindowTitle($hwnd)
      className = [DshClickWin32]::WindowClass($hwnd)
      rect = (Get-WindowRectInfo $hwnd)
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

function Get-SnapshotRecord($hwnd, $maxElements, $maxDepth) {
  $facts = Get-ProcessFacts $hwnd
  $rect = Get-WindowRectInfo $hwnd
  $foreground = ([DshClickWin32]::GetForegroundWindow() -eq $hwnd)
  $script:TreeNodes = @()
  $element = Get-UiaElement $hwnd
  Walk-UiaTree $element 0 $maxDepth $maxElements $false
  $treeHash = Get-StringHash (Get-TreeHashText $script:TreeNodes)
  $bitmap = Get-WindowBitmap $hwnd
  $shotHash = $null
  try {
    $shotHash = Get-BitmapHash $bitmap
  } finally {
    $bitmap.Dispose()
  }
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
}

function Invoke-OpSnapshot($opArgs) {
  $hwnd = Resolve-Window @{ windowId = $opArgs.windowId }
  $maxElements = if ($opArgs.maxElements -ne $null) { [int]$opArgs.maxElements } else { 500 }
  $maxDepth = if ($opArgs.maxDepth -ne $null) { [int]$opArgs.maxDepth } else { 32 }
  return (Get-SnapshotRecord $hwnd $maxElements $maxDepth)
}

function Invoke-OpShot($opArgs) {
  $target = if ($opArgs.target -ne $null) { $opArgs.target } else { @{} }
  $maxSide = if ($opArgs.maxSide -ne $null) { [int]$opArgs.maxSide } else { 2560 }
  $maxElements = if ($opArgs.maxElements -ne $null) { [int]$opArgs.maxElements } else { 500 }
  $maxDepth = if ($opArgs.maxDepth -ne $null) { [int]$opArgs.maxDepth } else { 32 }
  $hasTarget = ($target.windowId -ne $null) -or ($target.windowTitle -ne $null) -or ($target.processId -ne $null)
  if ($hasTarget) {
    $hwnd = Resolve-Window $target
    $bitmap = Get-WindowBitmap $hwnd
    $snapshot = Get-SnapshotRecord $hwnd $maxElements $maxDepth
  } else {
    $hwnd = $null
    $bitmap = Get-PrimaryBitmap
    $snapshot = @{
      windowId = 0; processId = 0; executablePath = $null
      title = 'primary screen'; className = 'Screen'
      rect = @{ x = 0; y = 0; width = $bitmap.Width; height = $bitmap.Height }
      foreground = $true; treeHash = ''; shotHash = ''; elementCount = 0
    }
  }
  try {
    $bitmap = Resize-BitmapIfNeeded $bitmap $maxSide
    $base64 = Get-BitmapBase64 $bitmap
    return @{
      pngBase64 = $base64
      width = $bitmap.Width
      height = $bitmap.Height
      snapshot = $snapshot
    }
  } finally {
    $bitmap.Dispose()
  }
}

function Invoke-OpTree($opArgs) {
  $target = if ($opArgs.target -ne $null) { $opArgs.target } else { @{} }
  $maxElements = if ($opArgs.maxElements -ne $null) { [int]$opArgs.maxElements } else { 500 }
  $maxDepth = if ($opArgs.maxDepth -ne $null) { [int]$opArgs.maxDepth } else { 32 }
  $includePixels = if ($opArgs.includePixels -ne $null) { [bool]$opArgs.includePixels } else { $true }
  $hwnd = Resolve-Window $target
  $snapshot = Get-SnapshotRecord $hwnd $maxElements $maxDepth
  $script:TreeNodes = @()
  $element = Get-UiaElement $hwnd
  Walk-UiaTree $element 0 $maxDepth $maxElements $includePixels
  $pixels = @()
  if ($includePixels) {
    $bitmap = Get-WindowBitmap $hwnd
    try {
      $rectInfo = Get-WindowRectInfo $hwnd
      $count = 0
      foreach ($node in $script:TreeNodes) {
        if ($count -ge 200) { break }
        $r = $node.rect
        if ($r.width -le 0 -or $r.height -le 0) { continue }
        $cx = $r.x + [int]($r.width / 2) - $rectInfo.x
        $cy = $r.y + [int]($r.height / 2) - $rectInfo.y
        $color = Get-PixelColorText $bitmap $cx $cy
        if ($color -ne $null) {
          $label = if ($node.name -ne '') { $node.name } else { "$($node.controlType)[$($node.elementId)]" }
          $pixels += @{ label = $label; x = $r.x + [int]($r.width / 2); y = $r.y + [int]($r.height / 2); color = $color }
          $count += 1
        }
      }
    } finally {
      $bitmap.Dispose()
    }
  }
  return @{
    snapshot = $snapshot
    elements = @($script:TreeNodes)
    pixels = $pixels
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
  if ($detail -ne $null) { $outcome.detail = [string]$detail }
  return $outcome
}

function Invoke-OpClick($opArgs) {
  $request = $opArgs.request
  $focusFallback = if ($opArgs.focusFallback -ne $null) { [bool]$opArgs.focusFallback } else { $false }
  $hwnd = Resolve-Window @{ windowId = $request.windowId }
  if ($focusFallback) { [void][DshClickWin32]::SetForegroundWindow($hwnd) }
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
      $client = Get-ClientPoint $windowRect $center.x $center.y
      Post-Click $hwnd $client.x $client.y ([string]$request.button)
      $delivered = 'posted'
    }
  } else {
    if ($request.x -eq $null -or $request.y -eq $null) { throw 'click requires elementId or (x, y)' }
    $client = Get-ClientPoint $windowRect ([int]$request.x) ([int]$request.y)
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
  if ($focusFallback) { [void][DshClickWin32]::SetForegroundWindow($hwnd) }
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
  if ($focusFallback) {
    foreach ($ch in [char[]][string]$request.text) {
      $charCode = [int]$ch
      [void][DshClickWin32]::PostMessage($hwnd, 0x102, [IntPtr]$charCode, [IntPtr]0)
    }
    return (Get-ActionOutcome $hwnd 'type' 'posted' $null 'typed via posted WM_CHAR (no value pattern on the element)')
  }
  throw "element '$($request.elementId)' exposes no value pattern and focusFallback is disabled - refusing to type into it"
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
    if ($focusFallback) { [void][DshClickWin32]::SetForegroundWindow($hwnd) }
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
  if ($focusFallback) { [void][DshClickWin32]::SetForegroundWindow($hwnd) }
  $direction = [string]$request.direction
  $page = ($direction -eq 'page-up' -or $direction -eq 'page-down')
  $sign = if ($direction -eq 'up' -or $direction -eq 'page-up') { 1 } else { -1 }
  $notches = if ($page) { 3 } else { 1 }
  $delta = [int]($sign * $notches * $amount * 120)
  $wparam = [IntPtr][int64]($delta * 65536)
  $rect = Get-WindowRectInfo $hwnd
  $client = Get-ClientPoint $rect ([int]($rect.x + $rect.width / 2)) ([int]($rect.y + $rect.height / 2))
  [void][DshClickWin32]::PostMessage($hwnd, 0x20A, $wparam, (Get-LParam $client.x $client.y))
  return (Get-ActionOutcome $hwnd 'scroll' 'posted' $null 'posted wheel message to the window')
}

function Invoke-OpKey($opArgs) {
  $request = $opArgs.request
  $focusFallback = if ($opArgs.focusFallback -ne $null) { [bool]$opArgs.focusFallback } else { $false }
  $hwnd = Resolve-Window @{ windowId = $request.windowId }
  if ($focusFallback) { [void][DshClickWin32]::SetForegroundWindow($hwnd) }
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
  $process = Start-Process -FilePath $target -ArgumentList $launchArgs -PassThru
  $path = $null
  try {
    $path = $process.Path
  } catch {
    $path = $null
  }
  return @{ processId = [int]$process.Id; executablePath = $path }
}

# ---------------------------------------------------------------------------
# Entry point.
# ---------------------------------------------------------------------------
try {
  $raw = [Console]::In.ReadToEnd()
  $request = $raw | ConvertFrom-Json
  $opArgs = if ($request.args -ne $null) { $request.args } else { @{} }
  $result = $null
  switch ([string]$request.op) {
    'windows' { $result = Invoke-OpWindows }
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
  Write-DshError 'HELPER_ERROR' $message
  exit 0
}
