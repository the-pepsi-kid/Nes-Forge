"""Render a self-contained review document and verify its internal navigation."""
from pathlib import Path
from html.parser import HTMLParser
import csv
import hashlib
import json
import markdown2

review = Path(__file__).resolve().parent
root = review.parents[1]
source = review / 'REVIEW.md'
body = markdown2.markdown(source.read_text(), extras=['tables', 'fenced-code-blocks', 'header-ids', 'toc'])
style = '''
:root{color-scheme:light;--ink:#182638;--accent:#174d77;--line:#becbd7}
*{box-sizing:border-box}body{margin:0;background:#edf2f6;color:var(--ink);font:16px/1.65 system-ui,sans-serif}
main{max-width:1160px;margin:auto;padding:30px 28px 80px}header{background:#152b40;color:#edf6ff;padding:24px 28px;border-radius:10px;margin-bottom:24px}
header p{margin:5px 0}header strong{font-size:24px}header small{color:#b9d3e8}article,nav{background:#fff;border:1px solid var(--line);border-radius:8px;padding:24px 28px}
nav{margin:20px 0 28px}nav>ul{columns:2;column-gap:30px}nav li{break-inside:avoid}nav ul{padding-left:20px}nav a{font-size:13px}a{color:#135f99}
h1,h2,h3{line-height:1.3;scroll-margin-top:20px}h1{font-size:30px}h2{font-size:24px;border-top:2px solid #c4d3df;padding-top:22px;margin-top:38px}h3{font-size:19px;margin-top:30px}
table{display:block;overflow:auto;border-collapse:collapse;width:100%;margin:18px 0 24px;font-size:14px}th,td{border:1px solid #b9c9d6;padding:10px 12px;text-align:left;vertical-align:top}th{background:#e2ecf4}tr:nth-child(even){background:#f7fafc}
code{font:13px/1.5 ui-monospace,monospace;overflow-wrap:anywhere}p code,li code,td code{background:#edf2f6;padding:2px 4px;border-radius:3px}pre{overflow:auto;background:#152b40;color:#edf6ff;padding:18px;border-radius:6px}
blockquote{margin:20px 0;padding:12px 18px;border-left:4px solid #22668e;background:#eef5fa}blockquote p{margin:0}
@media(max-width:720px){main{padding:12px 10px 50px}header,article,nav{padding:18px 16px}nav>ul{columns:1}h1{font-size:25px}h2{font-size:21px}body{font-size:15px}}
@media print{body{background:white}main{max-width:none;padding:0}article,nav{border:0;padding:0}header{border-radius:0}h2,h3{break-after:avoid}tr,blockquote{break-inside:avoid}table{display:table;font-size:10px}th,td{padding:6px}code{font-size:10px}}
'''
html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NES Forge Connected Workflow Review</title><style>'+style+'</style></head><body><main><header><strong>NES Forge · Connected workflow review</strong><p>Read-only audit · October 25, 2026 · Reviewed runtime unchanged</p><small>Findings, shared-resource delineation, source evidence and a bounded repair sequence</small></header><nav aria-label="Review contents"><strong>Contents</strong>'+body.toc_html+'</nav><article>'+body+'</article></main></body></html>\n'
target = review / 'REVIEW.html'
target.write_text(html)

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.hrefs, self.external_runtime = [], [], []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            self.ids.append(a['id'])
        if tag == 'a' and 'href' in a:
            self.hrefs.append(a['href'])
        if tag in {'script', 'link', 'iframe', 'img'} and ('src' in a or 'href' in a):
            self.external_runtime.append(a)

parser = Links()
parser.feed(html)
assert len(parser.ids) == len(set(parser.ids))
assert all(href.startswith('#') and href[1:] in parser.ids for href in parser.hrefs)
assert not parser.external_runtime
observations = json.loads((review / 'Workflow_Observations.json').read_text())
assert observations['status'] == 'completed' and len(observations['observations']) == 18
report = {'status': 'passed', 'htmlSha256': hashlib.sha256((root / 'nes-forge.html').read_bytes()).hexdigest(),
          'reviewHtmlSha256': hashlib.sha256(target.read_bytes()).hexdigest(),
          'reviewHtmlBytes': target.stat().st_size, 'internalLinks': len(parser.hrefs),
          'missingAnchors': 0, 'duplicateIds': 0, 'externalRuntimeDependencies': 0,
          'validationScope': 'Document structure, navigation and evidence identity; not a browser layout check.'}
(review / 'Document_Verification.json').write_text(json.dumps(report, indent=2) + '\n')
rows = [
('WF-01','P1','Native build controls','R08','Include first 7 invalidates native build','Backend-aware applicable actions','Native no-op stays buildable after every offered default action'),
('WF-02','P1','Mode and capabilities','R04;R06','Editable native project labeled inspection-only; Z2 guidance dominates','Read-only capability projection from existing owners','Intake/ribbon/library/preflight agree for authored, native and inspection modes'),
('WF-03','P1','Native relationships','R06;R07;R09','Pose/art source and physical writer links missing','Project existing markers into common context/graph','Source, writer and known consumers discoverable without inferred runtime bindings'),
('WF-04','P1','Shared resources','R05;P04;P05','Whole shared bank appears without pose footprint or clear copy/writer role','Used-by-selection and whole-bank views; palette/flip and source/output scopes','Predict tile-level edit impact and coverage; snapshots remain protected'),
('WF-05','P2','Editor navigation','R01;R03','Resources follows another Scene; Gameplay shortcut stops in Scene','Resolve exact active-editor resource and expose destination','Pose/clip/tile/actor shortcuts land on the exact asset and panel'),
('WF-06','P2','Fresh reopen','R02','Scene B reopens with pose A selected','Validated optional resume/matching selection','Fresh instance has correct pose or explicit matching choice; assets/output unchanged'),
('WF-07','P2','Resource previews','R13','Pose preview absent; other previews use different composition/palette rules','Reuse authoritative read-only renderers with declared preview scope','Matching resource/palette looks consistent across editors and output preview'),
('WF-08','P2','Health and build diagnosis','R10','Zero reference issues does not locate native build block','Separate reference health and current backend diagnostics','Block identifies offending context and supported repair owner'),
('WF-09','P2','Source lifecycle','R11','Previous intake/catalog remains visible and stale-ready','Current versus detached source roles and visible invalidation','Project replacement produces coherent source labels and guarded actions'),
('WF-10','P2','Contextual tutorials','R12','Current Punch-Out workflows absent from Tech Docs','In-app route to current title/asset lesson','Standalone user finds edit/save/build path without chat directions'),
]
with (review / 'ISSUES.csv').open('w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['ID','Priority','Area','Evidence','Observed problem','Recommended repair scope','Acceptance'])
    writer.writerows(rows)
print(json.dumps(report))
