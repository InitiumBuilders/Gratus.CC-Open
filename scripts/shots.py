#!/usr/bin/env python3
# THE FRONT PAGE'S PHOTOGRAPHS, IN ONE COMMAND.
#
#   python3 scripts/shots.py
#
# Runs scripts/shots.mjs, which opens the real app in a real browser at a real phone size
# and writes PNGs, then encodes them to WebP and deletes the PNGs. Nothing here is his art:
# these are pictures OF the app, regenerated whenever the app changes, which is why they
# are not in config/originals.json with the pictures he drew.
import os
import subprocess
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'art', 'shots')

r = subprocess.run(['node', 'scripts/shots.mjs'], cwd=ROOT)
if r.returncode:
    sys.exit(r.returncode)

for name in sorted(os.listdir(OUT)):
    if not name.endswith('.png'):
        continue
    src = os.path.join(OUT, name)
    dst = src[:-4] + '.webp'
    im = Image.open(src).convert('RGB')
    im.save(dst, 'WEBP', quality=80, method=6)
    os.remove(src)
    print('  %-12s %4d kB' % (os.path.basename(dst), os.path.getsize(dst) // 1024))
print('the front page can show the real thing')
