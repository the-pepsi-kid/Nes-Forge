from pathlib import Path
import subprocess,json,hashlib,time
root=Path(__file__).resolve().parents[2];app=root/'app';out=Path(__file__).parent;old=json.loads((root/'reviews/audio-driver-survey-1/Example_Regeneration.json').read_text());names=[x['path'] for x in old['comparisons']];before={name:subprocess.check_output(['git','show','2bdb4d728089d96ac43e50bf028e0c2907dc5d8c:app/'+name],cwd=root) for name in names};runs=[]
for item in old['generatorRuns']:
 command=item['command'];t=time.time();p=subprocess.run(command,cwd=app,capture_output=True,text=True);name=Path(command[-1]).stem;(out/(name+'.log')).write_text(p.stdout+p.stderr);assert p.returncode==0,(command,p.stderr);runs.append({'command':command,'exitCode':p.returncode,'seconds':round(time.time()-t,3)});print('Regenerated',name,flush=True)
comparisons=[]
for name,a in before.items():
 b=(app/name).read_bytes();same=a==b;changed=[]
 if not same:
  aa,bb=json.loads(a),json.loads(b);changed=sorted(key for key in set(aa)|set(bb) if aa.get(key)!=bb.get(key));assert changed==['htmlSha256'],(name,changed)
 comparisons.append({'path':name,'beforeSha256':hashlib.sha256(a).hexdigest(),'afterSha256':hashlib.sha256(b).hexdigest(),'byteIdentical':same,'changedFields':changed})
identical=sum(x['byteIdentical'] for x in comparisons);assert len(comparisons)==58 and identical==52
report={'candidate':'native-audio-library-1','parentCommit':'2bdb4d728089d96ac43e50bf028e0c2907dc5d8c','htmlSha256':hashlib.sha256((app/'mainline/NES_Forge_2.0.0-alpha.11.html').read_bytes()).hexdigest(),'generatorRuns':runs,'files':len(comparisons),'byteIdentical':identical,'receiptIdentityOnlyChanges':6,'unchangedRomFiles':15,'unchangedProjects':19,'unchangedRecipes':6,'comparisons':comparisons};(out/'Example_Regeneration.json').write_text(json.dumps(report,indent=2)+'\n');print('52/58 byte-identical; six receipt identity changes only',flush=True)
