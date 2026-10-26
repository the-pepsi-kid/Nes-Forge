"""Stage capture schema, persistence and access tests. Synthetic raster; never ships ROM screenshots."""
import asyncio, base64, hashlib, io, json, secrets, subprocess, sys, tempfile, time
from pathlib import Path
from PIL import Image, ImageDraw
import requests

root=Path(__file__).resolve().parents[1]; base='http://127.0.0.1:8765'; token=secrets.token_urlsafe(24)
headers={'X-Forge-Admin':token}; original=json.loads((root/'tests/synthetic_snapshot.json').read_text())
img=Image.new('RGBA',(256,240),(43,65,91,255)); d=ImageDraw.Draw(img)
for i in range(0,256,8):d.rectangle((i,185,i+4,220),fill=(70+(i//8)%3*14,97,112,255))
f=io.BytesIO();img.save(f,format='PNG');payload='data:image/png;base64,'+base64.b64encode(f.getvalue()).decode()
checks={}

def get(path,**kwargs):return requests.get(base+path,timeout=3,**kwargs)
def post(path,**kwargs):return requests.post(base+path,timeout=3,**kwargs)
def start(db):
 p=subprocess.Popen([sys.executable,str(root/'host/server.py'),'--db',str(db),'--admin-token',token],stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 for i in range(60):
  try:
   if get('/api/health').status_code==200:return p
  except Exception:time.sleep(.08)
 raise AssertionError('Host failed to start')

with tempfile.TemporaryDirectory() as tmp:
 db=Path(tmp)/'world.db';p=start(db)
 try:
  r=post('/api/admin/world',headers=headers,json=original);assert r.ok,r.text
  rev=r.json()['revision'];x,y=4,6
  request={'format':'nesforge.hosted-stage-frame','version':1,'expectedRevision':rev,'sourceWorldId':original['sourceWorldId'],'x':x,'y':y,'captureMethod':'emulator-visible-frame','png':payload}
  checks['wallet_player_cannot_publish_without_admin_token']=post('/api/admin/stage-frame',json=request).status_code==401
  malformed={**request,'png':'data:image/png;base64,notpng'}
  checks['malformed_png_rejected']=post('/api/admin/stage-frame',headers=headers,json=malformed).status_code==400
  wrong_size=io.BytesIO();Image.new('RGBA',(128,240)).save(wrong_size,format='PNG')
  checks['wrong_size_rejected']=post('/api/admin/stage-frame',headers=headers,json={**request,'png':'data:image/png;base64,'+base64.b64encode(wrong_size.getvalue()).decode()}).status_code==400
  checks['stale_world_revision_rejected']=post('/api/admin/stage-frame',headers=headers,json={**request,'expectedRevision':'0'*64}).status_code==409
  checks['off_map_coordinates_rejected']=post('/api/admin/stage-frame',headers=headers,json={**request,'x':-2}).status_code==400
  checks['unbound_place_has_no_frame']=get('/api/stage-frame?x=3&y=6').status_code==404
  r=post('/api/admin/stage-frame',headers=headers,json=request)
  checks['admin_frame_publish_succeeds']=r.status_code==200
  if not r.ok:print(r.text)
  frame=get('/api/stage-frame?x=4&y=6').json()
  checks['png_bytes_identical']=frame['png']==payload and frame['sha256']==hashlib.sha256(f.getvalue()).hexdigest()
  checks['no_false_native_scene_claim']=frame['nativeSceneVerified'] is False and frame['captureMethod']=='emulator-visible-frame'
  meta=get('/api/admin/state',headers=headers).json()['stageFrames']
  checks['players_see_stage_metadata_without_image_broadcast']=len(meta)==1 and set(meta[0])=={'x','y','revision','captureMethod'}
  checks['three_independent_clients_receive_identical_frame']=all(get('/api/stage-frame?x=4&y=6').json()['png']==payload for _ in range(3))
  state=get('/api/admin/state',headers=headers).json()
  checks['admin_audit_entry']=any(entry['action']=='stage-frame-captured' for entry in state['audit'])
  p.terminate();p.wait(timeout=5);p=start(db)
  checks['stage_persists_after_restart']=get('/api/stage-frame?x=4&y=6').json()['sha256']==frame['sha256']
  modified=json.loads(json.dumps(original));modified['terrain'][14]=9 if original['terrain'][14]!=9 else 5
  r=post('/api/admin/world',headers=headers,json=modified)
  checks['new_hosted_world_resets_old_stage_references']=r.ok and get('/api/stage-frame?x=4&y=6').status_code==404
 finally:
  if p.poll() is None:p.terminate();p.wait(timeout=5)
print(json.dumps(checks,indent=2));assert all(checks.values()),checks
