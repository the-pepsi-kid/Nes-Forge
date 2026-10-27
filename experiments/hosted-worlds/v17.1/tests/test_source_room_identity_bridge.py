"""ROM-free Z2 source-room identity gate; NO gameplay/exit/collision parity claims.

Tests server binding of published source metadata to multiplayer room instances.
"""
import asyncio, hashlib, json, sys, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'host'))
from server import Host,canonical

world=json.loads((ROOT/'tests/synthetic_snapshot.json').read_text())
world['terrain'][6*world['width']+2]=0
world['terrain'][6*world['width']+3]=0
world['terrain'][6*world['width']+1]=9
checks={}

def native_record(index,x=2,y=6,scene=5):
    return {
      'format':'nesforge.z2.native-room-record','version':1,
      'location':{'index':index,'x':x,'y':y,'globalY':y+30,'external':0,'entry':0,'terrainSource':world['sourceWorldId']},
      'source':{'bank':1,'table':0x8523,'scene':scene,'cpu':0x8000,'fileOffset':16400,'length':4,'kind':'town'},
      'header':{'objectSet':0,'screenCount':1,'grass':False,'bushes':False,'flags':0,'ground':0,'groundTileSet':0,'initialGroundPosition':0,'ceilingDisabled':False,'palette':0,'backgroundPalette':0,'backMap':0},
      'exits':[{'side':side,'map':63,'screen':0,'outside':True} for side in ('left','down','up','right')],
      'objects':[],'evidence':'Synthetic room provenance for network identity only; not actual ROM data',
      'nativeSceneVerified':False,'originalEnginePlayable':False
    }

def add_record(host,r):
    serialized=host.validate_native_room(r,world)
    loc=r['location']
    digest=hashlib.sha256(serialized.encode()).hexdigest()
    host.db.execute('INSERT INTO native_room_records(world_id,location_index,x,y,payload,digest) VALUES(?,?,?,?,?,?)',
        (world['sourceWorldId'],loc['index'],loc['x'],loc['y'],serialized,digest))
    return digest

async def main():
    with tempfile.TemporaryDirectory() as td:
      db=Path(td)/'source-identity.db'
      host=Host(db,'unit-test-secret')
      host.world=world;host.revision='synthetic-world'
      players=['p-one','p-two']
      for n,pid in enumerate(players):
          host.db.execute('INSERT INTO players(id,address,x,y,xp,level) VALUES(?,?,?,?,?,?)',
              (pid,'0x'+str(n+1)*40,2,6,100+n,1))
      checks['pilot_legacy_area_without_catalog']=host.select_source_area(host.player(players[0]))['areaId'].endswith(':town:2:6')
      digest=add_record(host,native_record(5))
      checks['unique_location_binds_source_identity']=host.select_source_area(host.player(players[0]))['sourceRoom']['locationIndex']==5
      entries=[]
      for pid in players:
          entries.append(await host.action(pid,{'type':'enter_area'}))
      a,b=entries
      checks['two_players_share_source_record_instance']=a['ok'] and b['ok'] and a['areaId']==b['areaId'] and ':source-room:5:' in a['areaId']
      checks['area_id_pins_record_digest']=a['areaId'].endswith(digest)
      state=host.public()
      players_state={p['id']:p for p in state['players']}
      checks['shared_state_exposes_source_identity']=all(players_state[p]['sourceRoom']['sourceScene']==5 for p in players)
      checks['shared_room_source_meta_not_native_playability']=len(state['areas'])==1 and state['areas'][0]['sourceRoom']['nativeSceneVerified'] is False and state['areas'][0]['sourceRoom']['destinationVerified'] is False
      checks['player_persistent_values_unchanged']=players_state[players[0]]['xp']==100 and players_state[players[1]]['xp']==101
      checks['source_record_bound_on_reconnect_state']=host.source_binding_for_area(a['areaId'])['locationIndex']==5
      checks['ordinary_exit_kept_as_provisional']=bool((await host.action(players[0],{'type':'leave_area'})).get('ok')) and host.player(players[0])['x']==2
      checks['other_player_keeps_shared_instance']=host.player(players[1])['area_id']==a['areaId']
      host.db.execute("UPDATE players SET mode='overworld',area_id='',x=2,y=6 WHERE id=?",(players[1],))
      add_record(host,native_record(6,scene=6))
      rejected=await host.action(players[0],{'type':'enter_area'})
      checks['ambiguous_native_entrance_rejected']=rejected.get('candidateLocationIndices')==[5,6] and 'error' in rejected
      checks['ambiguous_entry_preserves_player_position']=host.player(players[0])['mode']=='overworld' and host.player(players[0])['x']==2
      host.db.execute("UPDATE players SET x=1,y=6,mode='overworld',area_id='' WHERE id=?",(players[0],))
      result=await host.action(players[0],{'type':'move','dx':1,'dy':0})
      checks['ambiguous_autoentry_rejected_before_step']=bool(result.get('error')) and (host.player(players[0])['x'],host.player(players[0])['y'])==(1,6) and host.player(players[0])['steps']==0
      host.db.execute('DELETE FROM native_room_records WHERE location_index=6')
      result=await host.action(players[0],{'type':'move','dx':1,'dy':0})
      checks['autoentry_binds_unique_native_location']=result.get('autoEntered') and result['sourceRoom']['locationIndex']==5 and host.player(players[0])['area_id']==a['areaId']
      host.db.execute("UPDATE players SET mode='overworld',area_id=''")
      add_record(host,native_record(9,3,6,8))
      host.db.execute('UPDATE players SET x=3,y=6 WHERE id=?',(players[0],))
      other=await host.action(players[0],{'type':'enter_area'})
      checks['distinct_location_index_is_distinct_instance']=other.get('ok') and ':source-room:9:' in other['areaId'] and other['areaId']!=a['areaId']
      host.db.close()
      restarted=Host(db,'unit-test-secret');restarted.world=world
      checks['source_binding_survives_restart']=restarted.source_binding_for_area(other['areaId'])['locationIndex']==9
      restarted.db.close()

asyncio.run(main())
print(json.dumps(checks,indent=2))
assert all(checks.values()),checks
