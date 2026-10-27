"""Bounded test-only gameplay-POC assertions. No Nintendo gameplay-accuracy claim."""
import sys,asyncio,tempfile,json,uuid
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'host'))
from server import Host,LEVEL_COSTS,ENCOUNTER_STEPS
world=json.loads((root/'tests/synthetic_snapshot.json').read_text())
checks={}
async def test():
 with tempfile.TemporaryDirectory() as d:
  db=Path(d)/'test.sqlite3';h=Host(db,'super secret test admin',experimental_encounters=True)
  p=str(uuid.uuid4());x,y=h.spawn(world)
  h.world=world;h.revision='test-revision'
  h.db.execute('INSERT INTO players(id,address,x,y,xp,level) VALUES(?,?,?,?,?,?)',(p,'0x'+'1'*40,x,y,300,1))
  # Source v0.4 economy balances are retained after upgrade.
  assert h.player(p)['earned_xp'] == 0
  h.db.execute('UPDATE players SET earned_xp=300 WHERE id=?',(p,))
  before=h.player(p)
  r=await h.action(p,{'type':'level_up','skill':'attack'})
  checks['attack_level_2_cost_200']=r['ok'] and h.player(p)['xp']==100 and h.player(p)['attack_level']==2
  r=await h.action(p,{'type':'level_up','skill':'life'})
  checks['life_level_2_cost_50']=r['ok'] and h.player(p)['xp']==50 and h.player(p)['life_level']==2
  r=await h.action(p,{'type':'level_up','skill':'attack'})
  checks['unaffordable_upgrade_rejected']='error' in r and h.player(p)['attack_level']==2
  checks['earned_xp_not_spent']=h.player(p)['earned_xp']==300
  checks['original_z2_us_threshold_reference']=LEVEL_COSTS['attack'][2]==200 and LEVEL_COSTS['magic'][2]==100 and LEVEL_COSTS['life'][2]==50
  # Deterministic experiment: force step counter 7, resolve an encounter in grassy biome.
  h.db.execute('UPDATE players SET steps=? WHERE id=?',(ENCOUNTER_STEPS-1,p))
  h.encounter_start(p,h.player(p),5)
  check_p=h.player(p)
  checks['provisional_encounter_uses_real_enemy']=check_p['mode']=='encounter' and check_p['encounter']=='Bot'
  blocked=await h.action(p,{'type':'move','dx':1,'dy':0})
  checks['overworld_input_blocked_during_encounter']='error' in blocked
  xp_before=check_p['xp'];earned_before=check_p['earned_xp']
  for _ in range(8):
   r=await h.action(p,{'type':'encounter_action','action':'strike'})
   if h.player(p)['mode']=='overworld':break
  q=h.player(p)
  checks['server_combat_earn_xp']=q['mode']=='overworld' and q['xp']==xp_before+2 and q['earned_xp']==earned_before+2
  checks['life_level_survives_combat']=q['life_level']==2 and q['hp']<=64 and q['mp']==64
  false=await h.action(p,{'type':'encounter_action','action':'strike'})
  checks['no_farming_without_encounter']='error' in false
  h.db.close()
  again=Host(db,'super secret test admin')
  q2=again.player(p)
  checks['wallet_progression_persists_restart']=all(q2[k]==q[k] for k in ('earned_xp','xp','attack_level','magic_level','life_level','hp','mp'))
  checks['placeholder_encounters_default_off']=not again.experimental_encounters
  again.world=world
  rej=await again.action(p,{'type':'encounter_action','action':'strike'})
  checks['reject_fake_combat_by_default']='error' in rej
  again.db.close()
asyncio.run(test())
print(json.dumps(checks,indent=2))
assert all(checks.values()),checks
