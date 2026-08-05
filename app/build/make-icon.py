#!/usr/bin/env python3
"""Render Idexal's app icon from the same mark the UI uses.

The logo is one SVG path in `app/src/renderer/icons.ts`. Redrawing it by
hand in an image editor would let the two drift apart the first time either
changed, so the icon is generated from those exact coordinates and the exact
brand colours out of `style.css`.

Run: python app/build/make-icon.py
Writes: app/build/icon.png (512) and app/build/icon.ico (multi-size)
"""

from pathlib import Path
from PIL import Image, ImageDraw

# ── the mark, straight from icons.ts ──────────────────────────────────────
# logo: '<path d="M4 18 11 4l3 7h6l-7 9-2.5-6.5H4z"/>'  on a 24x24 grid.
# Written out as absolute points; `l 3 7` etc. are relative in the source.
MARK_24 = [
    (4.0, 18.0),    # M4 18
    (11.0, 4.0),    # 11 4
    (14.0, 11.0),   # l3 7   -> 11+3, 4+7
    (20.0, 11.0),   # h6
    (13.0, 20.0),   # l-7 9
    (10.5, 13.5),   # l-2.5 -6.5
]

# ── brand colours, straight from style.css ────────────────────────────────
ACCENT = (0x4D, 0x7C, 0xFE)   # --accent
BG = (0x0F, 0x10, 0x14)       # --bg

CANVAS = 512
# Rendered 4x then downsampled: cheap, reliable anti-aliasing without
# pulling in a rasteriser.
SS = 4
# Windows shows the icon as small as 16px, where a full-bleed square reads
# as a coloured blob; the inset and rounded corners keep it legible.
PAD_RATIO = 0.14
RADIUS_RATIO = 0.22


def render(size: int) -> Image.Image:
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    draw.rounded_rectangle(
        [(0, 0), (big - 1, big - 1)],
        radius=int(big * RADIUS_RATIO),
        fill=BG + (255,),
    )

    pad = big * PAD_RATIO
    span = big - 2 * pad
    scale = span / 24.0
    points = [(pad + x * scale, pad + y * scale) for x, y in MARK_24]
    draw.polygon(points, fill=ACCENT + (255,))

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    out = Path(__file__).resolve().parent
    render(CANVAS).save(out / "icon.png")
    # electron-builder wants one .ico carrying every size Windows asks for:
    # the taskbar, the title bar and the file listing each pick a different
    # one, and a missing size gets scaled badly rather than skipped.
    sizes = [16, 24, 32, 48, 64, 128, 256]
    base = render(256)
    base.save(out / "icon.ico", format="ICO", sizes=[(s, s) for s in sizes])
    print(f"wrote {out/'icon.png'} and {out/'icon.ico'} ({len(sizes)} sizes)")


if __name__ == "__main__":
    main()
