"""One-worker actual-input supplements; no commercial payload output."""
from pathlib import Path
import json,subprocess,sys,hashlib
r=Path(__file__).resolve().parents[2];v=Path(__file__).resolve().parent;private=Path(sys.argv[1]);html=r/'app/mainline/NES_Forge_2.0.0-alpha.11.html';identity=hashlib.sha256(html.read_bytes()).hexdigest()
checks=[('Screens','punch-out-1/verify_screens.cjs',None),('Audio','punch-out-1/verify_audio.cjs',None),('PCM','punch-out-1/verify_pcm.cjs',None),('Boot','punch-out-1/verify_boot.cjs',None),('Retained_Shadowgate_Pictures','shadowgate-1/verify_pictures.cjs','Shadowgate (U).nes'),('Retained_Shadowgate_Audio','shadowgate-1/verify_audio.cjs','Shadowgate (U).nes'),('Retained_River_City_Streets','river-city-1/verify_streets.cjs','River City Ransom (U).nes'),('Retained_River_City_Audio','river-city-1/verify_audio.cjs','River City Ransom (U).nes'),('Retained_Lolo_Rooms','lolo-recovery-1/verify_lolo.cjs','Adventures of Lolo (U) [!].nes'),('Retained_Lolo_Audio','lolo-audio-1/verify_audio.cjs','Adventures of Lolo (U) [!].nes'),('Retained_Metroid_Audio','native-resource-recovery-2/verify_metroid_audio.cjs','Metroid (U).nes')]
rows=[]
for name,script,file in checks:
 out=v/(name+'_Verification.json')
 existing=json.loads(out.read_text()) if out.exists() else {}
 if existing.get('status')=='passed' and existing.get('htmlSha256')==identity:p=type('Retained',(),{'returncode':0})()
 else:
  with (v/(name+'.log')).open('w') as log:p=subprocess.run(['node',str(r/'reviews'/script),str(private/file if file else private),str(out)],cwd=r,stdout=log,stderr=subprocess.STDOUT)
 d=json.loads(out.read_text()) if out.exists() else {};assert hashlib.sha256(html.read_bytes()).hexdigest()==identity
 row={'name':name,'passed':d.get('passed',0),'total':d.get('total',0),'exitCode':p.returncode,'status':'passed' if p.returncode==0 and d.get('passed')==d.get('total') and d.get('htmlSha256')==identity and d.get('total',0)>0 else 'failed'};rows.append(row);print(row,flush=True)
report={'htmlSha256':identity,'status':'passed' if all(c['status']=='passed' for c in rows) else 'failed','checks':rows,'passed':sum(c['passed'] for c in rows),'total':sum(c['total'] for c in rows),'scope':'Supplied-input supplements only. Automated checks are not browser listening or full-game/hardware acceptance.'};(v/'Supplied_Summary.json').write_text(json.dumps(report,indent=2)+'\n');raise SystemExit(0 if report['status']=='passed' else 1)
