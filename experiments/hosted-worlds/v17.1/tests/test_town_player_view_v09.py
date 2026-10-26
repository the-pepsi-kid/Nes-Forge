import os
"""Offline dual-player room render using SYNTHETIC native-source-labeled art."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
import io,base64,json,os
root=Path(__file__).resolve().parents[1]
world=json.loads((root/'tests/synthetic_snapshot.json').read_text())
img=Image.new('RGBA',(256,240),(31,50,79,255));d=ImageDraw.Draw(img)
d.rectangle((0,185,255,239),fill=(96,104,69,255));d.rectangle((19,124,68,188),fill=(72,82,110,255));d.rectangle((179,109,222,187),fill=(61,85,100,255))
d.text((12,15),'SYNTHETIC TEST FRAME',fill='white')
b=io.BytesIO();img.save(b,format='PNG');png='data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
playerA={"id":"p-test-1","online":True,"x":4,"y":6,"mode":"sideview","area_id":"z2:1:0:town:4:6","side_x":8,"attack_level":1,"magic_level":1,"life_level":1,"hp":64,"mp":64,"xp":0,"earned_xp":0,"nextUpgrades":{}}
playerB={**playerA,"id":"p-test-2","side_x":12}
state={"type":"state","world":world,"revision":"v0.7-demo","stageFrames":[{"x":4,"y":6,"revision":"r-test","captureMethod":"executed-original-construction:first-screen"}],"players":[playerA,playerB],"structures":[],"progression":{"encountersEnabled":False},"online":2,"areas":[]}
errors=[];checks={}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'],headless=True)
 page=browser.new_page(viewport={'width':1350,'height':920});page.on('pageerror',lambda error:errors.append(str(error)))
 page.set_content((root/'host/client.html').read_text())
 page.add_script_tag(content='''
 window.__syntheticFrame='''+json.dumps(png)+''';
 window.__stageData='''+json.dumps(state)+''';
 window.__ws=null;
 window.ethereum={request:async({method})=>method==='eth_requestAccounts'?['0x0000000000000000000000000000000000000001']:method==='eth_chainId'?'0x1':'0x0102'};
 window.fetch=async(url)=>({ok:true,json:async()=> url.includes('/api/stage-frame')?{sha256:'r-test',png:window.__syntheticFrame}:url.includes('/api/auth/challenge')?{nonce:'n',message:'sign this',address:'0x0000000000000000000000000000000000000001'}:{sessionToken:'test-session',playerId:'p-test-1'},text:async()=>''});
 window.WebSocket=class{constructor(){this.readyState=1;window.__ws=this;setTimeout(()=>this.onopen?.(),10)}send(m){if(JSON.parse(m).type==='authenticate'){this.onmessage?.({data:JSON.stringify({type:'authenticated',playerId:'p-test-1'})});this.onmessage?.({data:JSON.stringify(window.__stageData)})}}close(){this.readyState=3}};
 ''')
 page.add_script_tag(content=(root/'host/render-world.js').read_text())
 page.add_script_tag(content=(root/'host/client.js').read_text())
 page.locator('#connect').click()
 page.wait_for_timeout(800)
 checks['shared_room_active']=page.locator('#sidePanel').is_visible()
 checks['native_source_construction_label']= 'Native scene artwork from Forge original 6502 construction' in page.locator('#sideVisualStatus').inner_text()
 checks['two_players_same_room']= '2 player(s)' in page.locator('#sideRoster').inner_text()
 checks['source_frame_loaded_as_image']=page.evaluate('''()=>{const c=document.querySelector('#sideCanvas'),g=c.getContext('2d');return Array.from(g.getImageData(130,30,1,1).data).slice(0,3).join(',') === '31,50,79'}''')
 checks['canvas_correct_ratio']=page.locator('#sideCanvas').evaluate('(c)=>c.width===640&&c.height===480')
 checks['no_js_errors']=not errors
 page.screenshot(path=str(root/'NES_Forge_3x_v09_Synthetic_Stage_View.png'))
 print(json.dumps({'checks':checks,'errors':errors},indent=2))
 browser.close()
assert all(checks.values()),(checks,errors)
