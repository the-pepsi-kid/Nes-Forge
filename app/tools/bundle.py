"""Deterministically concatenate required source parts into a standalone HTML."""
from pathlib import Path
import argparse
import hashlib
import json
import os

root = Path(__file__).resolve().parents[1]
args = argparse.ArgumentParser()
args.add_argument('--check', action='store_true')
opts = args.parse_args()
manifest = json.loads((root/'source-manifest.json').read_text(encoding='utf-8'))
parts = manifest['parts']
if len(parts) != len(set(parts)):
    raise SystemExit('Duplicate source part in manifest')
payloads = []
inputs = []
for name in parts:
    path = (root/name).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise SystemExit('Missing or invalid required source: '+name)
    data = path.read_bytes()
    payloads.append(data)
    inputs.append({'path':name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
out = b''.join(payloads)
target = root/manifest['output']
digest = hashlib.sha256(out).hexdigest()
if opts.check:
    if not target.is_file() or target.read_bytes() != out:
        raise SystemExit('Bundled HTML differs from authoritative sources')
else:
    target.parent.mkdir(parents=True,exist_ok=True)
    temporary = target.with_suffix('.html.tmp')
    temporary.write_bytes(out)
    os.replace(temporary,target)
    (root/'build-inputs.json').write_text(json.dumps({'release':manifest['release'],'output':manifest['output'],'sha256':digest,'inputs':inputs},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'output':str(target),'sha256':digest,'bytes':len(out),'checked':opts.check}))
