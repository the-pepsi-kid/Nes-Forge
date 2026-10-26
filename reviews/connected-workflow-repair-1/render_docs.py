"""Refresh the offline developer reference with its existing stylesheet."""
from pathlib import Path
import re
import markdown2
root = Path(__file__).resolve().parents[2]
docs = root / 'app/docs'
target = docs / 'NATIVE_RECOVERY_TUTORIAL.html'
style = re.search(r'<style>(.*?)</style>', target.read_text(), re.S)[1]
body = markdown2.markdown((docs / 'NATIVE_RECOVERY_TUTORIAL.md').read_text(), extras=['tables', 'fenced-code-blocks', 'header-ids', 'toc'])
target.write_text('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NES Forge Developer and Asset Workflows</title><style>'+style+'</style></head><body><main><p class="meta">Developer reference · Connected native workflows / modular Retro Workstation</p><nav aria-label="Contents"><strong>Contents</strong>'+body.toc_html+'</nav>'+body+'</main></body></html>\n')
