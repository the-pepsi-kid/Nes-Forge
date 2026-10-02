#!/usr/bin/env python3
"""Lay out exact emulator frame evidence with captions; no invented game art."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
W, H = 1184, 1388
canvas = Image.new('RGB', (W, H), '#101827')
draw = ImageDraw.Draw(canvas)
font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
bold_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
font = lambda size, bold=False: ImageFont.truetype(bold_path if bold else font_path, size)
draw.text((40, 26), 'NES Forge | ROM recovery proof', font=font(32, True), fill='#edf4ff')
draw.text((40, 74), 'Original homebrew → editable project → rebuilt ROM', font=font(21), fill='#a8bdd9')

panels = [
    ('original', '1. Original native ROM', 'Independent 6502 engine. No Forge project metadata.'),
    ('rebuilt', '2. Recovered and rebuilt', 'Same completed frame: zero different pixels.'),
    ('edited-collision', '3. Collision edited in Forge', 'Wall is visible; player can now walk through it.'),
    ('edited-chr', '4. Graphic pixel edited in Forge', 'One CHR pixel changed; matching wall tiles update.'),
]
for index, (name, title, caption) in enumerate(panels):
    x = 40 + (index % 2) * 568
    y = 134 + (index // 2) * 582
    draw.text((x, y), title, font=font(22, True), fill='#edf4ff')
    image = Image.open(ROOT / f'{name}.png').convert('RGB').resize((512, 480), Image.Resampling.NEAREST)
    canvas.paste(image, (x, y + 40))
    draw.text((x, y + 530), caption, font=font(16), fill='#c1d1e9')
    if name == 'edited-chr':
        px, py = x + 192 * 2, y + 40 + 128 * 2
        draw.rectangle((px - 5, py - 5, px + 7, py + 7), outline='#f9e78b', width=2)
        draw.line((px + 7, py, px + 48, py - 44), fill='#f9e78b', width=2)
        draw.text((px + 5, py - 72), 'edited', font=font(16, True), fill='#f9e78b')

draw.text((40, 1308), 'Music edit verified in the APU: C4 timer 427 → C5 timer 213.', font=font(19), fill='#88d5bf')
draw.text((40, 1344), 'Bundled emulator evidence. Browser / device validation remains pending.', font=font(16), fill='#a8bdd9')
canvas.save(ROOT / 'RE_Bridge_Runtime_Comparison.png')
