#!/usr/bin/env python3
"""Generate README visuals for dsh-click (docs/assets/).

Outputs (idempotent overwrite):
  dsh-click-hero-{zh,en}-{light,dark}.webp   1440x576 raster hero (Pillow)
  dsh-click-flow-v5-{light,dark}.svg         1100x660 hand-written SVG

Design notes
------------
The repository is a desktop-control plugin, not a checker or a data pipeline.
Its real shape is two surfaces separated by one safety boundary:

  observe (read-only, never asks approval)
    screen_read / screen_shot / screen_find -> WindowSnapshot
    observationId = sha256(windowId, pid, exe, title, class, rect,
                           treeHash, shotHash)[:32]  ->  LRU (maxCachedObservations)
  act (mutating, approval by default)
    click / type / scroll / key cite basedOn { observationId, windowId }
    and cross the boundary in src/actions.ts: resolve the citation,
    re-snapshot + verify freshness (EXPIRED / STALE_IDENTITY / STALE_TREE /
    STALE_PIXELS), gate through ctx.approval or autoApproveWindows, dispatch
    through the PowerShell UIA helper (uia / posted), then compare pid + exe
    around the act (PROCESS_CHANGED). app_launch is gate-only (no observation).
  audit (log-only)
    dsh-click/observed + dsh-click/action, sanitized and truncated.

* Hero: left column is prose (kicker / title / two value lines / subtitle /
  meta / footer). The right side is the repository's own semantic graphic: a
  desktop window with the accessibility element ids screen_read returns
  (e12 Edit value, e13 Button invoke) plus a pixel hint, wired to a single
  citation receipt that carries the observationId, its hashes and the four
  gates every mutating action crosses. No invented feature, no fake data.
* Flow: grammar = boundary two-sided. A tall SAFETY BOUNDARY wall sits between
  the read-only observe plane (left) and the mutating act plane (right); the
  observation is cited across the gap, the wall lists the five checkpoints,
  refusals loop back to screen_read, and the helper / target-window cards
  carry the dispatch exit and the process-fact return. Text is token-only
  (tool names, config keys, error codes), so all five READMEs share one pair.

Run once:  python scripts/gen-readme-assets.py
Requires:  Python 3.10+ with Pillow; Windows fonts msyh.ttc / msyhbd.ttc /
           consola.ttf / segoeui.ttf / segoeuib.ttf.
"""
from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "assets")

FONT_CJK = r"C:\Windows\Fonts\msyh.ttc"
FONT_CJK_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"
FONT_MONO = r"C:\Windows\Fonts\consola.ttf"
FONT_EN = r"C:\Windows\Fonts\segoeui.ttf"
FONT_EN_BOLD = r"C:\Windows\Fonts\segoeuib.ttf"

for _p in (FONT_CJK, FONT_CJK_BOLD, FONT_MONO, FONT_EN, FONT_EN_BOLD):
    if not os.path.exists(_p):
        raise SystemExit(f"FATAL: font missing: {_p}")

WARNINGS: list[str] = []

SKIN = {
    "light": dict(
        bg_from="#f9f6fd", bg_to="#e4eaf8", card="#ffffff", card_edge="#e4e1ee",
        zone="#f5f2fb", zone_edge="#e3def1", text="#141419", sub="#4d5261",
        faint="#8f94a4", accent="#4B67B4", warn="#b0470f", good="#16a34a",
        pill="#ece7f9", track="#eae6f3", grid="#e7e4f0", shadow=(32, 26, 64),
        app="#fcfbff", app_edge="#efeaf8", skel="#e9e5f3", ghost="#f0ecfa",
        btn_text="#ffffff",
    ),
    "dark": dict(
        bg_from="#131a2a", bg_to="#0c1016", card="#1b2231", card_edge="#2e374b",
        zone="#171e2d", zone_edge="#2b3448", text="#f0f3f9", sub="#a8b1c4",
        faint="#737b8d", accent="#8496f5", warn="#d9a03c", good="#3fb950",
        pill="#242d42", track="#243049", grid="#1e2636", shadow=(0, 0, 0),
        app="#111827", app_edge="#26304a", skel="#253049", ghost="#1c2434",
        btn_text="#10141f",
    ),
}

# ---------------------------------------------------------------- primitives


def font(size, kind="cjk"):
    return ImageFont.truetype(
        {"cjk": FONT_CJK, "cjk_bold": FONT_CJK_BOLD, "mono": FONT_MONO,
         "en": FONT_EN, "en_bold": FONT_EN_BOLD}[kind], max(8, int(size)))


