"""Render the standalone developer guide with the retained offline stylesheet."""
from pathlib import Path
import argparse
import re
import markdown2

ROOT=Path(__file__).resolve().parents[2]
STYLE = 'body{margin:0;background:#f5f7fa;color:#172238;font:17px/1.65 system-ui,sans-serif}main{max-width:1080px;margin:auto;padding:36px 28px 80px}h1,h2,h3{line-height:1.25;scroll-margin-top:24px}h1{font-size:2.25rem}h2{margin-top:2.2em;padding-top:1em;border-top:1px solid #ccd5e1}a{color:#124d9a}table{border-collapse:collapse;display:block;overflow-x:auto;width:100%;font-size:.9rem;margin:1.4em 0}th,td{border:1px solid #bbc8d8;padding:10px;vertical-align:top;text-align:left}th{background:#e3ebf5}pre{overflow:auto;background:#132136;color:#eaf3ff;padding:18px;border-radius:8px;line-height:1.45}code{font-family:ui-monospace,monospace;font-size:.9em}p code,li code,td code{background:#e5ebf3;padding:1px 4px;border-radius:3px}nav{border:1px solid #bdcddd;background:#fff;padding:20px;border-radius:8px;margin:28px 0}nav ul{padding-left:24px}.meta{font-size:.9rem;color:#53647a}@media(max-width:650px){main{padding:22px 16px}body{font-size:16px}h1{font-size:1.8rem}}@media print{body{background:white;font-size:10pt}main{max-width:none;padding:0}nav{display:none}pre{white-space:pre-wrap;background:#f1f3f6;color:#172238}table{display:table;font-size:8pt}h2,h3{break-after:avoid}tr,pre{break-inside:avoid}}'

def render():
    source=ROOT/'app/docs/NATIVE_RECOVERY_TUTORIAL.md'
    body=str(markdown2.markdown(source.read_text(),extras=['tables','fenced-code-blocks','header-ids']))
    headings=re.findall(r'<h2 id="([^"]+)">(.*?)</h2>',body,re.S)
    nav='<nav aria-label="Developer guide contents"><strong>Contents</strong><ul>'+''.join('<li><a href="#'+key+'">'+label+'</a></li>' for key,label in headings)+'</ul></nav>'
    title=re.search(r'</h1>',body)
    if title:body=body[:title.end()]+'<p class="meta">Developer reference · Connected native workflows / modular Retro Workstation</p>'+nav+body[title.end():]
    return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NES Forge Developer and Asset Workflows</title><style>'+STYLE+'</style></head><body><main>'+body+'</main></body></html>\n'

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');args=parser.parse_args()
    path=ROOT/'app/docs/NATIVE_RECOVERY_TUTORIAL.html';output=render()
    if args.check:assert path.read_text()==output,'Developer guide is out of date'
    else:path.write_text(output)
    print(('Checked' if args.check else 'Rendered')+' developer guide: '+str(len(output.encode()))+' bytes')
