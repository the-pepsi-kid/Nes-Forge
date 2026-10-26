import os
"""Synthetic browser acceptance: shared client renders source RECORD data, not fake original graphics."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'host/client.html').read_text();js=(ROOT/'host/client.js').read_text();renderer=(ROOT/'host/render-world.js').read_text()
world=json.loads((ROOT/'tests/synthetic_snapshot.json').read_text());digest='a'*64
p={'id':'pid-1','online':True,'x':2,'y':6,'xp':50,'earned_xp':75,'attack_level':1,'magic_level':1,'life_level':1,'hp':64,'mp':64,'mode':'sideview','area_id':'z2:1:0:fairy-camp:2:6','side_x':8,'respawn_camp_id':'c1','nextUpgrades':{'attack':200,'magic':100,'life':50}}
state={'type':'state','online':1,'world':world,'revision':'test-revision','players':[p], 'areas':[{'id':p['area_id'],'occupants':[p['id']],'sceneVerified':False}], 'nativeRooms':[{'locationIndex':0,'x':2,'y':6,'digest':digest}], 'stageFrames':[], 'structures':[], 'costs':{}, 'progression':{'encountersEnabled':False}, 'seq':1}
room={'format':'nesforge.z2.native-room-record','version':1,'location':{'index':0,'x':2,'y':6,'globalY':36,'external':0,'entry':0,'terrainSource':'z2:1:0'},'source':{'bank':1,'table':34083,'scene':5,'cpu':33000,'fileOffset':16632,'length':8,'kind':'overworld'},'header':{'screenCount':2,'ground':0x51,'backgroundPalette':2},'objects':[{'x':3,'y':6,'kind':'object','code':0x40,'advance':2}], 'nativeSceneVerified':False,'originalEnginePlayable':False}
mock='''
window.ethereum={request:async({method})=>({eth_requestAccounts:['0x1111111111111111111111111111111111111111'],eth_chainId:'0x1',personal_sign:'0x'+'ab'.repeat(65)})[method]};
window.fetch=async(path,options)=>({ok:true,json:async()=>String(path).includes('native-rooms')?window.roomResponse:String(path).includes('challenge')?{nonce:'abc',message:'TEST',address:'0x1111111111111111111111111111111111111111'}:{sessionToken:'local-test',playerId:'pid-1'}});
window.WebSocket=class{static OPEN=1;constructor(url){this.readyState=1;setTimeout(()=>this.onopen&&this.onopen(),20)}send(data){if(JSON.parse(data).type==='authenticate'){this.onmessage({data:JSON.stringify({type:'authenticated',playerId:'pid-1'})});this.onmessage({data:JSON.stringify(window.mockState)})}}close(){}};
'''+ 'window.mockState='+json.dumps(state)+';window.roomResponse='+json.dumps({'format':'nesforge.z2.native-room-selection','version':1,'x':2,'y':6,'rooms':[room],'nativeSceneVerified':False})+';'
html=html.replace('<script src="/render-world.js"></script><script src="/client.js"></script>','<script>'+mock+'</script><script>'+renderer+'</script><script>'+js+'</script>')
checks={};errors=[]
with sync_playwright() as playwright:
 browser=playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=browser.new_page(viewport={'width':1420,'height':940});page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html);page.locator('#connect').click();page.wait_for_function("document.querySelector('#sideVisualStatus').textContent.includes('AUTO-RECOVERED')",timeout=10000)
 status=page.locator('#sideVisualStatus').inner_text()
 checks['native_room_records_auto_displayed']='AUTO-RECOVERED' in status
 checks['no_false_playable_claim']='NOT a rendered level' in status and 'physics' in status
 checks['shared_roster_still_visible']='1 player(s)' in page.locator('#sideRoster').inner_text()
 checks['canvas_dimensions_intact']=page.locator('#sideCanvas').evaluate('(x)=>x.width===640&&x.height===480')
 checks['no_browser_errors']=not errors
 path=ROOT/'NES_Forge_3x_v08_Synthetic_Native_Room_View.png';page.screenshot(path=str(path),full_page=True)
 print(json.dumps({'checks':checks,'errors':errors,'screenshot':str(path)},indent=2));browser.close()
assert all(checks.values()),checks
