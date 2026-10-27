"""Deterministically concatenate required source parts into a standalone HTML."""
from pathlib import Path
import argparse
import hashlib
import json
import os

root = Path(__file__).resolve().parents[1]
args = argparse.ArgumentParser()
args.add_argument('--check', action='store_true')
args.add_argument('--manifest', default='source-manifest.json', help='Manifest relative to app; defaults preserve the native editor build')
opts = args.parse_args()
manifest_path = (root/opts.manifest).resolve()
if not manifest_path.is_relative_to(root):
    raise SystemExit('Manifest must be inside app')
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
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
target = (root/manifest['output']).resolve()
inputs_target = (root/manifest.get('inputsOutput', 'build-inputs.json')).resolve()
if not target.is_relative_to(root.parent) or not inputs_target.is_relative_to(root):
    raise SystemExit('Build output must stay in the checkout; input inventory must stay in app')
digest = hashlib.sha256(out).hexdigest()
if opts.check:
    if not target.is_file() or target.read_bytes() != out:
        raise SystemExit('Bundled HTML differs from authoritative sources')
else:
    target.parent.mkdir(parents=True,exist_ok=True)
    temporary = target.with_suffix('.html.tmp')
    temporary.write_bytes(out)
    os.replace(temporary,target)
    inputs_target.write_text(json.dumps({'release':manifest['release'],'output':manifest['output'],'sha256':digest,'inputs':inputs},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'output':str(target),'sha256':digest,'bytes':len(out),'checked':opts.check}))
