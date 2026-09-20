#!/usr/bin/env python3
# THE GUIDES, ON OUR OWN SITE.
#
# They lived in docs/guides/*.md and the site sent people to GitHub to read them, which is
# the same as not having written them. Every guide is a page at gratus.cc/docs/<slug> now:
# his scene across the top, the words set for reading on a phone, and the next guide
# waiting at the bottom. No JavaScript is needed to read a word of it.
#
#   python3 scripts/guides.py
import glob
import html
import io
import json
import os
import re

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
OUT = R + 'guides/'

# one of his scenes per guide, walked in order so no two neighbours share a picture
SCENES = ['g31', 'g08', 'g33', 'g37', 'g11', 'g24', 'g13', 'g25', 'g35', 'g34', 'g15', 'g36',
          'g14', 'g23', 'g19', 'g21', 'g30', 'g20', 'g27', 'g05', 'g06', 'g09', 'g22', 'g07']


def md(text):
    """A small markdown, for the shapes these guides actually use."""
    out = []
    lines = text.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        # table
        if line.startswith('|') and i + 1 < len(lines) and re.match(r'^\|[\s\-:|]+\|$', lines[i + 1]):
            head = [c.strip() for c in line.strip('|').split('|')]
            i += 2
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                rows.append([c.strip() for c in lines[i].strip('|').split('|')])
                i += 1
            out.append('<table><thead><tr>' + ''.join('<th>' + inline(c) + '</th>' for c in head) +
                       '</tr></thead><tbody>' +
                       ''.join('<tr>' + ''.join('<td>' + inline(c) + '</td>' for c in r) + '</tr>' for r in rows) +
                       '</tbody></table>')
            continue
        # list
        if re.match(r'^\s*[-*]\s+', line):
            items = []
            while i < len(lines) and re.match(r'^\s*[-*]\s+', lines[i]):
                item = re.sub(r'^\s*[-*]\s+', '', lines[i])
                i += 1
                while i < len(lines) and lines[i].startswith('  ') and lines[i].strip():
                    item += ' ' + lines[i].strip()
                    i += 1
                items.append('<li>' + inline(item) + '</li>')
            out.append('<ul>' + ''.join(items) + '</ul>')
            continue
        if re.match(r'^\s*\d+\.\s+', line):
            items = []
            while i < len(lines) and re.match(r'^\s*\d+\.\s+', lines[i]):
                item = re.sub(r'^\s*\d+\.\s+', '', lines[i])
                i += 1
                while i < len(lines) and lines[i].startswith('   ') and lines[i].strip():
                    item += ' ' + lines[i].strip()
                    i += 1
                items.append('<li>' + inline(item) + '</li>')
            out.append('<ol>' + ''.join(items) + '</ol>')
            continue
        # heading
        m = re.match(r'^(#{1,4})\s+(.*)$', line)
        if m:
            lv = len(m.group(1))
            out.append('<h%d>%s</h%d>' % (lv + 1, inline(m.group(2)), lv + 1))
            i += 1
            continue
        if not line.strip():
            i += 1
            continue
        # paragraph
        para = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r'^(#{1,4}\s|\s*[-*]\s|\s*\d+\.\s|\|)', lines[i]):
            para.append(lines[i])
            i += 1
        out.append('<p>' + inline(' '.join(x.strip() for x in para)) + '</p>')
    return '\n'.join(out)


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<!\w)\*([^*]+)\*(?!\w)', r'<em>\1</em>', s)
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', s)
    return s


def front(text):
    m = re.match(r'^---\n([\s\S]*?)\n---\n', text)
    if not m:
        return {}, text
    meta = {}
    for line in m.group(1).split('\n'):
        k, _, v = line.partition(':')
        meta[k.strip()] = v.strip()
    return meta, text[m.end():]


PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>%(title)s · Gratus Guides</title>
<meta name="description" content="%(blurb)s">
<meta name="theme-color" content="#050912">
<meta property="og:title" content="%(title)s · Gratus Guides">
<meta property="og:description" content="%(blurb)s">
<meta property="og:image" content="https://www.gratus.cc/assets/brand/og/guided.jpg">
<link rel="canonical" href="https://www.gratus.cc/docs/%(slug)s">
<link rel="icon" href="/assets/brand/icon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/assets/brand/icon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/assets/css/tokens.css?v=36">
<link rel="stylesheet" href="/assets/css/page.css?v=2">
</head>
<body class="doc guide">
<nav class="docnav"><a class="brand" href="/docs"><img src="/assets/art/gfx/logo.webp" alt=""><span>Gratus<em> Guides</em></span></a><a class="pill" href="/app">Open the app</a></nav>

<header class="gband" style="background-image:linear-gradient(180deg,rgba(5,9,18,.28),rgba(5,9,18,.94)),url(/assets/art/gfx/%(scene)s.webp)">
  <div class="wrap">
    <p class="kick">%(audience)s · %(time)s</p>
    <h1>%(title)s</h1>
  </div>
</header>

<main class="wrap guidebody">
%(body)s
</main>

<nav class="wrap gnext">
%(next)s
  <a class="gback" href="/docs">All %(count)d guides</a>
</nav>

<footer class="docfoot">
  <p class="tags">#GrowTheDifference &nbsp; #GrowWithGratus</p>
  <p class="presented">Gratus.CC presented by Outlier.Systems</p>
  <nav><a href="/the-story">The story</a> · <a href="/give-and-grow">Give and grow</a> · <a href="/docs">Docs</a> · <a href="/app">The app</a></nav>
  <p class="mit">Checked against %(verified)s · <a href="https://github.com/InitiumBuilders/Gratus.CC-Open/blob/master/docs/guides/%(slug)s.md">the source of this page</a></p>
</footer>
</body>
</html>
"""

files = sorted(glob.glob(R + 'docs/guides/*.md'))
guides = []
for f in files:
    text = io.open(f, encoding='utf-8').read()
    meta, body = front(text)
    slug = os.path.basename(f)[:-3]
    first = re.search(r'^(?!#)(.+)$', body.strip(), re.M)
    blurb = re.sub(r'[*`\[\]]|\(.*?\)', '', first.group(1))[:150].strip() if first else meta.get('title', '')
    guides.append({'slug': slug, 'meta': meta, 'body': body, 'blurb': blurb})

os.makedirs(OUT, exist_ok=True)
for n, g in enumerate(guides):
    nxt = guides[(n + 1) % len(guides)]
    nextblock = ('  <a class="gnextcard" href="/docs/%s"><span class="kick">Next guide</span><b>%s</b><span>%s · %s</span></a>'
                 % (nxt['slug'], html.escape(nxt['meta'].get('title', '')),
                    html.escape(nxt['meta'].get('audience', '')), html.escape(nxt['meta'].get('time', ''))))
    page = PAGE % {
        'title': html.escape(g['meta'].get('title', g['slug'])),
        'blurb': html.escape(g['blurb'], quote=True),
        'slug': g['slug'],
        'scene': SCENES[n % len(SCENES)],
        'audience': html.escape(g['meta'].get('audience', 'anyone')),
        'time': html.escape(g['meta'].get('time', '')),
        'verified': html.escape(g['meta'].get('verified-against', '')),
        'body': md(g['body']),
        'next': nextblock,
        'count': len(guides),
    }
    t = OUT + g['slug'] + '.html.tmp'
    io.open(t, 'w', encoding='utf-8', newline='\n').write(page)
    os.replace(t, OUT + g['slug'] + '.html')

# the index, on our own site, with every guide on it
rows = []
for n, g in enumerate(guides):
    rows.append('    <li><a href="/docs/%s"><span class="gi" style="background-image:url(/assets/art/gfx/%s.webp)"></span>'
                '<span class="gt"><b>%s</b><span>%s</span><span class="gm">%s · %s</span></span>'
                '<span class="ga">&rsaquo;</span></a></li>'
                % (g['slug'], SCENES[n % len(SCENES)], html.escape(g['meta'].get('title', '')),
                   html.escape(g['blurb'][:96]), html.escape(g['meta'].get('audience', '')),
                   html.escape(g['meta'].get('time', ''))))
io.open(R + 'scratch-guide-rows.html', 'w', encoding='utf-8', newline='\n').write('\n'.join(rows))
print('wrote %d guide pages into guides/' % len(guides))
