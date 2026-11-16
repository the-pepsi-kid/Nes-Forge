"""Verified-wallet, one-room-for-many test using synthetic map; no proprietary ROM/assets."""
import sys, asyncio, json, secrets, tempfile, hashlib
from pathlib import Path
from aiohttp import ClientSession
from cryptography.hazmat.primitives.asymmetric import ec,utils
from cryptography.hazmat.primitives import hashes
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'host'))
from eth_verify import keccak256,mul,G,address_from_point,N,recover_address
base='http://127.0.0.1:8765';admin=secrets.token_hex(32)
world=json.loads((root/'tests/synthetic_snapshot.json').read_text());checks={}
async def signin(c,i):
    addr=address_from_point(mul(i,G))
    async with c.post(base+'/api/auth/challenge',json={'address':addr,'chainId':1}) as r:
        assert r.status==200;ch=await r.json()
    msg=ch['message'];b=msg.encode();digest=keccak256(b'\x19Ethereum Signed Message:\n'+str(len(b)).encode()+b)
    prv=ec.derive_private_key(i,ec.SECP256K1())
    der=prv.sign(digest,ec.ECDSA(utils.Prehashed(hashes.SHA256())))
    rr,ss=utils.decode_dss_signature(der);ss=min(ss,N-ss)
    sig=next('0x'+rr.to_bytes(32,'big').hex()+ss.to_bytes(32,'big').hex()+bytes([v]).hex() for v in (27,28) if recover_address(msg,'0x'+rr.to_bytes(32,'big').hex()+ss.to_bytes(32,'big').hex()+bytes([v]).hex())==addr)
    async with c.post(base+'/api/auth/verify',json={'nonce':ch['nonce'],'signature':sig}) as r:
        assert r.status==200,await r.text();return await r.json()
