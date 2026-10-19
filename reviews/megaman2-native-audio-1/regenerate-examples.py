"""Regenerate retained examples in a disposable copy; keep frozen gate inputs intact."""
from pathlib import Path
import subprocess,json,hashlib,time,tempfile,shutil
root=Path(__file__).resolve().parents[2];app=root/'app';out=Path(__file__).parent;old=json.loads((root/'reviews/audio-discovery-1/Example_Regeneration.json').read_text());names=[x['path'] for x in old['comparisons']];current={name:(app/name).read_bytes() for name in names};before={name:subprocess.check_output(['git','show','819838b3920987c7a47677fd40552bf5a57d5e38:app/'+name],cwd=root) for name in names};runs=[];sha=lambda b:hashlib.sha256(b).hexdigest()
with tempfile.TemporaryDirectory(prefix='nf-mm2-examples-') as td:
 copy=Path(td)/'app';shutil.copytree(app,copy,ignore=shutil.ignore_patterns('test-results'))
 for item in old['generatorRuns']:
  command=item['command'];t=time.time();p=subprocess.run(command,cwd=copy,capture_output=True,text=True);name=Path(command[-1]).stem;(out/(name+'.log')).write_text(p.stdout+p.stderr);assert p.returncode==0,(command,p.stderr);runs.append({'command':command,'exitCode':p.returncode,'seconds':round(time.time()-t,3)});print('Regenerated',name,flush=True)
 comparisons=[]
 for name,a in before.items():
  b=(copy/name).read_bytes();same=a==b;changed=[]
  if not same:
   aa,bb=json.loads(a),json.loads(b);changed=sorted(key for key in set(aa)|set(bb) if aa.get(key)!=bb.get(key));assert changed==['htmlSha256'],(name,changed)
  comparisons.append({'path':name,'beforeSha256':sha(a),'afterSha256':sha(b),'byteIdentical':same,'changedFields':changed});assert (app/name).read_bytes()==current[name]
 assert len(comparisons)==58 and sum(x['byteIdentical'] for x in comparisons)==52
 report={'candidate':'megaman2-audio-1','htmlSha256':sha((app/'mainline/NES_Forge_2.0.0-alpha.11.html').read_bytes()),'scope':'Regenerated in an independent disposable copy. 52 files are byte-identical to the parent; six build receipts change only htmlSha256. Current checked-in files remain untouched by this reproduction.','generatorRuns':runs,'files':58,'byteIdentical':52,'receiptIdentityOnlyChanges':6,'unchangedRomFiles':15,'unchangedProjects':19,'unchangedRecipes':6,'comparisons':comparisons};(out/'Example_Regeneration.json').write_text(json.dumps(report,indent=2)+'\n');print('52/58 exact; six receipt identities only; gate input files unchanged')
