import os
"""Browser native 256×240 pixel viewport / two-player overlay / explicit network attack command."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
import io,base64,json
root=Path(__file__).resolve().parents[1]
world=json.loads((root/'tests/synthetic_snapshot.json').read_text())
im=Image.new('RGBA',(256,240),(31,50,79,255));d=ImageDraw.Draw(im)
d.rectangle((0,194,255,239),fill=(81,103,70,255));d.rectangle((16,110,77,194),fill=(103,105,161,255));d.rectangle((148,130,216,194),fill=(102,136,115,255))
d.text((12,14),'SYNTHETIC 256x240 FRAME',fill='white')
b=io.BytesIO();im.save(b,format='PNG');png='data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
p1={'id':'test-p1','online':True,'x':2,'y':6,'mode':'sideview','area_id':'z2:1:0:town:2:6','side_x':8,'side_facing':1,'attack_level':1,'magic_level':1,'life_level':1,'hp':64,'mp':64,'xp':0,'earned_xp':0,'nextUpgrades':{'attack':200,'magic':100,'life':50}}
p2={**p1,'id':'test-p2','side_x':10,'hp':56}
state={'type':'state','world':world,'revision':'demo','stageFrames':[{'x':2,'y':6,'revision':'sha-synth','captureMethod':'executed-original-construction:first-screen'}],'players':[p1,p2],'structures':[],'progression':{'encountersEnabled':False},'online':2,'areas':[]}
errors=[];checks={}
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1350,'height':960});page.on('pageerror',lambda error:errors.append(str(error)))
 page.set_content((root/'host/client.html').read_text())
 page.add_script_tag(content='''
  window.__image='''+json.dumps(png)+''';window.__mockState='''+json.dumps(state)+''';window.__sent=[];
  window.ethereum={request:async({method})=>method==='eth_requestAccounts'?['0x0000000000000000000000000000000000000001']:method==='eth_chainId'?'0x1':'0x0102'};
  window.fetch=async(u)=>({ok:true,json:async()=>String(u).includes('/api/stage-frame')?{sha256:'sha-synth',png:window.__image}:String(u).includes('/api/auth/challenge')?{nonce:'n',message:'sign',address:'0x0000000000000000000000000000000000000001'}:{sessionToken:'session',playerId:'test-p1'},text:async()=>''});
  window.WebSocket=class{constructor(){this.readyState=1;setTimeout(()=>this.onopen?.(),10)}send(m){const payload=JSON.parse(m);window.__sent.push(payload);if(payload.type==='authenticate'){this.onmessage?.({data:JSON.stringify({type:'authenticated',playerId:'test-p1'})});this.onmessage?.({data:JSON.stringify(window.__mockState)})}}close(){this.readyState=3}};
 ''')
 page.add_script_tag(content=(root/'host/render-world.js').read_text())
 page.add_script_tag(content=(root/'host/client.js').read_text())
 page.locator('#connect').click();page.wait_for_function('document.querySelector("#sideVisualStatus")?.textContent.includes("VERIFIED SOURCE ART")',timeout=20000)
 checks['native_ppu_resolution_256x240']=page.locator('#sideCanvas').evaluate('(c)=>c.width===256&&c.height===240')
 checks['initial_pixel_true_to_source']=page.evaluate("Array.from(document.querySelector('#sideCanvas').getContext('2d').getImageData(40,40,1,1).data).slice(0,3).join(',')==='31,50,79'")
 checks['both_in_single_occupied_area']='2 player(s)' in page.locator('#sideRoster').inner_text()
 page.locator('#pvpTestAttack').click()
 checks['ui_sends_explicit_test_not_native_action']=page.evaluate("window.__sent.some(x=>x.type==='pvp_test_attack')")
 checks['button_emphasizes_test']='(test)' in page.locator('#pvpTestAttack').inner_text()
 checks['no_page_exceptions']=not errors
 page.screenshot(path=str(root/'NES_Forge_v10_Synthetic_256x240_PvP_Preview.png'))
 print(json.dumps({'checks':checks,'errors':errors},indent=2));b.close()
assert all(checks.values()),checks