async def run():
 with tempfile.TemporaryDirectory() as d:
  p=await asyncio.create_subprocess_exec(sys.executable,str(root/'host/server.py'),'--db',str(Path(d)/'db.sqlite'),'--admin-token',admin,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.STDOUT)
  try:
   async with ClientSession() as c:
    for _ in range(100):
     try:
      async with c.get(base+'/api/health') as r:
       if r.status==200:break
     except Exception: await asyncio.sleep(.08)
    else: raise AssertionError('host did not start')
    async with c.post(base+'/api/admin/world',json=world,headers={'X-Forge-Admin':admin}) as r:assert r.status==200,await r.text()
    accounts=[await signin(c,i+1) for i in range(20)]
    ws=[]
    for info in accounts:
      sock=await c.ws_connect('ws://127.0.0.1:8765/ws');ws.append(sock)
      await sock.send_json({'type':'authenticate','sessionToken':info['sessionToken']})
    async def admin_state():
      async with c.get(base+'/api/admin/state',headers={'X-Forge-Admin':admin}) as r:
       assert r.status==200;return await r.json()
    for _ in range(30):
      st=await admin_state()
      if st['online']==20:break
      await asyncio.sleep(.03)
    checks['twenty_signed_wallets_simultaneously_online']=st['online']==20
    checks['no_extra_rpg_stats_or_native_scene_claims']='original physics, exact scrolling, Link animation NOT recovered' in st['progression']['sideView'] and 'NOT native Zelda II combat' in st['simulation']
    pid1,pid2=accounts[0]['playerId'],accounts[1]['playerId'];p1=next(x for x in st['players'] if x['id']==pid1)
    async with c.post(base+'/api/admin/command',json={'action':'grant_test_xp','playerId':pid1,'amount':50},headers={'X-Forge-Admin':admin}) as r:assert r.status==200
    await ws[0].send_json({'type':'build','kind':'camp','x':p1['x'],'y':p1['y']})
    for _ in range(30):
      st=await admin_state()
      if st['structures']:break
      await asyncio.sleep(.04)
    camp=next(x for x in st['structures'] if x['kind']=='camp')
    checks['xp_funded_fairy_camp']=camp['player_id']==pid1 and next(x for x in st['players'] if x['id']==pid1)['xp']==30
    checks['camp_is_players_persistent_spawn_anchor']=next(x for x in st['players'] if x['id']==pid1)['respawn_camp_id']==camp['id']
    for sock in ws:await sock.send_json({'type':'enter_area'})
    for _ in range(40):
      st=await admin_state();arr=[x for x in st['players'] if x['mode']=='sideview' and x['online']]
      if len(arr)==20:break
      await asyncio.sleep(.04)
    checks['twenty_players_share_one_sideview_instance']=len(arr)==20 and len(set(x['area_id'] for x in arr))==1
    for sock in ws[2:]:await sock.send_json({'type':'leave_area'})
    for _ in range(30):
      st=await admin_state();a=next(x for x in st['players'] if x['id']==pid1);b=next(x for x in st['players'] if x['id']==pid2)
      if a['mode']=='sideview' and b['mode']=='sideview':break
      await asyncio.sleep(.04)
    checks['both_clients_same_server_owned_area']=a['area_id']==b['area_id'] and ':fairy-camp:' in a['area_id']
    area=next(x for x in st['areas'] if x['id']==a['area_id'])
    checks['shared_room_contains_both_players']=pid1 in area['occupants'] and pid2 in area['occupants']
    await ws[0].send_json({'type':'side_step','direction':1})
    for _ in range(30):
      st=await admin_state();a=next(x for x in st['players'] if x['id']==pid1)
      if a['side_x']==9:break
      await asyncio.sleep(.04)
    checks['server_authoritative_shared_room_step']=a['side_x']==9
    await ws[1].send_json({'type':'leave_area'})
    for _ in range(30):
      st=await admin_state();b=next(x for x in st['players'] if x['id']==pid2)
      if b['mode']=='overworld':break
      await asyncio.sleep(.04)
    checks['area_exit_same_overworld_square']=b['mode']=='overworld' and (b['x'],b['y'])==(camp['x'],camp['y'])
    async with c.post(base+'/api/admin/command',json={'action':'simulate_defeat','playerId':pid1},headers={'X-Forge-Admin':admin}) as r:
      result=await r.json();checks['admin_audited_fake_defeat_uses_fairy_camp']=r.status==200 and result['campUsed']
    st=await admin_state();a=next(x for x in st['players'] if x['id']==pid1)
    checks['respawn_enters_shared_sideview']=a['mode']=='sideview' and a['area_id']==area['id'] and (a['x'],a['y'])==(camp['x'],camp['y'])
    checks['simulation_is_provenance_labelled']=any(row['action']=='test-defeat-respawn' for row in st['audit'])
    # Send invalid out-of-room action and verify it has no effect.
    await ws[0].send_json({'type':'move','dx':1,'dy':0});await asyncio.sleep(.1)
    st=await admin_state();again=next(x for x in st['players'] if x['id']==pid1)
    checks['overworld_movement_blocked_inside_room']=(again['x'],again['y'])==(a['x'],a['y'])
    for sock in ws:await sock.close()
    expected=area['id']
   p.terminate();await asyncio.wait_for(p.wait(),5)
   p=await asyncio.create_subprocess_exec(sys.executable,str(root/'host/server.py'),'--db',str(Path(d)/'db.sqlite'),'--admin-token',admin,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.STDOUT)
   async with ClientSession() as c:
    for _ in range(100):
      try:
       async with c.get(base+'/api/health') as r:
        if r.status==200:break
      except Exception:await asyncio.sleep(.08)
    st=await admin_state_reboot(c)
    a=next(x for x in st['players'] if x['id']==pid1)
    checks['room_and_spawn_anchor_survive_restart']=a['mode']=='sideview' and a['area_id']==expected and a['respawn_camp_id']==camp['id']
    checks['restart_requires_new_wallet_session']=st['online']==0
  finally:
   if p.returncode is None:p.terminate();await asyncio.wait_for(p.wait(),5)
async def admin_state_reboot(c):
 async with c.get(base+'/api/admin/state',headers={'X-Forge-Admin':admin}) as r:
  assert r.status==200;return await r.json()
asyncio.run(run());print(json.dumps(checks,indent=2));assert all(checks.values()),checks
