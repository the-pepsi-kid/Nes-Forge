"""Real-ROM-derived Rauru jump/technique gates on the wallet-host simulator.
This checks recorded pose/vertical trajectory and held-input authorization; it
DOES NOT attest original sword collision, grant event or multiplayer ROM parity.
"""
import asyncio,json,sys,tempfile,time
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'host'))
from server import Host,Z2_RISE_PX,Z2_FPS,SIDE_JUMP_SECONDS,Z2_UP_TECHNIQUE_BIT,Z2_DOWN_TECHNIQUE_BIT
checks={}
async def run():
 with tempfile.TemporaryDirectory() as td:
  h=Host(Path(td)/'test.db','admin',pilot_sword_techniques=True)
  h.world=json.loads((R/'tests/synthetic_snapshot.json').read_text());h.revision='t'
  room='z2:1:0:town:2:6'
  for i,pid in enumerate(('a','b','outside')):
   h.db.execute('INSERT INTO players(id,address,x,y,xp,level,mode,area_id,side_x,side_facing) VALUES(?,?,?,?,?,?,?,?,?,?)',
     (pid,'0x'+str(i+1)*40,2,6,300,1,'sideview',room if pid!='outside' else 'elsewhere',10 if pid!='b' else 11,1))
   h.clients[pid]=object()
  h.db.execute('INSERT INTO player_pose_assets(world_id,source_digest,image,sha256,evidence) VALUES(?,?,?,?,?)',
   (h.world['sourceWorldId'],h.world['sourceDigest'],'metadata-only','b'*64,'executed-original-display'))
  checks['source_trace_28_frames']=len(Z2_RISE_PX)==28 and max(Z2_RISE_PX)==26 and Z2_RISE_PX[27]==0
  checks['source_flags_distinct']=Z2_UP_TECHNIQUE_BIT==4 and Z2_DOWN_TECHNIQUE_BIT==16
  checks['reject_pose_damage_spoof']=bool((await h.action('a',{'type':'side_nes_direction','direction':'up','damage':123})).get('error'))
  checks['reject_invalid_direction']=bool((await h.action('a',{'type':'side_nes_direction','direction':'diagonal'})).get('error'))
  checks['up_not_attack_on_ground']=(await h.action('a',{'type':'side_nes_direction','direction':'up'})).get('ok') and h.native_held_pose('a') is None
  checks['jump_accepted']=(await h.action('a',{'type':'side_jump'})).get('ok') is True
  now=time.time();h.side_jumps['a']=now-3/Z2_FPS
  sample=h.public()['players'][0]
  checks['source_jump_height_3']=h.side_air_height('a') in (10,13) # scheduling tolerance
  checks['held_up_maps_to_native_pose_8']=h.native_held_pose('a')==('up_stab',8)
  res=await h.resolve_held_thrust('a')
  checks['up_attack_authoritative_once']=res.get('ok') is True and (await h.resolve_held_thrust('a')).get('ignored') is True
  checks['no_cross_room_damage']=h.player('outside')['hp']==64
  h.side_jumps['a']=time.time()-15/Z2_FPS
  checks['up_not_persistent_after_observed_window']=h.native_held_pose('a') is None
  checks['down_direction_updates']=bool((await h.action('a',{'type':'side_nes_direction','direction':'down'})).get('ok'))
  checks['held_down_maps_to_native_pose_9']=h.native_held_pose('a')==('down_stab',9)
  h.combat_cooldowns['a']=0
  down=await h.resolve_held_thrust('a')
  checks['down_attack_executed_once']=down.get('ok') is True and (await h.resolve_held_thrust('a')).get('ignored') is True
  checks['no_xp_mutation']=all(h.player(p)['xp']==300 for p in ('a','b','outside'))
  await h.action('a',{'type':'side_nes_direction','direction':'neutral'})
  checks['release_clears_thrust']=h.native_held_pose('a') is None
  locked=Host(Path(td)/'locked.db','admin',pilot_sword_techniques=False)
  checks['authentic_default_closed']=not locked.pilot_sword_techniques and locked.native_held_pose('any') is None
  locked.db.close();h.db.close()
 print(json.dumps(checks,indent=2));assert all(checks.values()),checks
asyncio.run(run())
