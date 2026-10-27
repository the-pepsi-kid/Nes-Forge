"""NES Forge original-Z2 content boundary and anti-regression acceptance."""
from pathlib import Path
import sys,asyncio,tempfile,uuid,json
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'host'))
from server import Host,LEVEL_COSTS
from aiohttp import web
checks={}
manifest=json.loads((root/'Z2_AUTHENTICITY_GUARDRAILS.json').read_text())
checks['only_original_z2_player_levels']=set(LEVEL_COSTS)=={'attack','magic','life'} and manifest['primaryStats']==['attack','magic','life']
checks['full_western_nes_level_table']=LEVEL_COSTS=={
 'attack':[0,0,200,500,1000,2000,3000,5000,8000],
 'magic':[0,0,100,300,700,1200,2200,3500,6000],
 'life':[0,0,50,150,400,800,1500,2500,4000]
}
checks['original_spell_roster_only']=[sp['name'] for sp in manifest['spells']]==['Shield','Jump','Life','Fairy','Fire','Reflect','Spell','Thunder']
checks['alternate_characters_not_falsely_playable']=all('candidate;' in c['status'] for c in manifest['playerAvatars'] if c['name']!='Link') and [c['name'] for c in manifest['playerAvatars']].count('Link')==1
checks['fake_encounters_are_explicit_opt_in']=manifest['hostImplementation']['nativeRegionEncounterTable'].find('disabled by default')!=-1
async def run():
 with tempfile.TemporaryDirectory() as d:
  h=Host(Path(d)/'db.sqlite3','admin')
  pid=str(uuid.uuid4())
  h.world=json.loads((root/'tests/synthetic_snapshot.json').read_text());h.revision='test'
  x,y=h.spawn(h.world)
  h.db.execute('INSERT INTO players(id,address,x,y,xp,level) VALUES(?,?,?,?,?,?)',(pid,'0x'+'1'*40,x,y,10000,1))
  p=h.player(pid)
  assert p['hp']==64 and p['mp']==64
  for skill in ('life','magic'):
   result=await h.action(pid,{'type':'level_up','skill':skill})
   checks[f'{skill}_level_increased']=result.get('ok') and h.player(pid)[skill+'_level']==2
  q=h.player(pid)
  checks['levels_do_not_falsely_add_containers']=q['hp']==64 and q['mp']==64
  checks['encounter_sim_off_by_default']=not h.experimental_encounters and not h.public()['progression']['encountersEnabled']
  checks['native_combat_is_not_claimed']=bool('NOT native Zelda II combat' in h.public()['simulation'])
  res=await h.action(pid,{'type':'encounter_action','action':'strike'})
  checks['unrecovered_combat_rejected']='error' in res
  checks['account_persistence_preserved']=bool(h.player(pid)['id'])
  h.db.close()
asyncio.run(run())
print(json.dumps({'checks':checks,'passed':sum(checks.values()),'total':len(checks)},indent=2))
assert all(checks.values()),checks
