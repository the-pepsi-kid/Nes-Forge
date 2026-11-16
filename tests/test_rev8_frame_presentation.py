#!/usr/bin/env python3
"""Frame-continuous original-observed presentation; no client gameplay authority."""
import asyncio, json, sys, subprocess, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'host'))
import server
checks={}

async def check_host():
 with tempfile.TemporaryDirectory() as td:
  h=server.Host(Path(td)/'state.db','test-admin')
  h.world=json.loads((ROOT/'tests/synthetic_snapshot.json').read_text());h.revision='rev8'
  for i,pid in enumerate(('one','two')):
   h.db.execute('INSERT INTO players(id,address,x,y,xp,level,mode,area_id,side_x,side_facing) VALUES(?,?,?,?,?,?,?,?,?,?)',
     (pid,'0x'+str(i+1)*40,2,6,100,1,'sideview','room',8+i*8,1))
   h.clients[pid]=object()
  checks['held_right_accepted']=(await h.action('one',{'type':'side_input','direction':1})).get('ok')
  for _ in range(24):h.horizontal_tick()
  pos1=h.player('one')['side_pos16']
  checks['original_speed_before_crouch']=h.horizontal_actors['one'].velocity==24
  checks['crouch_accepted']=(await h.action('one',{'type':'side_nes_direction','direction':'down'})).get('ok')
  for _ in range(30):h.horizontal_tick()
  stable=h.player('one')['side_pos16']; v=h.horizontal_actors['one'].velocity
  for _ in range(4):h.horizontal_tick()
  checks['held_down_prevents_walking']=h.player('one')['side_pos16']==stable and v==0
  checks['held_right_survives_crouch']=h.side_requested_horizontal['one']==1
  checks['down_release_accepted']=(await h.action('one',{'type':'side_nes_direction','direction':'neutral'})).get('ok')
  for _ in range(16):h.horizontal_tick()
  checks['walk_resumes_without_new_keydown']=h.player('one')['side_pos16']>stable
  checks['other_actor_unaffected']=h.player('two')['side_x']==16
  before=h.player('one')['side_pos16']
  checks['spoofed_velocity_rejected']=bool((await h.action('one',{'type':'side_input','direction':1,'side_velocity_observed_adapter':999})).get('error'))
  checks['spoofed_air_endpoint_rejected']=bool((await h.action('one',{'type':'side_jump','side_air_next_px':999})).get('error'))
  checks['spoof_has_no_effect']=h.player('one')['side_pos16']==before
  clock=[100.0];old=server.now
  try:
   server.now=lambda:clock[0]
   checks['jump_accepted']=(await h.action('one',{'type':'side_jump'})).get('ok')
   clock[0]=100+4/server.Z2_FPS
   result=next(p for p in h.public()['players'] if p['id']=='one')
   checks['client_endpoint_is_next_native_rise']=result['side_air_next_px']==server.native_jump_rise(5,None)
   checks['current_height_is_native_rise']=result['side_air_px']==server.native_jump_rise(4,None)
   checks['no_client_controlled_height']=result['side_air_next_px']!=999
  finally:server.now=old;h.db.close()
asyncio.run(check_host())

js='''const fs=require('fs'),vm=require('vm');let time=0;const env={window:{},performance:{now:()=>time}};
vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),env);
const v=env.window.ForgePlayableMotion.create(()=>time,88);let p={id:'one',mode:'sideview',area_id:'room',side_x:8,side_px:64,side_velocity_observed_adapter:24,side_air_px:12,side_air_next_px:9};
v.ingest({players:[p]});const initial=v.sample(p);time+=1000/60.0988/2;const half=v.sample(p);time+=1000;const stale=v.sample(p);
const base={initial_position_unchanged:initial.side_px===64,
 half_frame_horizontal_advance:Math.abs(half.side_px-64.75)<.0001,
 half_frame_vertical_next_frame_interpolation:Math.abs(half.side_air_px-10.5)<.0001,
 bounded_after_stale_socket:Math.abs(stale.side_px-65.5)<.0001&&stale.side_air_px===9};
time+=1000;p={...p,side_px:99,side_velocity_observed_adapter:-24,side_air_px:0,side_air_next_px:0};v.ingest({players:[p]});base.respawn_teleport_does_not_glide=v.sample(p).side_px===99;
time+=1000;p={...p,area_id:'other',side_px:200};v.ingest({players:[p]});base.room_change_snaps=v.sample(p).side_px===200;
const old={id:'two',mode:'sideview',area_id:'room',side_x:9,side_px:73,side_air_px:4};v.ingest({players:[old]});time+=5;const oldR=v.sample(old);base.legacy_source_without_endpoint_is_not_delayed=oldR.side_air_px===4;
console.log(JSON.stringify(base));'''
proc=subprocess.run(['node','-e',js,str(ROOT/'host/playability.js')],text=True,capture_output=True)
if proc.returncode!=0:raise RuntimeError(proc.stderr)
checks.update(json.loads(proc.stdout))
print(json.dumps({'checks':checks,'count':len(checks)},indent=2));assert all(checks.values()),checks
