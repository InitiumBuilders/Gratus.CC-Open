#!/usr/bin/env python3
# HIS PICTURES, DELIVERED SMALL. The originals are never touched.
#
# Every scene, poster, mark and mockup in this repository is his. They are the source and
# they stay exactly as he made them, byte for byte, which config/originals.json records
# and scripts/gates/pictures.mjs checks on every ship.
#
# What goes over the wire is a rendition: the same picture, same pixels wide, encoded as
# WebP. A phone that was pulling 1.37 MB to open the Grow tab was spending most of it on
# a 640 by 640 mark drawn at forty points and a full bleed scene stored as a JPEG.
#
#   python3 scripts/renditions.py            make any rendition that is missing or stale
#   python3 scripts/renditions.py --check    say what is missing, change nothing
import hashlib
import json
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIRS = ['assets/art/gfx', 'assets/art/home', 'assets/art/mock', 'assets/brand']
SKIP = {'_frames.jpg', '_posters.jpg', '_sheet1.jpg', '_sheet2.jpg'}
# The widest a picture is ever drawn, at three times, rounded up. Measured in a browser
# rather than guessed: his mark is painted largest in the landing hero at 128 css px,
# which is 384 device pixels on a three times phone. A rendition smaller than the place
# it is painted makes his mark soft, and that is not a trade any number of kilobytes wins.
WIDTH = {'assets/art/mock': 900, 'assets/brand': 640}
WIDTH_FILE = {'assets/art/gfx/logo.png': 384}
QUALITY = 80
CHECK = '--check' in sys.argv


def sources():
    out = []
    for d in SRC_DIRS:
        full = os.path.join(ROOT, d)
        if not os.path.isdir(full):
            continue
        for name in sorted(os.listdir(full)):
            if name in SKIP or name.startswith('.'):
                continue
            if not name.lower().endswith(('.jpg', '.jpeg', '.png')):
                continue
            # the app icons are read by the platform, not by the page, and a phone
            # installing a shortcut wants exactly the file the manifest names
            if d == 'assets/brand' and name.startswith('icon-'):
                continue
            out.append((d, name))
    return out


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    manifest = {}
    made = 0
    before = after = 0
    rows = []
    for d, name in sources():
        src = os.path.join(ROOT, d, name)
        rel = d + '/' + name
        out = os.path.join(ROOT, d, os.path.splitext(name)[0] + '.webp')
        relout = d + '/' + os.path.splitext(name)[0] + '.webp'
        digest = sha(src)
        manifest[rel] = {'sha256': digest, 'bytes': os.path.getsize(src), 'rendition': relout}
        before += os.path.getsize(src)
        fresh = os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(src)
        if not fresh and not CHECK:
            with Image.open(src) as im:
                cap = WIDTH_FILE.get(rel, WIDTH.get(d))
                if cap and im.width > cap:
                    im = im.resize((cap, round(im.height * cap / im.width)), Image.LANCZOS)
                im.save(out, 'WEBP', quality=QUALITY, method=6)
            made += 1
        if os.path.exists(out):
            after += os.path.getsize(out)
            rows.append((os.path.getsize(src) - os.path.getsize(out), rel, os.path.getsize(src), os.path.getsize(out)))
        elif CHECK:
            rows.append((0, rel + '  MISSING', os.path.getsize(src), 0))

    if not CHECK:
        # the record of what his files were when the renditions were made
        path = os.path.join(ROOT, 'config', 'originals.json')
        tmp = path + '.tmp'
        with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
            json.dump({'note': 'His pictures, as he made them. A rendition is delivered; these are never edited.',
                       'quality': QUALITY, 'files': manifest}, f, indent=1, ensure_ascii=False)
            f.write('\n')
        os.replace(tmp, path)

    rows.sort(reverse=True)
    print('%d sources, %d renditions written' % (len(manifest), made))
    print('%.2f MB of his originals  ->  %.2f MB delivered   (%.0f%% off)'
          % (before / 1048576.0, after / 1048576.0, 100 * (1 - after / before) if before else 0))
    print()
    for saved, rel, b, a in rows[:12]:
        print('  %-42s %7.0fK -> %6.0fK' % (rel.replace('assets/', ''), b / 1024.0, a / 1024.0))


main()
