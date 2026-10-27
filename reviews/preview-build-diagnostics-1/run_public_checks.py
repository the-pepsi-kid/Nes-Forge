"""Retained public checks on each exact output; private gameplay acceptance separate."""
from pathlib import Path
import subprocess,hashlib,json,os
root=Path(__file__).resolve().parents[2];here=Path(__file__).resolve().parent
suites=['native-lolo-resources','native-metroid-resources','metroid-audio','lolo-audio','river-city','shadowgate','native-audio-library','punch-out','mmc2-prefetch']
for label,html in [('native',root/'nes-forge.html'),('hosted',root/'experiments/hosted-worlds/v17.1/NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html')]:
 out=here/('gate' if label=='native' else 'gate-hosted');out.mkdir(exist_ok=True);results=[]
 for name in suites:
  destination=out/(name+'.json');env={**os.environ,'FORGE_TEST_REPORT':str(destination)}
  p=subprocess.run(['node',str(root/'app/tests'/(name+'.cjs')),str(html),str(destination)],capture_output=True,text=True,env=env)
  (out/(name+'.log')).write_text(p.stdout+p.stderr);data=json.loads(destination.read_text())
  assert p.returncode==0 and data['passed']==data['total'],name
  results.append({'name':name,'exitCode':p.returncode,'passed':data['passed'],'total':data['total'],'status':'passed'})
  print(label+' '+name+': '+str(data['passed'])+'/'+str(data['total']),flush=True)
 p=subprocess.run(['node',str(root/'app/docs/native-codec-exercise.cjs')],capture_output=True,text=True);assert p.returncode==0
 (out/'synthetic-codec-exercise.log').write_text(p.stdout+p.stderr)
 report={'status':'passed','htmlSha256':hashlib.sha256(html.read_bytes()).hexdigest(),'passed':sum(v['passed'] for v in results),'total':sum(v['total'] for v in results),'suites':results,'scope':'Retained public suites and synthetic codec exercise; not the missing full historical release gate or private gameplay acceptance.'}
 (out/'Summary.json').write_text(json.dumps(report,indent=2)+'\n')
