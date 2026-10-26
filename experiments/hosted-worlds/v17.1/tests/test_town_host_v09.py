"""Bounded town-art and auto-entry host acceptance; uses a local private ROM when present."""
import os,sys,subprocess,tempfile,json,hashlib,asyncio,base64,io,time,uuid
from pathlib import Path
from PIL import Image
from aiohttp.test_utils import TestServer,TestClient
ROOT=Path(__file__).resolve().parents[1];ROM=os.getenv('NES_FORGE_Z2_ROM');assert ROM and Path(ROM).is_file()
NODE=r'''const fs=require('fs'),f=require(process.argv[1]),r=new Uint8Array(fs.readFileSync(process.argv[2]));const off=16+16384+0x861f-0x8000;let a=[];for(let i=0;i<62;i++)a.push({index:i,region:'west',values:{x:r[off+63+i]&63,y:r[off+i]&127,external:r[off+i]>>7,scene:r[off+126+i]&63,entry:r[off+126+i]>>6,destinationWorld:(r[off+189+i]>>2)&7}});console.log(JSON.stringify(f.catalog(r,'z2:1:0',a,75)));'''
romdata=subprocess.check_output(['node','-e',NODE,str(ROOT.parents[2]/'app/src/ui/z2-native-sideview-records.js'),ROM],text=True)
catalog=json.loads(romdata);town=next(r for r in catalog['stages'] if r['location']['x']==2 and r['location']['y']==6 and r['source']['bank']==3 and r['source']['scene']==5)
world=json.loads((ROOT/'tests/synthetic_snapshot.json').read_text());world['sourceDigest']=hashlib.sha256(Path(ROM).read_bytes()).hexdigest();width=world['width'];world['terrain'][6*width+2]=0;world['terrain'][6*width+1]=9;world['terrain'][6*width+3]=9
img=Image.new('RGBA',(256,240),(35,50,70));stream=io.BytesIO();img.save(stream,format='PNG');png='data:image/png;base64,'+base64.b64encode(stream.getvalue()).decode()
checks={};sys.path.insert(0,str(ROOT/'host'))
from server import create_app
async def main():
 with tempfile.TemporaryDirectory() as td:
  server=TestServer(create_app(Path(td)/'w.db','secret'));client=TestClient(server);await client.start_server()
  try:
   auth={'X-Forge-Admin':'secret'}
   r=await client.post('/api/admin/world',headers=auth,json=world);assert r.status==200,await r.text();revision=(await r.json())['revision']
   record={**catalog,'sourceDigest':world['sourceDigest'],'expectedRevision':revision};record.pop('scope',None)
   r=await client.post('/api/admin/native-rooms',headers=auth,json=record);assert r.status==200,await r.text()
   req={'format':'nesforge.hosted-native-scene-art','version':1,'expectedRevision':revision,'sourceWorldId':world['sourceWorldId'],'sourceDigest':world['sourceDigest'],'x':2,'y':6,'sourceBank':3,'sourceScene':5,'sourceKind':'town','evidence':'executed-original-construction:first-screen','png':png}
   checks['art_requires_admin_auth']=(await client.post('/api/admin/native-scene-art',json=req)).status==401
   checks['wrong_room_identity_rejected']=(await client.post('/api/admin/native-scene-art',headers=auth,json={**req,'sourceScene':6})).status==409
   checks['stale_revision_rejected']=(await client.post('/api/admin/native-scene-art',headers=auth,json={**req,'expectedRevision':'0'*64})).status==409
   checks['bad_png_rejected']=(await client.post('/api/admin/native-scene-art',headers=auth,json={**req,'png':'nonsense'})).status==400
   r=await client.post('/api/admin/native-scene-art',headers=auth,json=req)
   checks['art_published_bound_to_native_source']=r.status==200
   if r.status!=200: print(await r.text())
   s=await client.get('/api/stage-frame?x=2&y=6');data=await s.json()
   checks['constructed_art_retrievable']=s.status==200 and data['captureMethod']=='executed-original-construction:first-screen' and data['png']==png
   host=server.app['host'];pid1,pid2=str(uuid.uuid4()),str(uuid.uuid4())
   for pid in [pid1,pid2]:
    host.db.execute('INSERT INTO players(id,address,x,y,xp,level) VALUES(?,?,?,?,?,?)',(pid,'0x'+pid.replace('-','').ljust(40,'0')[:40],1,6,0,1))
   for pid in [pid1,pid2]:
    with host.db:result=await host.action(pid,{'type':'move','dx':1,'dy':0})
    p=host.player(pid);checks['auto_enters_town_on_arrival_'+pid[:5]]=result.get('autoEntered') is True and p['mode']=='sideview' and ':town:2:6' in p['area_id']
   checks['both_players_one_shared_room']=host.player(pid1)['area_id']==host.player(pid2)['area_id']
   with host.db:out=await host.action(pid1,{'type':'leave_area'})
   p=host.player(pid1);checks['exit_returns_same_square']=out.get('ok') and p['mode']=='overworld' and (p['x'],p['y'])==(2,6)
   await asyncio.sleep(.11)
   with host.db:out=await host.action(pid1,{'type':'move','dx':-1,'dy':0})
   checks['walking_away_doesnt_reenter']=out.get('ok') and host.player(pid1)['mode']=='overworld'
   await asyncio.sleep(.11)
   with host.db:again=await host.action(pid1,{'type':'move','dx':1,'dy':0})
   checks['walking_back_auto_reenters']=again.get('autoEntered') and host.player(pid1)['mode']=='sideview'
   for tile,pos,kind in [(1,(5,6),'cave'),(2,(7,6),'palace')]:
    host.world['terrain'][pos[1]*width+pos[0]]=tile
    host.db.execute('UPDATE players SET x=?,y=?,mode=?,area_id=? WHERE id=?',(pos[0]-1,pos[1],'overworld','',pid1))
    await asyncio.sleep(.11)
    with host.db:out=await host.action(pid1,{'type':'move','dx':1,'dy':0})
    checks['auto_enters_'+kind]=out.get('autoEntered') and f':{kind}:' in host.player(pid1)['area_id']
  finally:await client.close()
asyncio.run(main());print(json.dumps({'passed':sum(bool(v) for v in checks.values()),'total':len(checks),'checks':checks},indent=2));assert all(checks.values())
