from pathlib import Path
import json,subprocess,hashlib
r=Path(__file__).resolve().parents[2];v=Path(__file__).resolve().parent;out=v/'gate';out.mkdir(exist_ok=True)
html=r/'app/mainline/NES_Forge_2.0.0-alpha.11.html';identity=hashlib.sha256(html.read_bytes()).hexdigest()
suites=[s['name'] for s in json.loads((r/'reviews/river-city-1/gate/Summary.json').read_text())['suites']]+['shadowgate']
results=[]
for name in suites:
 target=r/'app/tests'/f'{name}.cjs';assert target.is_file(),target
 with (out/(name+'.log')).open('w') as log:
  result=subprocess.run(['node',str(target),str(html),str(out/(name+'.json'))],cwd=r,stdout=log,stderr=subprocess.STDOUT)
 d=json.loads((out/(name+'.json')).read_text()) if (out/(name+'.json')).exists() else {}
 assert hashlib.sha256(html.read_bytes()).hexdigest()==identity
 item={'name':name,'status':'passed' if result.returncode==0 and d.get('passed')==d.get('total') and d.get('total',0)>0 and d.get('htmlSha256',identity)==identity else 'failed','exitCode':result.returncode,'passed':d.get('passed',0),'total':d.get('total',0)}
 results.append(item);print(item,flush=True)
summary={'scope':'Focused Shadowgate picture/audio and retained River City/Lolo/Metroid/source/audio compatibility; not a full release gate','htmlSha256':identity,'status':'passed' if all(s['status']=='passed' for s in results) else 'failed','passed':sum(s['passed'] for s in results),'total':sum(s['total'] for s in results),'suites':results}
(out/'Summary.json').write_text(json.dumps(summary,indent=2)+'\n')
raise SystemExit(0 if summary['status']=='passed' else 1)
