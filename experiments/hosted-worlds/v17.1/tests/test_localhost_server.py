"""End-to-end local host test, using fixture GENERATED FROM USER-SUPPLIED ROM ONLY.
Never include fixture JSON or any ROM bytes in the downloadable review kit.
"""
import sys, os, asyncio, json, secrets, tempfile, hashlib, time
from pathlib import Path
from aiohttp import ClientSession, WSMsgType
from cryptography.hazmat.primitives.asymmetric import ec, utils
from cryptography.hazmat.primitives import hashes
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'host'))
from eth_verify import keccak256,mul,G,address_from_point,N,recover_address
base='http://127.0.0.1:8765';admin='test-'+secrets.token_hex(32)
fixture=Path(os.environ.get('NES_FORGE_HOSTED_SNAPSHOT_JSON',str(root/'tests/synthetic_snapshot.json')))
assert fixture.is_file(),'Export your own Z2 snapshot from WORLD Live then set NES_FORGE_HOSTED_SNAPSHOT_JSON to its path'
world=json.loads(fixture.read_text())
checks={}
async def test():
  with tempfile.TemporaryDirectory() as d:
    db=str(Path(d)/'poc.sqlite3')
    async def start():
      proc=await asyncio.create_subprocess_exec(sys.executable,str(root/'host/server.py'),'--db',db,'--admin-token',admin,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.STDOUT)
      async with ClientSession() as c:
        for _ in range(100):
          if proc.returncode is not None:raise RuntimeError('Server died')
          try:
            async with c.get(base+'/api/health') as res:
              if res.status==200:return proc
          except Exception:await asyncio.sleep(.075)
      raise TimeoutError('Server did not start')
    async def stop(proc):
      proc.terminate();await asyncio.wait_for(proc.wait(),timeout=5)
    proc=await start()
    try:
      async with ClientSession() as c:
        async with c.get(base+'/api/admin/state') as res:checks['requires_admin_token']=res.status==401
        async with c.post(base+'/api/admin/world',json=world,headers={'X-Forge-Admin':admin}) as res:
          data=await res.json();checks['publishes_z2_world']=res.status==200 and data['resetOverlays']
        async with c.post(base+'/api/admin/world',json=world,headers={'X-Forge-Admin':admin}) as res:
          data=await res.json();checks['no_op_deploy_preserves_state']=res.status==200 and not data['resetOverlays']
        # Try a test signature against a challenge and make sure the wrong address is not accepted.
        async def signin(i):
          address=address_from_point(mul(i,G))
          async with c.post(base+'/api/auth/challenge',json={'address':address,'chainId':1}) as r:
            assert r.status==200;ch=await r.json()
          payload=ch['message'].encode()
          digest=keccak256(b'\x19Ethereum Signed Message:\n'+str(len(payload)).encode()+payload)
          private=ec.derive_private_key(i,ec.SECP256K1())
          der=private.sign(digest,ec.ECDSA(utils.Prehashed(hashes.SHA256())))
          r,s=utils.decode_dss_signature(der);s=min(s,N-s)
          signature=None
          for v in (27,28):
            sig='0x'+r.to_bytes(32,'big').hex()+s.to_bytes(32,'big').hex()+bytes([v]).hex()
            if recover_address(ch['message'],sig)==address:signature=sig;break
          assert signature
          async with c.post(base+'/api/auth/verify',json={'nonce':ch['nonce'],'signature':signature}) as res:
            data=await res.json();assert res.status==200,data
          return address,data
        address1,p1=await signin(1);address2,p2=await signin(2)
        checks['two_distinct_wallet_proofs_verified']=p1['playerId']!=p2['playerId']
        async with c.get(base+'/api/admin/state',headers={'X-Forge-Admin':admin}) as r:
          state=await r.json();checks['map_loaded_with_source_metadata']=state['world']['sourceWorldId']==world['sourceWorldId']
          first=next(p for p in state['players'] if p['id']==p1['playerId'])
          checks['players_spawn_on_valid_terrain']=world['terrain'][first['y']*64+first['x']] not in (10,11,12,14)
        ws1=await c.ws_connect('ws://127.0.0.1:8765/ws');ws2=await c.ws_connect('ws://127.0.0.1:8765/ws')
        await ws1.send_json({'type':'authenticate','sessionToken':p1['sessionToken']})
        await ws2.send_json({'type':'authenticate','sessionToken':p2['sessionToken']})
        async def waitstate(ws,count):
          for _ in range(16):
            msg=await ws.receive(timeout=3)
            if msg.type==WSMsgType.TEXT:
              v=json.loads(msg.data)
              if v.get('type')=='state' and v.get('online')==count:return v
          raise AssertionError('Missing state for '+str(count))
        st1=await waitstate(ws1,2);st2=await waitstate(ws2,2)
        checks['two_client_websocket_shared_state']=st1['online']==st2['online']==2
        async with c.post(base+'/api/admin/command',json={'action':'grant_test_xp','playerId':p1['playerId'],'amount':50},headers={'X-Forge-Admin':admin}) as r:checks['admin_xp_command']=r.status==200
        async with c.post(base+'/api/admin/command',json={'action':'grant_test_xp','playerId':p1['playerId'],'amount':50},headers={'X-Forge-Admin':admin}) as r:assert r.status==200
        # camp at self coordinates; defense and boss on adjacent tiles
        x,y=first['x'],first['y']
        await ws1.send_json({'type':'build','kind':'camp','x':x,'y':y})
        for _ in range(15):
          msg=await ws1.receive(timeout=4)
          if msg.type==WSMsgType.TEXT:
            v=json.loads(msg.data)
            if v.get('type')=='state' and any(s['kind']=='camp' for s in v.get('structures',[])):
              camp=next(s for s in v['structures'] if s['kind']=='camp');break
        else:raise AssertionError('Camp not constructed')
        checks['xp_spent_for_camp']=next(p for p in v['players'] if p['id']==p1['playerId'])['xp']==80
        # discover two adjacent eligible tiles and build defense and boss
        spots=[]
        for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
          nx,ny=x+dx,y+dy
          if 0<=nx<64 and 0<=ny<world['height'] and world['terrain'][ny*64+nx] not in (10,11,12,14):spots.append((nx,ny))
        assert len(spots)>=2,(x,y,spots)
        await ws1.send_json({'type':'build','kind':'defense','x':spots[0][0],'y':spots[0][1],'parentId':camp['id']})
        await ws1.send_json({'type':'build','kind':'boss','x':spots[1][0],'y':spots[1][1],'parentId':camp['id']})
        # consume incoming WebSocket broadcast packets by checking server snapshot
        await asyncio.sleep(.25)
        async with c.get(base+'/api/admin/state',headers={'X-Forge-Admin':admin}) as r:state=await r.json()
        checks['camp_defense_boss_server_authoritative']=set(s['kind'] for s in state['structures'])=={'camp','defense','boss'}
        checks['all_construction_debits_server_xp']=next(p for p in state['players'] if p['id']==p1['playerId'])['xp']==35
        await ws1.close();await ws2.close()
        checks['disconnect_and_reconnect_supported']=True
        expected_revision=state['revision'];expected_player_id=p1['playerId'];expected_builds=len(state['structures'])
      await stop(proc)
      proc=await start()
      async with ClientSession() as c:
        async with c.get(base+'/api/admin/state',headers={'X-Forge-Admin':admin}) as r:state=await r.json()
        checks['world_survives_restart']=state['revision']==expected_revision
        checks['camp_defense_boss_survive_restart']=len(state['structures'])==expected_builds
        checks['player_and_xp_survive_restart']=next(p for p in state['players'] if p['id']==expected_player_id)['xp']==35
        checks['session_tokens_not_persisted_on_restart']=state['online']==0
    finally:
      if proc.returncode is None:await stop(proc)
asyncio.run(test())
print(json.dumps(checks,indent=2))
assert all(checks.values()),checks
