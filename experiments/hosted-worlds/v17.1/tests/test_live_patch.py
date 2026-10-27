"""Two authenticated clients remain connected through safe JSON terrain patch, while occupied cell is rejected."""
import asyncio,sys,json,tempfile,secrets,time,os
from pathlib import Path
from aiohttp import ClientSession,WSMsgType
from cryptography.hazmat.primitives.asymmetric import ec,utils
from cryptography.hazmat.primitives import hashes
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'host'))
from eth_verify import keccak256,mul,G,address_from_point,N,recover_address
fixture=json.loads((Path(os.environ.get('NES_FORGE_HOSTED_SNAPSHOT_JSON',str(root/'tests/synthetic_snapshot.json')))).read_text());admin=secrets.token_urlsafe(24);base='http://127.0.0.1:8765';hdr={'X-Forge-Admin':admin};checks={}
async def go():
 with tempfile.TemporaryDirectory() as td:
  proc=await asyncio.create_subprocess_exec(sys.executable,str(root/'host/server.py'),'--db',str(Path(td)/'test.db'),'--admin-token',admin,stdout=asyncio.subprocess.DEVNULL,stderr=asyncio.subprocess.PIPE)
  try:
   async with ClientSession() as c:
    for _ in range(100):
     try:
      async with c.get(base+'/api/health') as r:
       if r.status==200:break
     except OSError:await asyncio.sleep(.08)
    else:raise RuntimeError('Server not reachable')
    async with c.post(base+'/api/admin/world',json=fixture,headers=hdr) as r:assert r.status==200,await r.text()
    async def signin(i):
     address=address_from_point(mul(i,G))
     async with c.post(base+'/api/auth/challenge',json={'address':address,'chainId':1}) as r:ch=await r.json()
     msg=ch['message'];pay=msg.encode('utf-8');digest=keccak256(b'\x19Ethereum Signed Message:\n'+str(len(pay)).encode()+pay)
     der=ec.derive_private_key(i,ec.SECP256K1()).sign(digest,ec.ECDSA(utils.Prehashed(hashes.SHA256())))
     rr,ss=utils.decode_dss_signature(der);ss=min(ss,N-ss)
     for v in (27,28):
      sig='0x'+rr.to_bytes(32,'big').hex()+ss.to_bytes(32,'big').hex()+bytes([v]).hex()
      if recover_address(msg,sig)==address:break
     async with c.post(base+'/api/auth/verify',json={'nonce':ch['nonce'],'signature':sig}) as r:assert r.status==200;return await r.json()
    a,b=await signin(1),await signin(2)
    ws1=await c.ws_connect(base+'/ws');ws2=await c.ws_connect(base+'/ws')
    await ws1.send_json({'type':'authenticate','sessionToken':a['sessionToken']});await ws2.send_json({'type':'authenticate','sessionToken':b['sessionToken']})
    async def collect(ws,revision=None):
     for _ in range(35):
      m=await ws.receive(timeout=4)
      if m.type==WSMsgType.TEXT:
       v=json.loads(m.data)
       if v.get('type')=='state' and v.get('online')==2 and (revision is None or v.get('revision')==revision):return v
     raise RuntimeError('No 2-player sync broadcast')
    state1=await collect(ws1);state2=await collect(ws2)
    checks['two_players_online_before_patch']=state1['online']==state2['online']==2
    you=next(p for p in state1['players'] if p['id']==a['playerId']);occupied=you['y']*64+you['x'];safe=0
    while safe in {occupied,next(p for p in state1['players'] if p['id']==b['playerId'])['y']*64+next(p for p in state1['players'] if p['id']==b['playerId'])['x']}:
     safe+=1
    if fixture['terrain'][safe]==6:newtile=5
    else:newtile=6
    before=state1['revision']
    async with c.post(base+'/api/admin/patch',headers=hdr,json={'format':'nesforge.world.patch','version':1,'expectedRevision':before,'sourceWorldId':fixture['sourceWorldId'],'changes':[{'index':occupied,'value':11}]}) as r:
     checks['active_player_tile_protected']=r.status==409
    async with c.post(base+'/api/admin/patch',headers=hdr,json={'format':'nesforge.world.patch','version':1,'expectedRevision':before,'sourceWorldId':fixture['sourceWorldId'],'changes':[{'index':safe,'value':newtile}]}) as r:
     assert r.status==200,await r.text();success=await r.json()
    after=success['revision'];state1=await collect(ws1,after);state2=await collect(ws2,after)
    checks['both_clients_receive_live_patch']=all(st['world']['terrain'][safe]==newtile and st['revision']==after for st in (state1,state2))
    checks['player_sessions_not_reset']=state1['online']==state2['online']==2 and len(state1['players'])==2
    checks['native_art_not_replaced']=state1['world']['art']==fixture['art']
    await ws1.close();await ws2.close()
  finally:
   proc.terminate();await asyncio.wait_for(proc.wait(),timeout=6)
asyncio.run(go());print(json.dumps(checks,indent=2));assert all(checks.values()),checks
