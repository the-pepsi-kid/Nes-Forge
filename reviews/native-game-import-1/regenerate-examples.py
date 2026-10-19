"""Regenerate retained examples in a disposable copy; keep frozen gate inputs intact."""
from pathlib import Path
import subprocess,json,hashlib,time,tempfile,shutil,os
root=Path(__file__).resolve().parents[2];app=root/'app';out=Path(__file__).parent;old=json.loads((root/'reviews/ninja-zelda-re-1/Example_Regeneration.json').read_text());names=[x['path'] for x in old['comparisons']];current={name:(app/name).read_bytes() for name in names};before={name:subprocess.check_output(['git','show','81338252e1f7a2ee8629c2f23f2e4e1d72c23472:app/'+name],cwd=root) for name in names};runs=[];sha=lambda b:hashlib.sha256(b).hexdigest()
with tempfile.TemporaryDirectory(prefix='nf-spatial-examples-') as td:
 copy=Path(td)/'app';shutil.copytree(app,copy,ignore=shutil.ignore_patterns('test-results'))
 for item in old['generatorRuns']:
  command=[os.environ.get('FORGE_NODE','node'),*item['command'][1:]];t=time.time();p=subprocess.run(command,cwd=copy,capture_output=True,text=True);name=Path(command[-1]).stem;(out/(name+'.log')).write_text(p.stdout+p.stderr);assert p.returncode==0,(command,p.stderr);runs.append({'command':command,'exitCode':p.returncode,'seconds':round(time.time()-t,3)});print('Regenerated',name,flush=True)
 comparisons=[]
 for name,a in before.items():
  b=(copy/name).read_bytes();same=a==b;changed=[]
  if not same:
   aa,bb=json.loads(a),json.loads(b);changed=sorted(key for key in set(aa)|set(bb) if aa.get(key)!=bb.get(key));assert changed==['htmlSha256'],(name,changed)
  comparisons.append({'path':name,'beforeSha256':sha(a),'afterSha256':sha(b),'byteIdentical':same,'changedFields':changed});assert (app/name).read_bytes()==current[name]
 assert len(comparisons)==58 and sum(x['byteIdentical'] for x in comparisons)==52
 for entry in comparisons:
  if not entry['byteIdentical']:(app/entry['path']).write_bytes((copy/entry['path']).read_bytes())
 report={'candidate':'native-game-import-1','htmlSha256':sha((app/'mainline/NES_Forge_2.0.0-alpha.11.html').read_bytes()),'scope':'Regenerated in an independent disposable copy. 52 files are byte-identical to the parent; six build receipts change only htmlSha256. Only the six independently reproduced identity receipts are copied back to the candidate; all other outputs remain byte-identical.','generatorRuns':runs,'files':58,'byteIdentical':52,'receiptIdentityOnlyChanges':6,'unchangedRomFiles':15,'unchangedProjects':19,'unchangedRecipes':6,'comparisons':comparisons};(out/'Example_Regeneration.json').write_text(json.dumps(report,indent=2)+'\n');print('52/58 exact; six receipt identities only; six exact reproduced receipts copied back before gate')
