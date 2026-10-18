"""Make Chromium's local PDF hyperlinks relative to the extracted kit.

Requires pypdf. Run after render_pdfs.cjs; the latter calls this automatically.
"""
from pathlib import Path
from urllib.parse import urlsplit, unquote, quote
import os
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, TextStringObject

HERE = Path(__file__).resolve().parent
for name in ("Tutorial.pdf", "Manual.pdf", "Reference/Operator_Reference.pdf"):
    path = HERE / name
    reader = PdfReader(path)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    count = 0
    for page in writer.pages:
        for ref in page.get("/Annots", []):
            action = ref.get_object().get("/A", {})
            uri = action.get("/URI")
            if uri and str(uri).startswith("file:"):
                url = urlsplit(str(uri))
                target = Path(unquote(url.path)).resolve()
                if not target.is_relative_to(HERE):
                    raise ValueError(f"PDF link leaves kit: {name}")
                relative = Path(os.path.relpath(target, path.parent)).as_posix()
                action[NameObject("/URI")] = TextStringObject(quote(relative, safe="/._-") + ("#" + url.fragment if url.fragment else ""))
                count += 1
    temp = path.with_suffix(".portable.pdf")
    with temp.open("wb") as stream:
        writer.write(stream)
    assert len(PdfReader(temp).pages) == len(reader.pages)
    temp.replace(path)
    print(f"{name}: {count} local hyperlinks made portable")
