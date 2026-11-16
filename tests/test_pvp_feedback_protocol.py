"""ROM-free protocol-13 test: authenticated input, ignored throttle, server hit feedback.
No bypass to player-owned HP, no generated ROM/asset, no private data packaged.
"""
import asyncio,hashlib,json,tempfile,time,sys
from pathlib import Path
from aiohttp.test_utils import TestServer,TestClient
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'host'))
from server import create_app
checks={}

async def receive_state_health(ws,pid,hp):
    for _ in range(18):
        msg=await asyncio.wait_for(ws.receive_json(),timeout=5)
        if msg.get('type')=='state' and any(p['id']==pid and p['hp']==hp for p in msg['players']):return msg
    raise AssertionError('Expected state HP update '+str(hp))

async def drain(ws):
    while True:
        try:await asyncio.wait_for(ws.receive_json(),timeout=.08)
        except asyncio.TimeoutError:break

async def receive_type(ws,kind,max_events=6):
    for _ in range(max_events):
        msg=await asyncio.wait_for(ws.receive_json(),timeout=5)
        if msg.get('type')==kind:return msg
    raise AssertionError('Expected '+kind)

async def main():
    with tempfile.TemporaryDirectory() as d:
        app=create_app(Path(d)/'live.sqlite','test-admin');host=app['host']
        world=json.loads((ROOT/'tests/synthetic_snapshot.json').read_text())
        host.world=world;host.revision='e'*64
        area='z2:1:0:town:2:6'
        for index,pid in enumerate(['p1','p2']):
            host.db.execute("INSERT INTO players(id,address,x,y,xp,level,mode,area_id,side_x,side_facing) VALUES(?,?,?,?,?,?,?,?,?,?)",
                (pid,'0x'+str(index+1)*40,2,6,55,1,'sideview',area,10+index,1))
            token='signed-session-'+pid
            host.sessions[hashlib.sha256(token.encode()).hexdigest()]=(pid,time.time()+600)
        host.db.execute('INSERT INTO player_pose_assets(world_id,source_digest,image,sha256,evidence) VALUES(?,?,?,?,?)',
            (world['sourceWorldId'],world['sourceDigest'],'private-test-metadata','b'*64,'executed-original-display'))
        srv=TestServer(app);client=TestClient(srv);await client.start_server()
        try:
            ws1=await client.ws_connect('/ws');ws2=await client.ws_connect('/ws')
            await ws1.send_json({'type':'authenticate','sessionToken':'signed-session-p1'})
            await receive_type(ws1,'authenticated');await receive_type(ws1,'state')
            await ws2.send_json({'type':'authenticate','sessionToken':'signed-session-p2'})
            await receive_type(ws2,'authenticated');await receive_type(ws2,'state')
            checks['two_authenticated_sockets']=len(host.clients)==2
            # Drain any join broadcast before testing movement.
            await drain(ws1)
            await drain(ws2)
            await ws1.send_json({'type':'side_step','direction':1})
            moved=await receive_type(ws1,'state');moved_other=await receive_type(ws2,'state')
            checks['movement_broadcast_to_both']=next(p for p in moved['players'] if p['id']=='p1')['side_x']==11 and next(p for p in moved_other['players'] if p['id']=='p1')['side_x']==11
            await ws1.send_json({'type':'side_step','direction':1})
            await asyncio.sleep(.025)
            checks['fast_repeat_is_ignored_without_moving']=host.player('p1')['side_x']==11
            # A pending ignored packet must not deliver a player-facing rejection.
            try:
                early=await asyncio.wait_for(ws1.receive_json(),timeout=.10)
                checks['ignored_repeat_emits_no_error']=early.get('type')!='error'
            except asyncio.TimeoutError:
                checks['ignored_repeat_emits_no_error']=True
            await ws1.send_json({'type':'side_step','direction':1,'forceMove':True})
            result=await receive_type(ws1,'error')
            checks['client_cannot_force_position']=result['error']=='Side-view step must be -1 or +1' and host.player('p1')['side_x']==11
            await ws1.send_json({'type':'side_action','action':'forward_stab'})
            result1=await receive_state_health(ws1,'p2',56);result2=await receive_state_health(ws2,'p2',56)
            feedback=await receive_type(ws1,'action_result')
            a=next(p for p in result1['players'] if p['id']=='p2');b=next(p for p in result2['players'] if p['id']=='p2')
            checks['damage_visible_on_both_connections']=a['hp']==56 and b['hp']==56
            checks['ack_has_server_damage_not_client_claim']=feedback['hit'] is True and feedback['damage']==8 and feedback['target']=='p2'
            checks['xp_unchanged_by_test_pvp']=host.player('p1')['xp']==55 and host.player('p2')['xp']==55
            await ws1.close();await ws2.close()
        finally:await client.close()
    print(json.dumps({'checks':checks,'passed':sum(checks.values()),'total':len(checks)},indent=2))
    assert checks and all(checks.values()),checks

if __name__=='__main__':asyncio.run(main())
