#!/usr/bin/env python3
"""Render one offline book; markdown2 is a documentation-only dependency.

The renderer never edits application inputs or projects. Cross-chapter links
become internal anchors, and the runnable synthetic codec is included in full.
"""
from pathlib import Path
import html
import re
import json
import hashlib
import argparse
try:
    import markdown2
except ImportError as error:
    raise SystemExit('Documentation rendering requires Python markdown2.') from error

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / 'app/docs'
CHAPTERS = [
    ('hosted', 'Hosted Worlds and shared editor workflow', DOCS / 'projects/HOSTED_WORLDS.md'),
    ('projects', 'Title methods and tutorial requirements', DOCS / 'projects/README.md'),
    ('native-pages', 'Native source pages and structures', DOCS / 'projects/NATIVE_SOURCE_PAGES.md'),
    ('zelda2', 'Zelda II native World and location workflow', DOCS / 'projects/ZELDA_II.md'),
    ('ninja', 'Ninja Gaiden source and editable copies', DOCS / 'projects/NINJA_GAIDEN.md'),
    ('punch-out', 'Punch-Out worked tutorial', DOCS / 'projects/PUNCH_OUT.md'),
    ('general', 'NES Forge developer and asset guide', DOCS / 'NATIVE_RECOVERY_TUTORIAL.md'),
    ('template', 'Template for the next title', DOCS / 'projects/PROJECT_TUTORIAL_TEMPLATE.md'),
    ('metroid', 'Metroid room workflow', ROOT / 'reviews/native-resource-recovery-2/METROID_REVIEW.md'),
    ('metroid-audio', 'Metroid Audio workflow', ROOT / 'reviews/native-resource-recovery-2/METROID_AUDIO.md'),
    ('lolo', 'Lolo room acceptance', ROOT / 'reviews/lolo-recovery-1/Owner_Checklist.md'),
    ('lolo-audio', 'Lolo Audio acceptance', ROOT / 'reviews/lolo-audio-1/Owner_Checklist.md'),
    ('river-city', 'River City Scene and Audio acceptance', ROOT / 'reviews/river-city-1/Owner_Checklist.md'),
    ('shadowgate', 'Shadowgate picture and Audio acceptance', ROOT / 'reviews/shadowgate-1/Owner_Checklist.md'),
    ('verification', 'Per-title verification requirements', ROOT / 'reviews/PROJECT_VERIFICATION.md'),
]
TARGETS = {path.resolve(): key for key, _, path in CHAPTERS}
chapters, navigation, lesson_data = [], [], []
for key, title, path in CHAPTERS:
    rendered = markdown2.markdown(path.read_text(), extras=['tables', 'fenced-code-blocks', 'header-ids'])
    rendered = re.sub(r'\bid="([^"]+)"', lambda m: f'id="{key}-{m[1]}"', rendered)

    def link(match):
        value = html.unescape(match[1])
        if value.startswith('#'):
            return f'href="#{key}-{html.escape(value[1:], quote=True)}"'
        if '://' in value or value.startswith('mailto:'):
            return match[0]
        file, _, fragment = value.partition('#')
        target = (path.parent / file).resolve()
        if target not in TARGETS:
            raise ValueError(f'Unbundled relative link: {path}: {value}')
        anchor = TARGETS[target] + ('-' + fragment if fragment else '')
        return f'href="#{html.escape(anchor, quote=True)}"'

    rendered = re.sub(r'href="([^"]+)"', link, rendered)
    lesson_data.append({'id': key, 'title': title, 'html': rendered, 'source': str(path.relative_to(ROOT)), 'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    headings = re.findall(r'<h([12]) id="([^"]+)">(.*?)</h\1>', rendered, re.S)
    contents = ''.join(f'<li><a href="#{anchor}">{label}</a></li>' for _, anchor, label in headings)
    chapters.append(f'<section id="{key}"><p class="part">{html.escape(title)}</p>{rendered}</section>')
    navigation.append(f'<details><summary>{html.escape(title)}</summary><ul>{contents}</ul></details>')

exercise = html.escape((DOCS / 'native-codec-exercise.cjs').read_text())
chapters.append('<section id="synthetic"><p class="part">Runnable synthetic exercise</p>'
    '<h1>Synthetic codec source</h1><p>Save this as <code>native-codec-exercise.cjs</code> '
    'and run <code>node native-codec-exercise.cjs</code>. This is an invented 48-byte teaching format, '
    'not an NES ROM or a Punch-Out decoder.</p><pre><code>' + exercise + '</code></pre></section>')
