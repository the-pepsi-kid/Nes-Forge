"""Frozen-input, one-worker checks available in the recovered source snapshot."""
from pathlib import Path
import hashlib,json,subprocess
r=Path(__file__).resolve().parents[2];v=Path(__file__).resolve().parent;out=v/'gate';out.mkdir(exist_ok=True)
html=r/'app/mainline/NES_Forge_2.0.0-alpha.11.html';identity=hashlib.sha256(html.read_bytes()).hexdigest()
names=['native-lolo-resources','native-metroid-resources','metroid-audio','lolo-audio','river-city','shadowgate','native-audio-library','punch-out']
results=[]
for name in names:
 target=r/'app/tests'/f'{name}.cjs'
 with (out/(name+'.log')).open('w') as log:
  p=subprocess.run(['node',str(target),str(html),str(out/(name+'.json'))],cwd=r,stdout=log,stderr=subprocess.STDOUT)
 d=json.loads((out/(name+'.json')).read_text()) if (out/(name+'.json')).exists() else {}
 assert hashlib.sha256(html.read_bytes()).hexdigest()==identity
 item={'name':name,'status':'passed' if p.returncode==0 and d.get('passed')==d.get('total') and d.get('total',0)>0 and d.get('htmlSha256',identity)==identity else 'failed','exitCode':p.returncode,'passed':d.get('passed',0),'total':d.get('total',0)}
 results.append(item);print(item,flush=True)
report={'scope':'Eight public suites present in the restored source snapshot; not the historical 25-suite gate or a full release gate. Historical results remain archived, not counted as current reruns.','htmlSha256':identity,'status':'passed' if all(s['status']=='passed' for s in results) else 'failed','passed':sum(s['passed'] for s in results),'total':sum(s['total'] for s in results),'suites':results}
(out/'Summary.json').write_text(json.dumps(report,indent=2)+'\n')
raise SystemExit(0 if report['status']=='passed' else 1)
