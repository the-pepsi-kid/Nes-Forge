"""Render the kit's Markdown guides with navigation and a chapter list.

Requires Pandoc on PATH. START_HERE.html is authored separately and is never
overwritten by this script. Historical source snapshots are never rewritten.
"""

from pathlib import Path
import html
import re
import subprocess

HERE = Path(__file__).resolve().parent


def pages():
    names = ["Tutorial.md", "NEXT_STEPS.md", "KNOWN_LIMITS.md", "Manual.md"]
    return [HERE / n for n in names] + sorted((HERE / "Reference").glob("*.md")) + sorted((HERE / "Reference/Current_Release_Docs").glob("*.md"))


def render(source, all_outputs):
    body = subprocess.check_output(["pandoc", "--from=gfm-tex_math_dollars", "--to=html5", str(source)], text=True)
    out = source.with_suffix(".html")
    depth = len(source.relative_to(HERE).parts) - 1
    prefix = "../" * depth
    # Convert only Markdown destinations that are rendered in this pass.
    def link(match):
        target = html.unescape(match.group(1))
        path, sep, anchor = target.partition("#")
        resolved = (source.parent / path).resolve()
        if path.endswith(".md") and resolved.with_suffix(".html") in all_outputs:
            target = path[:-3] + ".html" + (sep + anchor if sep else "")
        return 'href="' + html.escape(target, quote=True) + '"'
    body = re.sub(r'href="([^"]+)"', link, body)
    body = re.sub(r'(<table(?:\s[^>]*)?>.*?</table>)', r'<div class="table-wrap">\1</div>', body, flags=re.S)
    if "Current_Release_Docs" in source.parts:
        body = '<blockquote><p><strong>Feature guide from the alpha.11 source package.</strong> Some inherited version headings and test totals describe earlier milestones. They are not current acceptance results. Development source and example paths mentioned here may require the full source checkout. Use the <a href="../Alpha11_Updates.html">alpha.11 usage updates</a> for the kit overview.</p></blockquote>' + body
    headings = re.findall(r'<h([12]) id="([^"]+)">(.*?)</h\1>', body, re.S)
    title = re.sub('<[^>]+>', '', headings[0][2]) if headings else source.stem.replace('_', ' ')
    title = html.unescape(title)
    toc = ''.join('<a class="level' + level + '" href="#' + ident + '">' + text + '</a>' for level, ident, text in headings)
    nav = [("START_HERE.html", "Start here"), ("NES_Forge.html", "Open NES Forge ↗"), ("Tutorial.html", "Tutorial"), ("Manual.html", "Manual"), ("Reference/Operator_Reference.html", "Controls"), ("Feedback_Template.txt", "Feedback")]
    links = ''.join('<a href="' + prefix + href + '"' + (' target="_blank" rel="noopener"' if href == 'NES_Forge.html' else '') + '>' + label + '</a>' for href, label in nav)
    if source.name in {"Tutorial.md", "Manual.md", "Operator_Reference.md"}:
        links += '<a href="' + source.stem + '.pdf">Printable PDF</a>'
    doc = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + html.escape(title) + ' · NES Forge alpha.11</title><link rel="stylesheet" href="' + prefix + 'style.css"></head><body><a class="skip" href="#guide">Skip to guide</a><header class="top"><strong>NES FORGE</strong><small>2.0.0-alpha.11 / source-intake-1 · Alpha Test Kit RC2</small><nav aria-label="Kit guides">' + links + '</nav></header><div class="layout"><aside class="toc" aria-label="Chapters"><strong>CONTENTS</strong>' + toc + '</aside><main id="guide">' + body + '<p class="stamp">NES Forge alpha.11 · Kit RC2 · <a href="' + prefix + 'START_HERE.html">Back to start</a></p></main></div></body></html>\n'
    out.write_text(doc, encoding="utf-8")
    return out


if __name__ == "__main__":
    sources = pages()
    outputs = {s.with_suffix(".html").resolve() for s in sources}
    for source in sources:
        print(render(source, outputs).relative_to(HERE))
