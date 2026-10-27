import os
"""Isolated browser smoke for HTML/JS, no localhost navigation and no real wallet."""
from pathlib import Path
import json,base64
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'host/client.html').read_text()
js=(root/'host/client.js').read_text()
renderer=(root/'host/render-world.js').read_text()
world=json.loads((root/'tests/synthetic_snapshot.json').read_text())
mock='''
window.ethereum={request:async({method})=>({eth_requestAccounts:['0x1111111111111111111111111111111111111111'],eth_chainId:'0x1',personal_sign:'0x'+'ab'.repeat(65)})[method]};
window.fetch=async(path,options)=>({ok:true,json:async()=>path.includes('challenge')?{nonce:'abc',message:'TEST',address:'0x1111111111111111111111111111111111111111'}:{sessionToken:'local-test',playerId:'pid-1'}});
window.WebSocket=class{
 static OPEN=1;constructor(url){this.readyState=1;window.activeTestSocket=this;setTimeout(()=>this.onopen&&this.onopen(),50)}
 send(data){const input=JSON.parse(data);if(input.type==='authenticate'){this.onmessage({data:JSON.stringify({type:'authenticated',playerId:'pid-1'})});this.onmessage({data:JSON.stringify(window.testWorldState)})}}
 close(){};
};
'''
state={
 'type':'state','progression':{'encountersEnabled':True},'world':world,'online':1,'revision':'test','players':[{
 'id':'pid-1','online':True,'x':3,'y':6,'xp':150,'earned_xp':350,'attack_level':2,'magic_level':1,
 'life_level':2,'hp':61,'mp':64,'mode':'encounter','encounter':'Bot','enemy_hp':3,
 'nextUpgrades':{'attack':500,'magic':100,'life':150}}],
 'structures':[]
}
mock+='window.testWorldState='+json.dumps(state)+';'
html=html.replace('<script src="/render-world.js"></script><script src="/client.js"></script>', '<script>'+mock+'</script><script>'+renderer+'</script><script>'+js+'</script>')
url='data:text/html;base64,'+base64.b64encode(html.encode()).decode()
errors=[];checks={}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1320,'height':920})
 page.on('pageerror',lambda exc:errors.append(str(exc)))
 page.set_content(html)
 checks['three_original_stats_visible']=all(page.locator('#'+v).count()==1 for v in ('attackLevel','magicLevel','lifeLevel'))
 checks['eight_spell_names_not_faked_as_implemented']='Spell (cast)' not in page.content()
 page.locator('#connect').click()
 page.wait_for_function("document.querySelector('#encounterPanel').hidden===false",timeout=8000)
 checks['signed_mock_player_stats_rendered']=page.locator('#attackLevel').inner_text()=='2' and page.locator('#lifeLevel').inner_text()=='2'
 checks['original_enemy_name_rendered']='Bot' in page.locator('#encounterInfo').inner_text()
 checks['pilot_combat_explicitly_disclosed']='unverified' in page.locator('#encounterPanel').inner_text().lower()
 checks['controls_present']=all(page.locator('#'+v).count()==1 for v in ('attackEnemy','guardEnemy','fleeEnemy'))
 checks['offline_script_errors_absent']=not errors
 (root/'NES_Forge_3x_Gameplay_Experiment_UI.png').parent.mkdir(parents=True,exist_ok=True)
 page.screenshot(path=str(root/'NES_Forge_3x_Gameplay_Experiment_UI.png'),full_page=True)
 browser.close()
print(json.dumps({'checks':checks,'errors':errors},indent=2))
assert all(checks.values()),checks
