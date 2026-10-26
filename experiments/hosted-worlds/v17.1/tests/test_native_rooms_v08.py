"""v0.8 source structure and host acceptance with user's private ROM, never packaged."""
import os,sys,subprocess,tempfile,json,hashlib,asyncio
from pathlib import Path
from aiohttp.test_utils import TestServer,TestClient
ROOT=Path(__file__).resolve().parents[1]
ROM=os.getenv('NES_FORGE_Z2_ROM')
if not ROM or not Path(ROM).is_file():raise SystemExit('Set NES_FORGE_Z2_ROM to local source ROM for private acceptance')
NODE=r'''const fs=require('fs'),f=require(process.argv[1]),r=new Uint8Array(fs.readFileSync(process.argv[2]));const out={};
const mapping=[['z2:1:0',1,0x861f,75,'west'],['z2:1:1',1,0xa0fc,60,'death-mountain'],['z2:2:0',2,0x861f,75,'east'],['z2:2:1',2,0xa0fc,60,'maze']];
for(const [id,bank,base,h,region] of mapping){let off=16+bank*16384+base-0x8000,records=[];for(let i=0;i<62;i++)records.push({index:i,region,values:{x:r[off+63+i]&63,y:r[off+i]&127,external:r[off+i]>>7,scene:r[off+126+i]&63,entry:r[off+126+i]>>6,destinationWorld:(r[off+189+i]>>2)&7}});out[id]=f.catalog(r,id,records,h);}
console.log(JSON.stringify(out));'''
proc=subprocess.run(['node','-e',NODE,str(ROOT.parents[2]/'app/src/ui/z2-native-sideview-records.js'),ROM],text=True,capture_output=True,check=True)
allmaps=json.loads(proc.stdout);west=allmaps['z2:1:0'];checks={}
checks['all_four_source_catalogs_decoded']=len(allmaps)==4 and all(len(c['stages'])>25 for c in allmaps.values())
checks['west_hyrule_source_rooms']=len(west['stages'])==42
first=west['stages'][0]
checks['rom_defined_first_location']=first['location']['x']==23 and first['location']['y']==22 and first['source']['scene']==0 and first['source']['bank']==1
checks['actual_native_header']=first['source']['cpu']==0x8cb5 and first['source']['length']==54 and first['header']['screenCount']==3
checks['raw_objects_and_exits']=len(first['objects'])>5 and len(first['exits'])==4
checks['unverified_original_graphics_not_claimed']=not first['nativeSceneVerified'] and not first['originalEnginePlayable']
checks['no_rom_payload_exported']=not any(k in json.dumps(west) for k in ('data:image','importedRom','.nes'))
world=json.loads((ROOT/'tests/synthetic_snapshot.json').read_text());world['sourceDigest']=hashlib.sha256(Path(ROM).read_bytes()).hexdigest()
# Use synthetic map artwork + real source-room metadata under a real source digest only in private test.
sys.path.insert(0,str(ROOT/'host'))
from server import create_app
async def main():
 with tempfile.TemporaryDirectory() as td:
  server=TestServer(create_app(Path(td)/'room.db','test-secret'));client=TestClient(server);await client.start_server()
  try:
   auth={'X-Forge-Admin':'test-secret'}
   r=await client.post('/api/admin/world',headers=auth,json=world);assert r.status==200,await r.text();revision=(await r.json())['revision']
   req={**west,'expectedRevision':revision,'sourceDigest':world['sourceDigest']};req.pop('scope',None)
   r=await client.post('/api/admin/native-rooms',json=req)
   checks['requires_admin_auth']=r.status==401
   bad={**req,'expectedRevision':'0'*64}
   r=await client.post('/api/admin/native-rooms',headers=auth,json=bad)
   checks['stale_revision_rejected']=r.status==409
   r=await client.post('/api/admin/native-rooms',headers=auth,json=req);ans=await r.text()
   checks['records_publish_on_authorized_host']=r.status==200 and json.loads(ans)['recovered']==42
   if r.status!=200:print('UPLOAD ERROR',ans[:600]);return
   loc=first['location']
   r=await client.get(f'/api/native-rooms?x={loc["x"]}&y={loc["y"]}')
   data=await r.json()
   checks['original_room_retrievable_without_rom']=r.status==200 and any(d['source']==first['source'] for d in data['rooms'])
   checks['readonly_source_metadata_not_gameplay']=data['nativeSceneVerified'] is False and all(v['nativeSceneVerified'] is False for v in data['rooms'])
   r=await client.get('/api/admin/state',headers=auth);public=(await r.json())['nativeRooms'];checks['summary_only_in_broadcast']=len(public)==42 and all(set(item)=={'locationIndex','x','y','digest'} for item in public)
   bad_stage={**first,'nativeSceneVerified':True};r=await client.post('/api/admin/native-rooms',headers=auth,json={**req,'stages':[bad_stage]})
   checks['false_native_verified_flag_rejected']=r.status==400
   r=await client.get('/api/admin/state',headers=auth);checks['failed_upload_preserves_catalog']=len((await r.json())['nativeRooms'])==42
  finally: await client.close()
  # A new Host process must be able to reconstruct its metadata catalog from SQLite.
  second=TestServer(create_app(Path(td)/'room.db','test-secret'))
  c2=TestClient(second);await c2.start_server()
  try:
   x,y=first['location']['x'],first['location']['y']
   r=await c2.get(f'/api/native-rooms?x={x}&y={y}')
   checks['native_room_catalog_persists_host_restart']=r.status==200 and len((await r.json())['rooms'])>0
  finally:await c2.close()
asyncio.run(main())
print(json.dumps({'passed':sum(bool(v) for v in checks.values()),'total':len(checks),'checks':checks},indent=2));assert all(checks.values()),checks
