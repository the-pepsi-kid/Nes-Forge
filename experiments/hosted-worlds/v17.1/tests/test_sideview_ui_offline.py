import os
"""Isolated chromium player preview; mocked wallet/socket/state; no localhost network or copyrighted art."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
html=(root/'host/client.html').read_text();js=(root/'host/client.js').read_text();renderer=(root/'host/render-world.js').read_text()
world=json.loads((root/'tests/synthetic_snapshot.json').read_text())
players=[]
for i in range(3):
 players.append({'id':'pid-'+str(i+1),'online':True,'x':2,'y':6,'xp':50,'earned_xp':110,'attack_level':1,'magic_level':1,'life_level':1,'hp':64,'mp':64,'mode':'sideview','area_id':'z2:1:0:fairy-camp:2:6','side_x':4+i*4,'respawn_camp_id':'c1', 'nextUpgrades':{'attack':200,'magic':100,'life':50}})
state={'type':'state','online':3,'world':world,'revision':'mock-revision','players':players,'areas':[{'id':players[0]['area_id'],'occupants':[p['id'] for p in players],'sceneVerified':False}],'structures':[{'id':'c1','player_id':'pid-1','kind':'camp','x':2,'y':6}],'costs':{'camp':20,'boss':30,'defense':15,'boss_hp':10},'progression':{'encountersEnabled':False},'seq':1}
mock="""
window.ethereum={request:async({method})=>({eth_requestAccounts:['0x1111111111111111111111111111111111111111'],eth_chainId:'0x1',personal_sign:'0x'+'ab'.repeat(65)})[method]};
window.fetch=async(path,options)=>({ok:true,json:async()=>path.includes('challenge')?{nonce:'abc',message:'TEST',address:'0x1111111111111111111111111111111111111111'}:{sessionToken:'local-test',playerId:'pid-1'}});
window.WebSocket=class{static OPEN=1;constructor(url){this.readyState=1;window.activeTestSocket=this;setTimeout(()=>this.onopen&&this.onopen(),20)}send(data){this.lastAction=data;if(JSON.parse(data).type==='authenticate'){this.onmessage({data:JSON.stringify({type:'authenticated',playerId:'pid-1'})});this.onmessage({data:JSON.stringify(window.mockState)})}}close(){}};
"""+'window.mockState='+json.dumps(state)+';'
html=html.replace('<script src="/render-world.js"></script><script src="/client.js"></script>','<script>'+mock+'</script><script>'+renderer+'</script><script>'+js+'</script>')
checks={};errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1460,'height':950})
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html)
 page.locator('#connect').click()
 page.wait_for_function("document.querySelector('#sidePanel').hidden===false",timeout=8000)
 checks['shared_sideview_screen_visible']=page.locator('#sidePanel').is_visible()
 checks['three_room_players_displayed']='3 player(s)' in page.locator('#sideRoster').inner_text()
 checks['area_id_displayed']= 'fairy-camp' in page.locator('#sideHint').inner_text()
 checks['recovered_engine_not_claimed']='NOT ORIGINAL Z2' in page.locator('body').inner_text()
 checks['side_controls_present']=all(page.locator('#'+v).count()==1 for v in ('sideLeft','sideRight','leaveArea','enterArea'))
 page.locator('#sideRight').click()
 checks['click_side_step_sends_command']=page.evaluate("JSON.parse(window.activeTestSocket.lastAction||'null')?.type==='side_step' && JSON.parse(window.activeTestSocket.lastAction).direction===1")
 checks['no_page_errors']=not errors
 path=root/'NES_Forge_3x_Shared_Sideview_Experimental.png';page.screenshot(path=str(path),full_page=True)
 print(json.dumps({'checks':checks,'errors':errors,'screenshot':str(path)},indent=2));browser.close()
assert all(checks.values()),checks
