# Derive the app icon set from the owner's exact logo file. Pixels untouched; only
# resized and, for maskable icons, padded onto Night Soil. Never redrawn.
from PIL import Image
import os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(root, 'assets', 'brand', 'gratus-logo-original.webp')
out = os.path.join(root, 'assets', 'brand')
im = Image.open(src).convert('RGBA')
# transparent set
for s in (1024, 512, 192, 180, 167, 152, 120, 32):
    im.resize((s, s), Image.LANCZOS).save(os.path.join(out, f'icon-{s}.png'))
# maskable: the coin at 80% inside Night Soil
for s in (512, 192):
    bg = Image.new('RGBA', (s, s), (9, 11, 36, 255))
    inner = int(s * 0.8)
    coin = im.resize((inner, inner), Image.LANCZOS)
    bg.alpha_composite(coin, ((s - inner) // 2, (s - inner) // 2))
    bg.save(os.path.join(out, f'icon-maskable-{s}.png'))
# a PNG twin of the logo for OG images and browsers without WebP
im.save(os.path.join(out, 'gratus-logo.png'))
print('icons written')