def hx(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def gradient(w, h, c1, c2):
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = 0.22 * (y / h) + 0.78 * (y / h) ** 1.5
        d.line([(0, y), (w, y)],
               fill=tuple(int(p + (q - p) * t) for p, q in zip(hx(c1), hx(c2))))
    return img


def glow(img, cx, cy, r, color, alpha=40):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(10, 0, -1):
        rr = r * i / 10
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr],
                  fill=color + (int(alpha * (1 - i / 11)),))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def soft_shadow(img, box, skin, radius=22, strength=26, spread=3):
    x0, y0, x1, y1 = box
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    for i in range(strength, 0, -spread):
        sd.rounded_rectangle([x0 - i // 6, y0 + i // 2, x1 + i // 6, y1 + i],
                             radius=radius + i // 6,
                             fill=skin["shadow"] + (int(8 * (1 - i / strength)),))
    return Image.alpha_composite(
        img.convert("RGBA"), sh.filter(ImageFilter.GaussianBlur(13))).convert("RGB")


def panel(img, box, skin, radius=22, fill="card", edge="card_edge", shadow=True):
    if shadow:
        img = soft_shadow(img, box, skin, radius)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(box, radius=radius, fill=hx(skin[fill]),
                        outline=hx(skin[edge]), width=2)
    return img


def fit_width(d, text, kind, max_w, size, min_size=11):
    size = int(size)
    while size > min_size and d.textlength(text, font=font(size, kind)) > max_w:
        size -= 1
    return size


def put(img, xy, text, skin, size, kind="cjk", color="text", anchor="la",
        max_w=None, min_size=10, tag=""):
    d = ImageDraw.Draw(img)
    if max_w is not None:
        size = fit_width(d, text, kind, max_w, size, min_size)
        if d.textlength(text, font=font(size, kind)) > max_w:
            WARNINGS.append(f"{tag}: {text!r} exceeds {max_w}px at {size}px")
            print(f"WARN {tag}: {text!r} exceeds {max_w}px at {size}px")
    d.text(xy, text, font=font(size, kind), fill=hx(skin[color]), anchor=anchor)
    return size


def text_pill(img, xy, text, skin, size=12, kind="mono", fg="accent",
              bg="pill", pad_x=12, pad_y=6, tag=""):
    d = ImageDraw.Draw(img)
    f = font(size, kind)
    tw = d.textlength(text, font=f)
    x, y = xy
    box = [x, y, x + tw + pad_x * 2, y + size + pad_y * 2 + 3]
    d.rounded_rectangle(box, radius=(box[3] - box[1]) // 2, fill=hx(skin[bg]))
    d.text((x + pad_x, y + pad_y + 1), text, font=f, fill=hx(skin[fg]))
    return box


def check_mark(img, cx, cy, color, s=5, w=2):
    d = ImageDraw.Draw(img)
    d.line([(cx - s, cy), (cx - s * 0.15, cy + s * 0.8)], fill=color, width=w)
    d.line([(cx - s * 0.15, cy + s * 0.8), (cx + s * 1.15, cy - s * 0.85)],
           fill=color, width=w)


def corner_brackets(img, box, color, length=16, w=2, gap=0):
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = box
    x0 -= gap
    y0 -= gap
    x1 += gap
    y1 += gap
    for (x, y, dx, dy) in ((x0, y0, 1, 1), (x1, y0, -1, 1),
                           (x0, y1, 1, -1), (x1, y1, -1, -1)):
        d.line([(x, y), (x + dx * length, y)], fill=color, width=w)
        d.line([(x, y), (x, y + dy * length)], fill=color, width=w)


def arrow_right(img, x0, x1, y, color, w=2, head=7):
    d = ImageDraw.Draw(img)
    d.line([(x0, y), (x1 - head + 1, y)], fill=color, width=w)
    d.line([(x1 - head, y - head * 0.8), (x1, y)], fill=color, width=w)
    d.line([(x1 - head, y + head * 0.8), (x1, y)], fill=color, width=w)


# --------------------------------------------------------------- hero model

HERO = {
    "zh": dict(
        kicker="DeepSeek Harness · 桌面控制插件",
        value=["看见屏幕，也让它动手。", "每次变更都先过安全边界。"],
        sub="UIA 读屏 + 像素提示，动作前复核新鲜度",
        meta="Windows 优先 · 默认审批 · 不抢前台 · 审计脱敏",
        foot="Apache-2.0 · v0.3.27 · PerryLink DSH plugin family",
        win_title="记事本 — 笔记.txt",
        btn="保存",
        field_label="e12 · Edit · value",
        button_label="e13 · Button · invoke",
        status_left="UIA tree · patterns value/invoke · pixel hints",
        status_right="screen_read",
        obs_label="OBSERVE · READ-ONLY",
        obs_title="observationId",
        obs_rows=[("treeHash", "8c1e4a"), ("shotHash", "42af77"),
                  ("window", "1122867"), ("age", "3.2s ≤ 30s")],
        based_on="basedOn · click",
        act_label="ACT · MUTATING",
        act_title="click · e13",
        gates=["basedOn · cited", "freshness · hashes ok",
               "approval · allowed-once", "pid 4242 unchanged"],
        act_foot="dsh-click/action · log-only",
        hint="pixel hint · (700, 296)",
    ),
    "en": dict(
        kicker="DeepSeek Harness · desktop control",
        value=["See the screen, then act.", "Every mutation crosses a gate."],
        sub="UIA tree + pixel hints, checked before acting",
        meta="Windows-first · approval on · never steals focus",
        foot="Apache-2.0 · v0.3.27 · PerryLink DSH plugin family",
        win_title="Notepad — notes.txt",
        btn="Save",
        field_label="e12 · Edit · value",
        button_label="e13 · Button · invoke",
        status_left="UIA tree · patterns value/invoke · pixel hints",
        status_right="screen_read",
        obs_label="OBSERVE · READ-ONLY",
        obs_title="observationId",
        obs_rows=[("treeHash", "8c1e4a"), ("shotHash", "42af77"),
                  ("window", "1122867"), ("age", "3.2s ≤ 30s")],
        based_on="basedOn · click",
        act_label="ACT · MUTATING",
        act_title="click · e13",
        gates=["basedOn · cited", "freshness · hashes ok",
               "approval · allowed-once", "pid 4242 unchanged"],
        act_foot="dsh-click/action · log-only",
        hint="pixel hint · (700, 296)",
    ),
}

OBSERVATION_ID = "3f9a7e04…c21d"


def hero(lang, skin_name):
    s = SKIN[skin_name]
    m = HERO[lang]
    w, h = 1440, 576
    img = gradient(w, h, s["bg_from"], s["bg_to"])
    img = glow(img, 1180, 80, 420, hx(s["accent"]),
               24 if skin_name == "light" else 42)
    img = glow(img, 120, 570, 280, hx(s["accent"]),
               10 if skin_name == "light" else 16)

    # ------------------------------------------------------------ left prose
    mm = 60
    text_pill(img, (mm, 52), m["kicker"], s, size=19,
              kind="cjk_bold" if lang == "zh" else "en_bold", tag="kicker")
    d = ImageDraw.Draw(img)
    tsize = fit_width(d, "dsh-click", "mono", 545, 84, 64)
    d.text((mm, 114), "dsh-click", font=font(tsize, "mono"), fill=hx(s["text"]))

    # accent rule beside the two value lines
    d.rounded_rectangle([mm - 2, 230, mm + 1, 312], radius=2,
                        fill=hx(s["accent"]))
    vkind = "cjk_bold" if lang == "zh" else "en_bold"
    vsize = 33 if lang == "zh" else 31
    vmax = 512
    for line in m["value"]:
        vsize = min(vsize, fit_width(d, line, vkind, vmax, vsize, 22))
    for i, line in enumerate(m["value"]):
        put(img, (mm + 20, 228 + i * (vsize + 13)), line, s, vsize, vkind,
            "text", max_w=vmax, min_size=22, tag=f"value{i}")

    put(img, (mm + 2, 344), m["sub"], s, 25,
        "cjk" if lang == "zh" else "en", "sub", max_w=540, min_size=21,
        tag="sub")
    put(img, (mm + 2, 400), m["meta"], s, 20,
        "cjk" if lang == "zh" else "en", "faint", max_w=540, min_size=17,
        tag="meta")

    d = ImageDraw.Draw(img)
    d.line([mm + 2, 464, mm + 540, 464], fill=hx(s["grid"]), width=2)
    put(img, (mm + 2, 482), m["foot"], s, 17, "en", "faint",
        max_w=540, min_size=14, tag="foot")

    # ---------------------------------------------------- screen card (ghost)
    ghost = (656, 32, 1092, 486)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(ghost, radius=22, fill=hx(s["ghost"]),
                        outline=hx(s["zone_edge"]), width=2)

    screen = (640, 48, 1080, 500)
    img = panel(img, screen, s, radius=22)
    d = ImageDraw.Draw(img)

    # title bar: rounded top, flat bottom
    d.rounded_rectangle([640, 48, 1080, 122], radius=22, fill=hx(s["zone"]))
    d.rectangle([640, 84, 1080, 96], fill=hx(s["zone"]))
    d.line([640, 96, 1080, 96], fill=hx(s["grid"]), width=2)

    # app glyph
    d.rounded_rectangle([662, 64, 682, 84], radius=4, fill=hx(s["pill"]))
    d.rectangle([667, 69, 677, 75], outline=hx(s["accent"]), width=1)
    d.line([667, 79, 677, 79], fill=hx(s["accent"]), width=1)
    put(img, (694, 65), m["win_title"], s, 16,
        "cjk_bold" if lang == "zh" else "en_bold", "text", max_w=250,
        min_size=12, tag="win_title")
    text_pill(img, (976, 64), "HWND 1122867", s, size=11, kind="mono")

    # window body
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([660, 110, 1060, 440], radius=16,
                        fill=hx(s["app"]), outline=hx(s["app_edge"]), width=1)

    # accessibility element: edit field
    field = (680, 160, 1040, 208)
    d.rounded_rectangle([field[0], field[1] + 4, field[2], field[3]],
                        radius=10, fill=hx(s["zone"]))
    d.rectangle([field[0], field[1], field[2], field[3]], outline=None)
    d.rounded_rectangle(field, radius=10, fill=hx(s["zone"]),
                        outline=hx(s["accent"]), width=2)
    corner_brackets(img, field, hx(s["accent"]), length=13, w=2, gap=4)
    put(img, (684, 172), "hello", s, 26, "mono", "text")
    d = ImageDraw.Draw(img)
    caret_x = 684 + d.textlength("hello", font=font(26, "mono")) + 3
    d.line([caret_x, 174, caret_x, 200], fill=hx(s["accent"]), width=3)

    # label above the field
    text_pill(img, (678, 128), m["field_label"], s, size=11, kind="mono",
              pad_y=4)

    # document skeleton (shape only, no invented copy)
    d = ImageDraw.Draw(img)
    for (x0, y, x1) in ((680, 232, 990), (680, 254, 950)):
        d.rounded_rectangle([x0, y, x1, y + 8], radius=4, fill=hx(s["skel"]))

    # pixel hint
    d = ImageDraw.Draw(img)
    d.line([686, 296, 714, 296], fill=hx(s["warn"]), width=1)
    d.line([700, 282, 700, 310], fill=hx(s["warn"]), width=1)
    d.ellipse([695, 291, 705, 301], outline=hx(s["warn"]), width=2)
    d.ellipse([698, 294, 702, 298], fill=hx(s["warn"]))
    put(img, (722, 287), m["hint"], s, 11, "mono", "faint", max_w=170,
        min_size=9, tag="pixel_hint")

    # accessibility element: save button
    button = (900, 330, 1040, 378)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(button, radius=10, fill=hx(s["accent"]))
    d.text((970, 352), m["btn"], font=font(20, "cjk_bold"), fill=hx(s["btn_text"]),
           anchor="mm")
    corner_brackets(img, button, hx(s["accent"]), length=12, w=2, gap=4)
    put(img, (1040, 312), m["button_label"], s, 11, "mono", "accent",
        anchor="ra", max_w=190, min_size=9, tag="button_label")

    # pointer over the button (the click target)
    d = ImageDraw.Draw(img)
    pointer = [(1006, 380), (1006, 418), (1017, 408), (1026, 428),
               (1037, 422), (1027, 403), (1042, 401)]
    d.polygon(pointer, fill=hx(s["text"]), outline=hx(s["card"]), width=2)

    # status bar
    d = ImageDraw.Draw(img)
    d.line([660, 440, 1060, 440], fill=hx(s["grid"]), width=2)
    put(img, (660, 456), m["status_left"], s, 11, "mono", "faint",
        max_w=290, min_size=9, tag="status_left")
    put(img, (1060, 456), m["status_right"], s, 11, "mono", "accent",
        anchor="ra", max_w=110, min_size=9, tag="status_right")

    # ------------------------------------------------- citation receipt card
    receipt = (1112, 48, 1380, 500)
    img = panel(img, receipt, s, radius=22)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([1112 + 2, 76, 1112 + 6, 472], radius=2,
                        fill=hx(s["accent"]))
    put(img, (1132, 72), m["obs_label"], s, 11, "mono", "accent",
        max_w=220, min_size=9, tag="obs_label")
    put(img, (1132, 92), m["obs_title"], s, 18, "mono", "text",
        max_w=220, min_size=14, tag="obs_title")

    d = ImageDraw.Draw(img)
    d.rounded_rectangle([1132, 120, 1360, 158], radius=10, fill=hx(s["zone"]),
                        outline=hx(s["zone_edge"]), width=1)
    put(img, (1144, 128), OBSERVATION_ID, s, 15, "mono", "accent",
        max_w=204, min_size=11, tag="obs_id")

    for i, (label, value) in enumerate(m["obs_rows"]):
        y = 176 + i * 22
        put(img, (1132, y), label, s, 12, "mono", "faint", max_w=120,
            min_size=9, tag=f"obs_label{i}")
        put(img, (1360, y), value, s, 12, "mono", "sub", anchor="ra",
            max_w=150, min_size=9, tag=f"obs_value{i}")

    d = ImageDraw.Draw(img)
    d.line([1132, 262, 1360, 262], fill=hx(s["grid"]), width=2)

    d = ImageDraw.Draw(img)
    chip_w = d.textlength(m["based_on"], font=font(12, "mono")) + 28
    chip_box = text_pill(img, (1246 - chip_w / 2, 274), m["based_on"], s,
                         size=12, kind="mono", pad_x=14, pad_y=6)

    put(img, (1132, 326), m["act_label"], s, 11, "mono", "accent",
        max_w=220, min_size=9, tag="act_label")
    put(img, (1132, 346), m["act_title"], s, 18, "mono", "text",
        max_w=220, min_size=14, tag="act_title")

    for i, gate in enumerate(m["gates"]):
        y = 382 + i * 24
        d = ImageDraw.Draw(img)
        d.ellipse([1134, y - 5, 1146, y + 7], fill=hx(s["good"]))
        check_mark(img, 1140, y + 1, hx(s["card"]), s=3, w=2)
        put(img, (1158, y - 5), gate, s, 12.5, "mono", "sub", max_w=200,
            min_size=10, tag=f"gate{i}")

    put(img, (1132, 478), m["act_foot"], s, 10.5, "mono", "faint",
        max_w=210, min_size=8, tag="act_foot")

    # observation wire: screen -> receipt
    arrow_right(img, 1084, 1108, 166, hx(s["accent"]), w=2, head=6)

    img.save(os.path.join(OUT, f"dsh-click-hero-{lang}-{skin_name}.webp"),
             "WEBP", quality=92)
    print(f"wrote dsh-click-hero-{lang}-{skin_name}.webp")


# ------------------------------------------------------------- flow diagram
FLOW = {
    "light": dict(
        bg_from="#f9f6fd", bg_to="#e4eaf8", card="#ffffff", edge="#e4e1ee",
        zone="#f5f2fb", zone_edge="#e3def1", text="#141419", sub="#4d5261",
        faint="#8f94a4", accent="#4B67B4", warn="#b0470f", good="#16a34a",
        pill="#ece7f9", grid="#e7e4f0", dot="#d9d3ea", glow="#4B67B4",
    ),
    "dark": dict(
        bg_from="#131a2a", bg_to="#0c1016", card="#1b2231", edge="#2e374b",
        zone="#171e2d", zone_edge="#2b3448", text="#f0f3f9", sub="#a8b1c4",
        faint="#737b8d", accent="#8496f5", warn="#d9a03c", good="#3fb950",
        pill="#242d42", grid="#1e2636", dot="#26314a", glow="#8496f5",
    ),
}

MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
SANS = ("ui-sans-serif, system-ui, -apple-system, 'Segoe UI', "
        "'Microsoft YaHei', sans-serif")


def flow_svg(skin_name):
    s = FLOW[skin_name]
    p: list[str] = []
    shadow_op = "0.10" if skin_name == "light" else "0.55"
    shadow_col = "#1b1735" if skin_name == "light" else "#000000"

    # ---------------------------------------------------------------- header
    p.append(f'''<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="660" viewBox="0 0 1100 660" role="img" aria-label="dsh-click: a read-only observe plane on the left, a mutating act plane on the right, and a safety boundary wall between them that resolves the basedOn citation, checks freshness, gates approval, dispatches through the PowerShell UIA helper, and verifies process identity before and after">
<title>dsh-click: one safety boundary between observe and act</title>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
    <stop offset="0" stop-color="{s['bg_from']}"/>
    <stop offset="1" stop-color="{s['bg_to']}"/>
  </linearGradient>
  <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="{s['glow']}" stop-opacity=".16"/>
    <stop offset="1" stop-color="{s['glow']}" stop-opacity="0"/>
  </radialGradient>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="180%">
    <feDropShadow dx="0" dy="8" stdDeviation="11" flood-color="{shadow_col}" flood-opacity="{shadow_op}"/>
  </filter>
  <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
    <circle cx="1.4" cy="1.4" r="1.4" fill="{s['dot']}"/>
  </pattern>
</defs>
<rect width="1100" height="660" fill="url(#bg)"/>
<rect width="1100" height="660" fill="url(#dots)" opacity=".42"/>
<circle cx="550" cy="360" r="330" fill="url(#halo)"/>
<text x="44" y="58" fill="{s['text']}" font-family="{MONO}" font-size="33" font-weight="700">dsh-click</text>
<text x="44" y="86" fill="{s['sub']}" font-family="{SANS}" font-size="15">read-only observe plane · one safety boundary · mutating act plane</text>
<rect x="700" y="38" width="356" height="36" rx="18" fill="{s['pill']}"/>
<text x="878" y="61" fill="{s['accent']}" font-family="{MONO}" font-size="14" text-anchor="middle">Windows · UIAutomation · focus never</text>
<line x1="40" y1="104" x2="1060" y2="104" stroke="{s['grid']}" stroke-width="1.5"/>''')

    # ------------------------------------------------------- observe plane
    p.append(f'''<text x="44" y="136" fill="{s['accent']}" font-family="{MONO}" font-size="16" font-weight="700" letter-spacing="1.6">OBSERVE</text>
<text x="44" y="158" fill="{s['sub']}" font-family="{SANS}" font-size="14">read-only · never asks approval</text>
<g filter="url(#soft)"><rect x="40" y="178" width="350" height="224" rx="18" fill="{s['card']}" stroke="{s['edge']}" stroke-width="1.5"/></g>
<text x="60" y="202" fill="{s['faint']}" font-family="{MONO}" font-size="14" letter-spacing="1.2">READ-ONLY TOOLS</text>
<line x1="60" y1="212" x2="370" y2="212" stroke="{s['grid']}" stroke-width="1.2"/>''')

    obs_rows = [
        ("screen_read", "a11y tree · elementId · pixels"),
        ("screen_shot", "PNG · or text description"),
        ("screen_find", "OCR / grounding → (x, y)"),
        ("app_list", "windows · no observationId"),
    ]
    for i, (name, desc) in enumerate(obs_rows):
        y = 238 + i * 44
        p.append(f'<circle cx="66" cy="{y - 5}" r="2.8" fill="{s["accent"]}" opacity=".6"/>')
        p.append(f'<text x="78" y="{y}" fill="{s["text"]}" font-family="{MONO}" font-size="17.5" font-weight="700">{name}</text>')
        p.append(f'<text x="78" y="{y + 18}" fill="{s["sub"]}" font-family="{MONO}" font-size="14">{desc}</text>')

    # observation envelope
    p.append(f'''<line x1="215" y1="402" x2="215" y2="412" stroke="{s['accent']}" stroke-width="2" opacity=".8"/>
<path d="M209 414 L215 421 L221 414" fill="none" stroke="{s['accent']}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>
<text x="228" y="416" fill="{s['faint']}" font-family="{MONO}" font-size="14">record → LRU</text>
<g filter="url(#soft)"><rect x="40" y="422" width="350" height="118" rx="18" fill="{s['card']}" stroke="{s['edge']}" stroke-width="1.5"/></g>
<text x="60" y="446" fill="{s['accent']}" font-family="{MONO}" font-size="14" font-weight="700" letter-spacing="1.2">OBSERVATION</text>
<text x="370" y="446" fill="{s['faint']}" font-family="{SANS}" font-size="14" text-anchor="end">→ model</text>
<text x="60" y="474" fill="{s['text']}" font-family="{MONO}" font-size="18" font-weight="700">{OBSERVATION_ID}</text>
<line x1="60" y1="486" x2="370" y2="486" stroke="{s['grid']}" stroke-width="1.2"/>
<text x="60" y="506" fill="{s['sub']}" font-family="{MONO}" font-size="14">treeHash 8c1e · shotHash 42af</text>
<text x="60" y="526" fill="{s['faint']}" font-family="{MONO}" font-size="14">maxObservationAgeMs 30000 · LRU 8</text>''')

    # ------------------------------------------------ safety boundary wall
    p.append(f'''<g filter="url(#soft)"><rect x="420" y="120" width="280" height="480" rx="22" fill="{s['zone']}" stroke="{s['zone_edge']}" stroke-width="1.5"/></g>
<line x1="432" y1="150" x2="432" y2="592" stroke="{s['accent']}" stroke-width="1" stroke-dasharray="2 8" opacity=".28"/>
<line x1="688" y1="150" x2="688" y2="592" stroke="{s['accent']}" stroke-width="1" stroke-dasharray="2 8" opacity=".28"/>
<rect x="444" y="126" width="232" height="3" rx="1.5" fill="{s['accent']}" opacity=".55"/>
<text x="452" y="154" fill="{s['accent']}" font-family="{MONO}" font-size="17" font-weight="700" letter-spacing="1.1">SAFETY BOUNDARY</text>
<text x="452" y="176" fill="{s['sub']}" font-family="{SANS}" font-size="14">fail-closed · one path</text>
<line x1="444" y1="190" x2="676" y2="190" stroke="{s['grid']}" stroke-width="1.2"/>''')

    gates = [
        ("basedOn", "resolve cited obs", "UNKNOWN_OBSERVATION"),
        ("freshness", "age · identity · tree", "EXPIRED · STALE_*"),
        ("approval", "ctx.approval · allowlist", "APPROVAL_DENIED"),
        ("dispatch", "helper · UIA / posted", "helper: uia | posted"),
        ("identity", "pid / exe before/after", "PROCESS_CHANGED"),
    ]
    centers = [206, 290, 374, 458, 542]
    # spine between the checkpoints
    p.append(f'<line x1="458" y1="{centers[0] + 14}" x2="458" y2="{centers[-1] - 14}" stroke="{s["accent"]}" stroke-width="1.5" opacity=".35"/>')
    for i, (title, detail, code) in enumerate(gates):
        cy = centers[i]
        p.append(f'''<circle cx="458" cy="{cy}" r="12" fill="{s['card']}" stroke="{s['accent']}" stroke-width="1.5"/>
<text x="458" y="{cy + 4.5}" fill="{s['accent']}" font-family="{MONO}" font-size="14" font-weight="700" text-anchor="middle">{i + 1}</text>
<text x="480" y="{cy + 5}" fill="{s['text']}" font-family="{MONO}" font-size="17" font-weight="700">{title}</text>
<text x="480" y="{cy + 23}" fill="{s['sub']}" font-family="{SANS}" font-size="14">{detail}</text>
<rect x="480" y="{cy + 29}" width="200" height="21" rx="10.5" fill="{s['pill']}"/>
<text x="490" y="{cy + 45}" fill="{s['accent']}" font-family="{MONO}" font-size="14">{code}</text>''')

    # citation wire: observation envelope -> checkpoint 1
    p.append(f'''<path d="M390 452 H405 V206 H414" fill="none" stroke="{s['accent']}" stroke-width="2" opacity=".65" stroke-linejoin="round"/>
<path d="M414 202 L421 206 L414 210 Z" fill="{s['accent']}" opacity=".8"/>''')

    # refusal: wall -> re-observe
    p.append(f'''<path d="M420 585 H230 V548" fill="none" stroke="{s['warn']}" stroke-width="2" stroke-dasharray="6 5" opacity=".85"/>
<path d="M225 552 L230 543 L235 552 Z" fill="{s['warn']}" opacity=".9"/>
<text x="44" y="572" fill="{s['faint']}" font-family="{SANS}" font-size="14">refusals are returned</text>
<text x="44" y="590" fill="{s['warn']}" font-family="{MONO}" font-size="14">→ screen_read again</text>''')

    # ---------------------------------------------------------- act plane
    p.append(f'''<text x="734" y="136" fill="{s['accent']}" font-family="{MONO}" font-size="16" font-weight="700" letter-spacing="1.6">ACT</text>
<text x="734" y="158" fill="{s['sub']}" font-family="{SANS}" font-size="14">mutating · approval by default</text>
<g filter="url(#soft)"><rect x="730" y="178" width="330" height="242" rx="18" fill="{s['card']}" stroke="{s['edge']}" stroke-width="1.5"/></g>
<text x="750" y="202" fill="{s['faint']}" font-family="{MONO}" font-size="14" letter-spacing="1.2">MUTATING TOOLS</text>
<text x="1040" y="202" fill="{s['accent']}" font-family="{MONO}" font-size="14" text-anchor="end">basedOn required</text>
<line x1="750" y1="212" x2="1040" y2="212" stroke="{s['grid']}" stroke-width="1.2"/>''')

    act_rows = [
        ("click", "elementId | (x, y) · uia → post"),
        ("type", "value pattern · rollback text"),
        ("scroll", "element | window · post wheel"),
        ("key", "posted keys · loud refusal"),
        ("app_launch", "gate only · no observation"),
    ]
    for i, (name, desc) in enumerate(act_rows):
        y = 238 + i * 36
        p.append(f'<circle cx="756" cy="{y - 5}" r="2.8" fill="{s["accent"]}" opacity=".6"/>')
        p.append(f'<text x="768" y="{y}" fill="{s["text"]}" font-family="{MONO}" font-size="17.5" font-weight="700">{name}</text>')
        p.append(f'<text x="768" y="{y + 18}" fill="{s["sub"]}" font-family="{MONO}" font-size="14">{desc}</text>')

    # helper + target window
    p.append(f'''<g filter="url(#soft)"><rect x="730" y="432" width="330" height="88" rx="18" fill="{s['card']}" stroke="{s['edge']}" stroke-width="1.5"/></g>
<text x="750" y="458" fill="{s['text']}" font-family="{MONO}" font-size="17" font-weight="700">helper · powershell.exe</text>
<text x="750" y="478" fill="{s['sub']}" font-family="{MONO}" font-size="14">UIAutomation · posted input · JSON</text>
<g filter="url(#soft)"><rect x="730" y="540" width="330" height="64" rx="18" fill="{s['card']}" stroke="{s['edge']}" stroke-width="1.5"/></g>
<text x="750" y="566" fill="{s['text']}" font-family="{MONO}" font-size="17" font-weight="700">target window · pid 4242</text>
<text x="750" y="586" fill="{s['sub']}" font-family="{MONO}" font-size="14">focusFallback: never · no steal</text>''')

    # connectors around the wall
    p.append(f'''<path d="M730 206 H704" fill="none" stroke="{s['accent']}" stroke-width="2" opacity=".75"/>
<path d="M708 201 L700 206 L708 211 Z" fill="{s['accent']}" opacity=".85"/>
<path d="M700 458 H726" fill="none" stroke="{s['accent']}" stroke-width="2" opacity=".75"/>
<path d="M722 453 L730 458 L722 463 Z" fill="{s['accent']}" opacity=".85"/>
<path d="M885 520 V534" fill="none" stroke="{s['accent']}" stroke-width="2" opacity=".7"/>
<path d="M880 530 L885 538 L890 530" fill="none" stroke="{s['accent']}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>
<text x="897" y="532" fill="{s['faint']}" font-family="{MONO}" font-size="14">pid before / after</text>
<path d="M730 542 H704" fill="none" stroke="{s['accent']}" stroke-width="1.6" stroke-dasharray="5 4" opacity=".6"/>
<path d="M708 537 L700 542 L708 547 Z" fill="{s['accent']}" opacity=".7"/>''')

    # ----------------------------------------------------------- audit rail
    p.append(f'''<g filter="url(#soft)"><rect x="40" y="616" width="1020" height="32" rx="16" fill="{s['card']}" stroke="{s['edge']}" stroke-width="1.5"/></g>
<text x="60" y="637" fill="{s['accent']}" font-family="{MONO}" font-size="14" font-weight="700" letter-spacing="1.2">AUDIT</text>
<text x="118" y="637" fill="{s['sub']}" font-family="{MONO}" font-size="14">dsh-click/observed</text>
<text x="278" y="637" fill="{s['faint']}" font-family="{MONO}" font-size="14">·</text>
<text x="294" y="637" fill="{s['sub']}" font-family="{MONO}" font-size="14">dsh-click/action</text>
<text x="1040" y="637" fill="{s['faint']}" font-family="{MONO}" font-size="14" text-anchor="end">sanitized · log-only · control chars stripped</text>
</svg>''')

    path = os.path.join(OUT, f"dsh-click-flow-v5-{skin_name}.svg")
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(p) + "\n")
    print(f"wrote dsh-click-flow-v5-{skin_name}.svg")


def main():
    os.makedirs(OUT, exist_ok=True)
    for skin_name in ("light", "dark"):
        for lang in ("zh", "en"):
            hero(lang, skin_name)
        flow_svg(skin_name)
    if WARNINGS:
        print(f"{len(WARNINGS)} layout warning(s)")
    else:
        print("no layout warnings")


if __name__ == "__main__":
    main()
