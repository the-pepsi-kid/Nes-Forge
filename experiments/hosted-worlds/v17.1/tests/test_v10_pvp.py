"""Bounded server-authoritative PvP transport test, NOT recovered Zelda II combat."""
from pathlib import Path
import sys,asyncio,tempfile,json,uuid
from aiohttp.test_utils import TestServer,TestClient
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'host'))
from server import create_app
checks={}
async def main():
 with tempfile.TemporaryDirectory() as td:
  t=TestServer(create_app(Path(td)/'pvp.db','super-local-secret'));c=TestClient(t);await c.start_server()
  try:
   host=t.app['host'];payload=json.loads((R/'tests/synthetic_snapshot.json').read_text());host.world=payload;host.revision='a'*64
   area='z2:1:0:town:2:6'
   ids=['test-player-'+str(i) for i in range(3)]
   for i,p in enumerate(ids):
    host.db.execute('INSERT INTO players(id,address,x,y,xp,level,mode,area_id,side_x,side_facing) VALUES(?,?,?,?,?,?,?,?,?,?)',
     (p,'0x'+format(i+1,'040x'),2,6,400,1,'sideview',area if i<2 else area+'else',10+2*i,1))
    host.clients[p]=object() # already-authenticated real WS identities in public state
   async def take(pid,body):
    with host.db:return await host.action(pid,body)
   hit=await take(ids[0],{'type':'pvp_test_attack'})
   checks['same_room_facing_hit']=hit.get('hit') is True and hit.get('damage')==8 and host.player(ids[1])['hp']==56
   checks['no_hit_xp_or_level_rewards']=all(host.player(i)['xp']==400 and host.player(i)['attack_level']==1 for i in ids)
   checks['cooldown_prevents_spam']=(await take(ids[0],{'type':'pvp_test_attack'})).get('error')=='Pilot attack cooling down'
   host.combat_cooldowns[ids[0]]=0
   host.db.execute('UPDATE players SET side_x=? WHERE id=?',(20,ids[1]))
   checks['range_validated']=not (await take(ids[0],{'type':'pvp_test_attack'})).get('hit')
   host.combat_cooldowns[ids[0]]=0
   host.db.execute('UPDATE players SET side_x=?,area_id=? WHERE id=?',(11,'another-room',ids[1]))
   checks['no_cross_room_damage']=not (await take(ids[0],{'type':'pvp_test_attack'})).get('hit') and host.player(ids[1])['hp']==56
   host.db.execute('UPDATE players SET side_x=?,area_id=? WHERE id=?',(12,area,ids[1]))
   host.combat_cooldowns[ids[0]]=0
   host.db.execute('UPDATE players SET side_facing=? WHERE id=?',(-1,ids[0]))
   checks['facing_authoritative']=not (await take(ids[0],{'type':'pvp_test_attack'})).get('hit')
   host.db.execute('UPDATE players SET side_facing=? WHERE id=?',(1,ids[0]))
   host.combat_cooldowns[ids[0]]=0
   host.db.execute('UPDATE players SET hp=? WHERE id=?',(8,ids[1]))
   hit=await take(ids[0],{'type':'pvp_test_attack'})
   checks['defeat_routes_through_existing_respawn']=hit.get('respawned') is True and host.player(ids[1])['mode']=='overworld' and host.player(ids[1])['hp']==64
   checks['other_room_player_unaffected']=host.player(ids[2])['hp']==64
   checks['audited_pilot_not_original_combat']=[r['action'] for r in host.db.execute('SELECT action FROM journal')].count('pvp-test-hit')>=2
   checks['invalid_payload_rejected']=not (await take(ids[0],{'type':'pvp_test_attack','forceHit':True})).get('hit')
  finally:await c.close()
asyncio.run(main());print(json.dumps(checks,indent=2));assert all(checks.values()),checks
