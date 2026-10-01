#!/usr/bin/env python3
"""Every raster logo file, from the two AI-generated masters (Higgsfield, GPT Image 2.5) in
marketing/brand/logo-concepts/ai/final-{lockup,icon}.png. Cuts them out of their flat backgrounds
(edge-connected flood fill, soft edge, background fringe removed), then writes:

  public/brand/logo-lockup.png|webp      Candy 3D wordmark + mascot, transparent, trimmed
  public/brand/mascot-icon.png           mascot icon (rounded square), transparent, 1024
  public/brand/mascot-icon-full.png      same on a full-bleed gradient (app icons, avatars)
  public/brand/mascot-icon-112.webp|png  header / footer logo icon
  public/icons/icon-512.png, icon-192.png, src/app/apple-icon.png   full-bleed app icons
  src/app/icon.png (64), src/app/favicon.ico (16/32/48)              transparent tab icons

Needs Pillow + numpy:  python scripts/brand/logo-assets.py
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'marketing', 'brand', 'logo-concepts', 'ai')
OUT = os.path.join(ROOT, 'public', 'brand')


def dilate(m, r=1):
    out = m.copy()
    for _ in range(r):
        o = out.copy()
        o[1:, :] |= out[:-1, :]
        o[:-1, :] |= out[1:, :]
        o[:, 1:] |= out[:, :-1]
        o[:, :-1] |= out[:, 1:]
        out = o
    return out


def edge_connected(cand):
    seed = np.zeros_like(cand)
    seed[0, :], seed[-1, :], seed[:, 0], seed[:, -1] = cand[0, :], cand[-1, :], cand[:, 0], cand[:, -1]
    while True:
        nxt = dilate(seed) & cand
        if (nxt == seed).all():
            return seed
        seed = nxt


def cutout(rgb, bg, cand, soft):
    """cand: pixels that may be background; soft: per-pixel 0..1 'how foreground' for the edge ring."""
    bgmask = edge_connected(cand)
    ring = dilate(bgmask, 3) & ~bgmask
    alpha = np.ones(rgb.shape[:2])
    alpha[bgmask] = 0
    alpha[ring] = soft[ring]
    # remove the background colour bleeding into semi-transparent edge pixels
    a = alpha[..., None]
    fg = np.where(a > 0.02, (rgb - (1 - a) * bg) / np.maximum(a, 0.02), rgb)
    rgba = np.dstack([np.clip(fg, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')


def trim(img, pad):
    box = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    img = img.crop(box)
    out = Image.new('RGBA', (img.width + 2 * pad, img.height + 2 * pad), (0, 0, 0, 0))
    out.paste(img, (pad, pad))
    return out


# Lockup: flat navy background, near-black outlines.
rgb = np.asarray(Image.open(os.path.join(SRC, 'final-lockup.png')).convert('RGB')).astype(float)
bg = np.median(np.concatenate([rgb[:4].reshape(-1, 3), rgb[-4:].reshape(-1, 3)]), axis=0)
d = np.sqrt(((rgb - bg) ** 2).sum(-1))
lock = cutout(rgb, bg, d < 26, np.clip((d - 12) / 34, 0, 1))
lock = trim(lock, 12)
lock.save(os.path.join(OUT, 'logo-lockup.png'), optimize=True)
print('logo-lockup.png', lock.size, 'bg', bg.round().tolist())

# Icon: light grey backdrop (plus its soft grey drop shadow), saturated icon.
rgb = np.asarray(Image.open(os.path.join(SRC, 'final-icon.png')).convert('RGB')).astype(float)
bg = np.median(rgb[:4].reshape(-1, 3), axis=0)
mx, mn = rgb.max(-1), rgb.min(-1)
sat = (mx - mn) / np.maximum(mx, 1)
grey = (sat < 0.16) & (mx > 120)
icon = cutout(rgb, bg, grey, np.clip((sat - 0.10) / 0.22, 0, 1))
icon = trim(icon, 0)
S = max(icon.size)
sq = Image.new('RGBA', (S, S), (0, 0, 0, 0))
sq.paste(icon, ((S - icon.width) // 2, (S - icon.height) // 2))
sq = sq.resize((1024, 1024), Image.LANCZOS)
sq.save(os.path.join(OUT, 'mascot-icon.png'), optimize=True)
print('mascot-icon.png', sq.size)


# Full-bleed version: the rounded square on a matching magenta to purple gradient, so iOS and
# Android (which fill transparency with black, or mask to their own shape) show a solid tile.
grad = np.zeros((1024, 1024, 4), dtype=np.uint8)
t = np.linspace(0, 1, 1024)[:, None]
top, bot = np.array([240, 21, 143]), np.array([91, 12, 156])
grad[..., :3] = (top * (1 - t) + bot * t)[:, None, :].astype(np.uint8).reshape(1024, 1, 3)
grad[..., 3] = 255
full = Image.fromarray(grad, 'RGBA')
full.alpha_composite(sq)
full = full.convert('RGB')
full.save(os.path.join(OUT, 'mascot-icon-full.png'), optimize=True)

APP = os.path.join(ROOT, 'src', 'app')
ICONS = os.path.join(ROOT, 'public', 'icons')
os.makedirs(ICONS, exist_ok=True)
for size, path in [(512, os.path.join(ICONS, 'icon-512.png')), (192, os.path.join(ICONS, 'icon-192.png')), (180, os.path.join(APP, 'apple-icon.png'))]:
    full.resize((size, size), Image.LANCZOS).save(path, optimize=True)
sq.resize((64, 64), Image.LANCZOS).save(os.path.join(APP, 'icon.png'), optimize=True)
sq.resize((256, 256), Image.LANCZOS).save(os.path.join(APP, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
small = sq.resize((112, 112), Image.LANCZOS)
small.save(os.path.join(OUT, 'mascot-icon-112.png'), optimize=True)
small.save(os.path.join(OUT, 'mascot-icon-112.webp'), quality=90, method=6)
lock.save(os.path.join(OUT, 'logo-lockup.webp'), quality=90, method=6)
print('icons, favicon, header icon and webp lockup written')
