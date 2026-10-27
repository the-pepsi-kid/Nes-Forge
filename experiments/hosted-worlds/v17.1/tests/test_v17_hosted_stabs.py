"""Server-side tests for original Zelda II pose selector 8/9 translated into
HOSTED-PILOT multiplayer actions, with explicit NON-original vertical physics.
No original ROM distributed or needed for this server test.
"""
from pathlib import Path
import sys,asyncio,tempfile,json,time
from aiohttp.test_utils import TestServer,TestClient
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'host'))
from server import create_app,SIDE_JUMP_SECONDS
checks={}
async def main():
 with tempfile.TemporaryDirectory() as td:
  t=TestServer(create_app(Path(td)/'world.db','admin'));c=TestClient(t);await c.start_server()
  try:
   h=t.app['host'];h.world=json.loads((R/'tests/synthetic_snapshot.json').read_text());h.revision='a'*64
   area='z2:1:0:town:2:6';other=area+':other'
   identities=['a','b','third']
   for i,pid in enumerate(identities):
    h.db.execute('INSERT INTO players(id,address,x,y,xp,level,mode,area_id,side_x,side_facing) VALUES(?,?,?,?,?,?,?,?,?,?)',
      (pid,'0x'+str(i+1)*40,2,6,100,1,'sideview',area if i<2 else other,10+i if i<2 else 10,1))
    h.clients[pid]=object()
   # Server should fail closed when room art is missing.
   checks['must_publish_original_pose_asset']=(await h.action('a',{'type':'side_action','action':'up_stab'})).get('error','').startswith('Publish original Link')
   h.db.execute('INSERT INTO player_pose_assets(world_id,source_digest,image,sha256,evidence) VALUES(?,?,?,?,?)',
    (h.world['sourceWorldId'],h.world['sourceDigest'],'synthetic-metadata-only','c'*64,'executed-original-display'))
   checks['reject_unrecognized_action']=(await h.action('a',{'type':'side_action','action':'magic_attack'})).get('error')=='Unknown side-view action'
   checks['reject_untrusted_client_extra_fields']=(await h.action('a',{'type':'side_action','action':'up_stab','forceHit':True})).get('error')=='Unknown side-view action'
   checks['down_stab_requires_airborne']=(await h.action('a',{'type':'side_action','action':'down_stab'})).get('error')=='Downward Stab requires a jump (pilot)'
   # Upward attack misses grounded opponent, but sees an airborne target nearby.
   checks['upward_attack_grounded_target_misses']=(await h.action('a',{'type':'side_action','action':'up_stab'})).get('hit') is False
   state=h.public();mine=next(p for p in state['players'] if p['id']=='a')
   checks['source_selector_8_sync']=mine['side_pose']==8 and mine['side_action']=='up_stab'
   h.combat_cooldowns['a']=0
   checks['server_jump_start']=(await h.action('b',{'type':'side_jump'})).get('ok') is True
   h.side_jumps['b']=time.time()-SIDE_JUMP_SECONDS*.5
   checks['server_arc_midpoint']=h.side_air_height('b')>=46
   up=await h.action('a',{'type':'side_action','action':'up_stab'})
   checks['upward_raises_hit_on_airborne_target']=up.get('hit') is True and h.player('b')['hp']==56 and up['sourcePose']==8
   checks['no_cross_room_hit']=h.player('third')['hp']==64
   # Reuse original down pose on a jumping actor above a grounded defender.
   h.combat_cooldowns['b']=0
   h.db.execute('UPDATE players SET side_x=? WHERE id=?',(10,'b'))
   h.side_jumps['b']=time.time()-SIDE_JUMP_SECONDS*.5
   down=await h.action('b',{'type':'side_action','action':'down_stab'})
   checks['downward_attack_hits_below']=down.get('hit') is True and down['sourcePose']==9 and h.player('a')['hp']==56
   mine=next(p for p in h.public()['players'] if p['id']=='b')
   checks['source_selector_9_network_sync']=mine['side_pose']==9 and mine['side_air_px']>=46 and mine['side_action']=='down_stab'
   checks['cooldown_prevents_spam']=('cooling down' in (await h.action('b',{'type':'side_action','action':'down_stab'})).get('error',''))
   h.combat_cooldowns['a']=0
   h.side_actions['a']=('idle',0,3)
   forward=await h.action('a',{'type':'side_action','action':'forward_stab'})
   checks['forward_attack_preserved']=forward.get('ok') and forward.get('sourcePose')==4
   checks['no_xp_reward']=all(h.player(p)['xp']==100 for p in identities)
   checks['events_mark_as_provisional']=all(json.loads(r['detail']).get('provisionalHitbox') for r in h.db.execute("SELECT detail FROM journal WHERE action='side-stab-pilot-hit'"))
   h.side_jumps['b']=time.time()-2*SIDE_JUMP_SECONDS
   h.side_actions['b']=('down_stab',time.time()-2,9)
   recovered=next(p for p in h.public()['players'] if p['id']=='b')
   checks['idle_after_action_and_jump']=recovered['side_air_px']==0 and recovered['side_action']=='idle' and recovered['side_pose']==3
   checks['world_and_ledger_retained']=h.world['sourceWorldId'] and h.db.execute('SELECT COUNT(*) FROM players').fetchone()[0]==3
   # Fresh host reopens same DB with no loss to existing camps, wallets and levels.
   h.db.execute('INSERT INTO structures(id,player_id,kind,x,y,parent_id,hp) VALUES(?,?,?,?,?,?,?)',('camp','a','camp',2,6,None,0))
   h.db.close();t.app['host'].db=None
  finally:await c.close()
 print(json.dumps(checks,indent=2));assert all(checks.values()),checks
asyncio.run(main())
