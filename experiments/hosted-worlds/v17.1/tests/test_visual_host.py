import os
"""End-to-end localhost API and browser-rendered visual parity, with no ROM artifacts in output."""
import sys, json, subprocess, requests, tempfile, time, hashlib, os
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
base='http://127.0.0.1:8765';token='visual-parity-testing-token';headers={'X-Forge-Admin':token}
original=json.loads((Path(os.environ.get('NES_FORGE_HOSTED_SNAPSHOT_JSON',str(root/'tests/synthetic_snapshot.json')))).read_text())
checks={};errors=[]
with tempfile.TemporaryDirectory() as td:
 proc=subprocess.Popen([sys.executable,str(root/'host/server.py'),'--db',str(Path(td)/'host.sqlite3'),'--admin-token',token],stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 try:
  for n in range(80):
   try:
    if requests.get(base+'/api/health',timeout=.4).ok:break
   except requests.exceptions.RequestException:time.sleep(.1)
  else:raise RuntimeError('localhost host did not come online')
  res=requests.post(base+'/api/admin/world',headers=headers,json=original,timeout=4);res.raise_for_status()
  state=requests.get(base+'/api/admin/state',headers=headers).json()
  checks['v2_world_art_saved']=state['world']['version']==2 and state['world']['art']==original['art']
  checks['same_source_digest']=state['world']['sourceDigest']==original['sourceDigest']
  bad=json.loads(json.dumps(original));bad['art']['png']='data:image/png;base64,'+'A'*100
  res=requests.post(base+'/api/admin/world',headers=headers,json=bad);checks['invalid_atlas_rejected']=res.status_code==400
  # Check old format still imports as an explicit abstract view for compatibility.
  legacy={k:v for k,v in original.items() if k!='art'};legacy['version']=1
  checks['v1_is_still_compatible']=requests.post(base+'/api/admin/world',headers=headers,json=legacy).status_code==200
  requests.post(base+'/api/admin/world',headers=headers,json=original).raise_for_status()
  state=requests.get(base+'/api/admin/state',headers=headers).json();rev=state['revision']
  # Choose a tile safely away from spawn + reject edits to saved player cell.
  index=5*64+29
  if original['terrain'][index]==6:index=5*64+30
  newtile=6
  if original['terrain'][index]==6:newtile=5
  patch={'format':'nesforge.world.patch','version':1,'expectedRevision':rev,'sourceWorldId':original['sourceWorldId'],'changes':[{'index':index,'value':newtile}]}
  res=requests.post(base+'/api/admin/patch',headers=headers,json=patch);res.raise_for_status();patched=res.json()
  checks['terrain_patch_changes_one_cell']=patched['changed']==1
  state=requests.get(base+'/api/admin/state',headers=headers).json()
  checks['terrain_patch_keeps_atlas_and_source']=state['world']['terrain'][index]==newtile and state['world']['art']==original['art']
  checks['patch_changes_revision']=state['revision']!=rev
  checks['stale_revision_rejected']=requests.post(base+'/api/admin/patch',headers=headers,json=patch).status_code==409
  checks['patch_audit_journal']=any(j['action']=='world-patch' for j in state['audit'])
  # image render twice independently in Chromium, with the actual authoritative server snapshot.
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
   scripts=(root/'host/render-world.js').read_text()
   # per client gets identical state bytes, no injected rendering-specific fallback
   captures=[]
   for i in (1,2):
    page=browser.new_page(viewport={'width':1220,'height':830});page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content('''<!doctype html><html><head><style>body{background:#08151e;color:#c8e5df;font:14px monospace}canvas{image-rendering:pixelated;width:800px}</style></head><body><h2>NES Forge Z2 hosted render — client '''+str(i)+'''</h2><canvas id="world"></canvas></body></html>''')
    page.add_script_tag(content=scripts)
    info=page.evaluate('''async(world)=>{let c=document.getElementById('world'),ready=false;await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('PNG decode timeout')),10000);function tryRender(){ready=ForgeHostedRenderer.draw(c,world,{onArtReady:tryRender});if(ready){clearTimeout(timeout);resolve();}}tryRender();});const ctx=c.getContext('2d');const samples=[[0,0],[33,61],[120,202],[480,340],[800,500]].map(([x,y])=>[...ctx.getImageData(x,y,1,1).data]);return {width:c.width,height:c.height,samples,ready};}''',state)
    checks[f'client_{i}_source_art_loaded']=info['ready'] and info['width']==1024 and info['height']==original['height']*16
    captures.append(info['samples'])
    if i==1:page.screenshot(path=str(root/'NES_Forge_3x_Hosted_Visual_Parity.png'))
    page.close()
   checks['two_independent_renderers_match']=captures[0]==captures[1]
   browser.close()
  print(json.dumps({'checks':checks,'browserErrors':errors,'worldRevision':state['revision'],'atlasBytes':len(original['art']['png'])},indent=2))
 finally:
  proc.terminate();proc.wait(timeout=6)
assert all(checks.values()) and not errors,(checks,errors)
