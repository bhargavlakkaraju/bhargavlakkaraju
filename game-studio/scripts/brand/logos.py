#!/usr/bin/env python3
"""Retry Arcade logo concepts, with ARCADE as the hero word.

Writes public/brand/logo-concepts/<name>.svg with every letter converted to outlines (no
font needed to open them anywhere), four directions:

  stacked   RETRY above a huge extruded ARCADE (Barlow Condensed)
  block     ARCADE in chunky Bungee with layered retro shadows
  neon      ARCADE as a neon tube sign
  pixel     ARCADE built from glossy game tiles, like the blocks in Block Crush

Needs fontTools + brotli (pip install fonttools brotli). Render previews with
scripts/brand/logo-previews.mjs.
"""
import math
import os

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
import pathops

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FONTS = os.path.join(ROOT, 'public', 'fonts')
OUT = os.path.join(ROOT, 'public', 'brand', 'logo-concepts')
os.makedirs(OUT, exist_ok=True)

PINK, SUN, AQUA, LIME, PURPLE, INK = '#ff3d8b', '#ffd23f', '#22d3ee', '#a3e635', '#9b5cff', '#0a0a0c'

_fonts = {}


def font(name):
    if name not in _fonts:
        _fonts[name] = TTFont(os.path.join(FONTS, name))
    return _fonts[name]


def text_path(fname, text, size, x, y, tracking=0.0, merge=False):
    """SVG path data for text set on baseline y starting at x. Returns (d, width).
    merge=True unions overlapping contours (clean outlines for stroked lettering)."""
    f = font(fname)
    upm = f['head'].unitsPerEm
    cmap = f.getBestCmap()
    gs = f.getGlyphSet()
    hmtx = f['hmtx']
    s = size / upm
    pen = SVGPathPen(gs)
    cx = x
    for i, ch in enumerate(text):
        g = cmap.get(ord(ch))
        if g is None:
            continue
        if merge:
            path = pathops.Path()
            gs[g].draw(path.getPen(glyphSet=gs))
            path.simplify()
            path.draw(TransformPen(pen, (s, 0, 0, -s, cx, y)))
        else:
            gs[g].draw(TransformPen(pen, (s, 0, 0, -s, cx, y)))
        cx += hmtx[g][0] * s + (tracking * size if i < len(text) - 1 else 0)
    return pen.getCommands(), cx - x


def text_width(fname, text, size, tracking=0.0):
    return text_path(fname, text, size, 0, 0, tracking)[1]


def retry_arrow(cx, cy, r, stroke, width):
    """A circular 'retry' arrow: a 300 degree arc with an arrowhead."""
    a0, a1 = math.radians(-50), math.radians(250)
    x0, y0 = cx + r * math.cos(a0), cy + r * math.sin(a0)
    x1, y1 = cx + r * math.cos(a1), cy + r * math.sin(a1)
    arc = f'M{x0:.1f},{y0:.1f} A{r},{r} 0 1 1 {x1:.1f},{y1:.1f}'
    # arrowhead at the start of the arc, pointing along the reverse direction
    tx, ty = math.cos(a0 - math.pi / 2), math.sin(a0 - math.pi / 2)
    nx, ny = math.cos(a0), math.sin(a0)
    h = width * 2.2
    p1 = (x0 + nx * h * 0.9, y0 + ny * h * 0.9)
    p2 = (x0 - nx * h * 0.9, y0 - ny * h * 0.9)
    p3 = (x0 - tx * h * 1.3, y0 - ty * h * 1.3)
    head = f'M{p1[0]:.1f},{p1[1]:.1f} L{p3[0]:.1f},{p3[1]:.1f} L{p2[0]:.1f},{p2[1]:.1f} Z'
    return (
        f'<path d="{arc}" fill="none" stroke="{stroke}" stroke-width="{width}" stroke-linecap="round"/>'
        f'<path d="{head}" fill="{stroke}"/>'
    )


def svg(w, h, body, defs=''):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
        f'<defs>{defs}</defs>{body}</svg>'
    )


def write(name, content):
    with open(os.path.join(OUT, f'{name}.svg'), 'w') as fh:
        fh.write(content)
    print('wrote', os.path.relpath(os.path.join(OUT, f'{name}.svg'), ROOT))


# ------------------------------------------------------------------ 1. stacked
def stacked(light=False):
    W, H = 1200, 560
    big = 330
    aw = text_width('BarlowCondensed-800.woff2', 'ARCADE', big, 0.01)
    x = (W - aw) / 2
    base = 470
    d, _ = text_path('BarlowCondensed-800.woff2', 'ARCADE', big, x, base, 0.01)
    extrude = ''.join(
        f'<path d="{d}" transform="translate({i * 2.2:.1f},{i * 2.6:.1f})" fill="{c}"/>'
        for i, c in reversed(list(enumerate(['#6b1fb0'] * 3 + ['#4a1580'] * 3 + ['#2c0c52'] * 3, start=1)))
    )
    small = 104
    rw = text_width('BarlowCondensed-800.woff2', 'RETRY', small, 0.22)
    icon = 96
    gap = 26
    total = icon + gap + rw
    rx = (W - total) / 2 + icon + gap
    rd, _ = text_path('BarlowCondensed-800.woff2', 'RETRY', small, rx, 150, 0.22)
    ix = (W - total) / 2 + icon / 2
    defs = (
        f'<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7ab6"/>'
        f'<stop offset="0.55" stop-color="{PINK}"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient>'
    )
    body = (
        extrude
        + f'<path d="{d}" fill="url(#g)"/>'
        + f'<path d="{d}" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="3"/>'
        + f'<path d="{rd}" fill="{"#4a1580" if light else SUN}"/>'
        + retry_arrow(ix, 112, 34, '#4a1580' if light else SUN, 13)
    )
    write('stacked-light' if light else 'stacked', svg(W, H, body, defs))


