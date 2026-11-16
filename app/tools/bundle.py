"""Assemble the editor and its launch aliases from a single source list."""
from pathlib import Path
from tempfile import NamedTemporaryFile
import argparse
import hashlib
import json
import os

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--check', action='store_true')
parser.add_argument('--manifest', default='source-manifest.json')
args = parser.parse_args()

def inside(directory, path):
    path = path.resolve()
    if not path.is_relative_to(directory):
        raise SystemExit('Path outside the build root: '+str(path))
    return path

def encode(value):
    return (json.dumps(value, indent=2)+'\n').encode()

def publish(path, data):
    if args.check:
        if not path.is_file() or path.read_bytes()!=data:
            raise SystemExit('Build output differs from authoritative parts: '+str(path))
        return
    path.parent.mkdir(parents=True,exist_ok=True)
    with NamedTemporaryFile(dir=path.parent,delete=False) as tmp:
        tmp.write(data)
    try:
        os.chmod(tmp.name,0o644)
        os.replace(tmp.name,path)
    finally:
        Path(tmp.name).unlink(missing_ok=True)

requested = inside(root, root/args.manifest)
legacy = requested == root/'hosted-source-manifest.json'
source = root/'source-manifest.json' if legacy else requested
manifest = json.loads(source.read_text())
parts = manifest['parts']
if len(parts)!=len(set(parts)):
    raise SystemExit('Duplicate source part in manifest')
inputs, chunks = [], []
for name in parts:
    path=inside(root, root/name)
    if not path.is_file():raise SystemExit('Missing source: '+name)
    data=path.read_bytes()
    inputs.append({'path':name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
    chunks.append(data)
output=b''.join(chunks)
digest=hashlib.sha256(output).hexdigest()
targets=[manifest['output'],*manifest.get('mirrors',[])]
pairs=[(targets[0],manifest.get('inputsOutput','build-inputs.json'))]
files={}
hosted=manifest.get('hostedMirror')
if hosted:
    targets.append(hosted['output'])
    pairs.append((hosted['output'],hosted['inputsOutput']))
    compat={k:manifest[k] for k in ('format','version','release')}
    compat.update(**hosted,parts=parts,generatedFrom=source.name)
    files[root/'hosted-source-manifest.json']=encode(compat)
for target in targets:
    files[inside(root.parent,root/target)]=output
for target,inventory in pairs:
    files[inside(root,root/inventory)]=encode({'release':manifest['release'],'output':target,'sha256':digest,'inputs':inputs})
coverage = manifest.get('recoveryCoverage')
if coverage:
    # The same checked source data feeds the offline editor and both ledger paths.
    text = inside(root, root/coverage['source']).read_text(encoding='utf-8')
    begin = '/* RECOVERY_COVERAGE_BEGIN */'
    end = '/* RECOVERY_COVERAGE_END */'
    if text.count(begin)!=1 or text.count(end)!=1:
        raise SystemExit('Recovery coverage must have one canonical JSON block')
    ledger = json.loads(text.split(begin,1)[1].split(end,1)[0])
    records = ledger['projects']
    hashes = [record['sha256'] for record in records]
    if len(records)!=len(set(hashes)) or ledger['inputFiles']!=len(records):
        raise SystemExit('Recovery coverage source identities differ')
    if ledger['titleGroups']!=len({record['titleId'] for record in records}):
        raise SystemExit('Recovery coverage title count differs')
    for record in records:
        if not record['gaps'] or not record['evidence'] or record['fullRecovery']:
            raise SystemExit('Recovery coverage must retain its evidence and unresolved domains')
    for target in coverage['outputs']:
        files[inside(root.parent, root/target)] = encode(ledger)
for path,data in files.items():
    publish(path,data)
target=hosted['output'] if legacy and hosted else targets[0]
print(json.dumps({'output':str((root/target).resolve()),'sha256':digest,'bytes':len(output),'parts':len(parts),'checked':args.check}))