navigation.append('<p><a href="#synthetic">Runnable synthetic codec source</a></p>')
lesson_data.append({'id': 'synthetic', 'title': 'Runnable synthetic codec exercise', 'html': chapters[-1].removeprefix('<section id="synthetic">').removesuffix('</section>'), 'source': 'app/docs/native-codec-exercise.cjs', 'sourceSha256': hashlib.sha256((DOCS / 'native-codec-exercise.cjs').read_bytes()).hexdigest()})

STYLE = '''
:root{color-scheme:light;--ink:#172238;--line:#c1ccda;--accent:#164f95}
*{box-sizing:border-box}body{margin:0;background:#f3f6fa;color:var(--ink);font:17px/1.65 system-ui,sans-serif}
main{max-width:1100px;margin:auto;padding:36px 30px 90px}header{padding:24px 28px;background:#14273e;color:#f7fbff;border-radius:12px}
header h1{margin:.2em 0;font-size:2.3rem}header p{margin:.6em 0}.meta,.part{font-size:.85rem;letter-spacing:.05em;text-transform:uppercase}
nav{background:white;border:1px solid var(--line);padding:18px 24px;border-radius:10px;margin:26px 0}
nav details{padding:9px 0;border-bottom:1px solid #e0e6ee}summary{cursor:pointer;font-weight:650}nav ul{margin:.6em 0;padding-left:24px}
section{background:white;padding:25px 30px;margin:26px 0;border:1px solid var(--line);border-radius:10px}
.part{color:#53647a}h1,h2,h3{line-height:1.25;scroll-margin-top:24px}h1{font-size:2rem}h2{margin-top:2em;padding-top:.9em;border-top:1px solid var(--line)}
a{color:var(--accent)}table{display:block;overflow-x:auto;border-collapse:collapse;width:100%;font-size:.9rem;margin:1.4em 0}
th,td{border:1px solid var(--line);padding:10px;vertical-align:top;text-align:left}th{background:#e6eef7}
pre{overflow:auto;background:#14273e;color:#eef6ff;padding:18px;border-radius:8px;line-height:1.45}
code{font-family:ui-monospace,monospace;font-size:.9em}p code,li code,td code{background:#e9eff6;padding:1px 4px;border-radius:3px}
li{margin:.35em 0}blockquote{border-left:4px solid var(--line);padding-left:18px;margin-left:0}
@media(max-width:650px){main{padding:18px 12px}header,section,nav{padding:18px 16px}body{font-size:16px}header h1{font-size:1.8rem}h1{font-size:1.65rem}}
@media print{body{background:white;font-size:10pt}main,section{max-width:none;padding:0;border:0}header{background:white;color:var(--ink);padding:0}nav{display:none}section{break-before:page}pre{white-space:pre-wrap;background:#f0f3f7;color:var(--ink)}table{display:table;font-size:8pt}h1,h2,h3{break-after:avoid}tr{break-inside:avoid}}
'''
output = ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1">'
    '<title>NES Forge — Project Tutorials</title><style>' + STYLE + '</style></head><body><main>'
    '<header><p class="meta">Developer tutorials · 2026-10-25</p><h1>NES Forge project tutorials</h1>'
    '<p>Learn the shared tools, then the method each imported game actually uses.</p>'
    '<p>Punch-Out is the current worked lesson. Earlier title notes retain their checkpoint scope; '
    'their inclusion does not establish fresh acceptance or complete game recovery.</p></header>'
    '<nav aria-label="Book contents"><h2>Choose a lesson</h2>' + ''.join(navigation) + '</nav>'
    + ''.join(chapters) + '</main></body></html>\n')
# The in-app reader consumes the same rendered chapters and anchors as the book.
# Escape '<' so documentation examples cannot close the standalone script tag.
data = {'format': 'NESForgeProjectLessons', 'version': 1, 'chapters': lesson_data}
script = ('/* Generated by app/tools/render_project_tutorials.py from maintained docs.\n'
    ' * Read-only lesson content, not project assets or runtime data. Do not hand edit. */\n'
    'Forge.services.ProjectLessonData = Object.freeze(' + json.dumps(data, ensure_ascii=True).replace('<', '\\u003c') + ');\n')
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
for target, content in [(DOCS / 'PROJECT_HANDBOOK.html', output), (ROOT / 'app/src/docs/project-lessons-data.js', script)]:
    if args.check:
        assert target.read_bytes() == content.encode(), f'Out of date: {target}'
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)
print(f'{"Checked" if args.check else "Rendered"} {len(CHAPTERS)} chapters and synthetic exercise: book + in-app lessons')