# ------------------------------------------------------------------ 2. block
def block():
    W, H = 1300, 520
    big = 250
    aw = text_width('Bungee-400.woff2', 'ARCADE', big)
    x = (W - aw) / 2
    base = 440
    d, _ = text_path('Bungee-400.woff2', 'ARCADE', big, x, base)
    layers = (
        f'<path d="{d}" transform="translate(18,18)" fill="{AQUA}"/>'
        f'<path d="{d}" transform="translate(9,9)" fill="{PURPLE}"/>'
        f'<path d="{d}" fill="{PINK}"/>'
        f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
    )
    small = 92
    rd, rw = text_path('BarlowCondensed-800.woff2', 'RETRY', small, 0, 0, 0.3)
    # "RETRY" centered on a sun ribbon above
    pw = rw + 170
    px = (W - pw) / 2
    ribbon = f'<rect x="{px:.1f}" y="40" width="{pw:.1f}" height="112" rx="56" fill="{SUN}"/>'
    rd, _ = text_path('BarlowCondensed-800.woff2', 'RETRY', small, px + 128, 130, 0.3)
    body = ribbon + f'<path d="{rd}" fill="{INK}"/>' + retry_arrow(px + 62, 96, 26, INK, 10) + layers
    write('block', svg(W, H, body))


# ------------------------------------------------------------------ 3. neon
def neon():
    W, H = 1300, 600
    big = 300
    aw = text_width('Fredoka-Bold.ttf', 'ARCADE', big, 0.02)
    x = (W - aw) / 2
    base = 470
    d, _ = text_path('Fredoka-Bold.ttf', 'ARCADE', big, x, base, 0.02, merge=True)
    small = 88
    rw = text_width('Fredoka-Bold.ttf', 'retry', small, 0.06)
    rx = (W - rw - 110) / 2 + 110
    rd, _ = text_path('Fredoka-Bold.ttf', 'retry', small, rx, 150, 0.06, merge=True)
    defs = (
        '<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" result="b"/>'
        '<feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    )
    body = (
        f'<rect x="0" y="0" width="{W}" height="{H}" rx="60" fill="#0d0718"/>'
        f'<path d="{d}" fill="none" stroke="{PINK}" stroke-width="16" stroke-linejoin="round" filter="url(#glow)"/>'
        f'<path d="{d}" fill="none" stroke="#ffd6e8" stroke-width="5" stroke-linejoin="round"/>'
        f'<path d="{rd}" fill="none" stroke="{AQUA}" stroke-width="9" stroke-linejoin="round" filter="url(#glow)"/>'
        f'<path d="{rd}" fill="none" stroke="#dffbff" stroke-width="3" stroke-linejoin="round"/>'
        f'<g filter="url(#glow)">{retry_arrow(rx - 70, 118, 30, AQUA, 9)}</g>'
    )
    write('neon', svg(W, H, body, defs))


# ------------------------------------------------------------------ 4. pixel
PIXELS = {
    'A': ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    'C': ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
    'D': ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    'E': ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
}


def pixel(light=False):
    cell = 42
    gapx = cell
    letters = 'ARCADE'
    colors = [PINK, SUN, AQUA, LIME, PURPLE, '#ff7a3d']
    lw = 5 * cell
    total = len(letters) * lw + (len(letters) - 1) * gapx
    W, H = int(total + 120), 560
    ox, oy = 60, 220
    tiles = []
    for li, ch in enumerate(letters):
        c = colors[li]
        for r, row in enumerate(PIXELS[ch]):
            for k, bit in enumerate(row):
                if bit != '1':
                    continue
                x = ox + li * (lw + gapx) + k * cell
                y = oy + r * cell
                s = cell - 4
                tiles.append(
                    f'<rect x="{x + 2}" y="{y + 6}" width="{s}" height="{s}" rx="8" fill="#000" opacity="0.35"/>'
                    f'<rect x="{x + 2}" y="{y + 2}" width="{s}" height="{s}" rx="8" fill="{c}"/>'
                    f'<rect x="{x + 7}" y="{y + 6}" width="{s - 10}" height="{s * 0.28:.1f}" rx="5" fill="#fff" opacity="0.35"/>'
                )
    small = 104
    rd, rw = text_path('BarlowCondensed-800.woff2', 'RETRY', small, 0, 0, 0.3)
    icon = 90
    tot = icon + 24 + rw
    rx = (W - tot) / 2 + icon + 24
    rd, _ = text_path('BarlowCondensed-800.woff2', 'RETRY', small, rx, 160, 0.3)
    ink = INK if light else '#ffffff'
    body = f'<path d="{rd}" fill="{ink}"/>' + retry_arrow((W - tot) / 2 + icon / 2, 123, 32, ink, 12) + ''.join(tiles)
    write('pixel-light' if light else 'pixel', svg(W, H, body))


if __name__ == '__main__':
    stacked()
    stacked(light=True)
    block()
    neon()
    pixel()
    pixel(light=True)
