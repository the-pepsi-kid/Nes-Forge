import os
"""Independent per-client 256x240 visual scroll + native scene regression, synthetic art only."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64,io,json
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]
world=json.loads((root/'tests/synthetic_snapshot.json').read_text())
# deterministic atlas for displaying actual cropped world tiles
atlas=Image.new('RGBA',(256,16),(0,0,0,255));d=ImageDraw.Draw(atlas)
for tile in range(16):d.rectangle((tile*16,0,tile*16+15,15),fill=(tile*12,64+tile*7,125,255))
f=io.BytesIO();atlas.save(f,format='PNG')
world['art']={'format':'png-atlas-16x16-v1','png':'data:image/png;base64,'+base64.b64encode(f.getvalue()).decode()}
players=[]
for i,(x,y) in enumerate(((3,6),(34,33)),1):players.append({'id':'user'+str(i),'online':True,'x':x,'y':y,'mode':'overworld','side_x':8,'area_id':'','attack_level':1,'magic_level':1,'life_level':1,'hp':64,'mp':64,'xp':0,'earned_xp':0,'nextUpgrades':{'attack':200,'magic':100,'life':50}})
state={'type':'state','world':world,'revision':'camera-synth','stageFrames':[],'players':players,'structures':[], 'progression':{'encountersEnabled':False},'online':2,'areas':[]}
checks={};errors=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
 pages=[]
 for i in range(2):
  page=browser.new_page(viewport={'width':1250,'height':1000});pages.append(page)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content((root/'host/client.html').read_text(),wait_until='load')
  page.add_script_tag(content='window.__sent=[];window.fetch=async(url)=>({ok:true,json:async()=>String(url).includes("challenge")?{nonce:"n",message:"please sign",address:"0x0000000000000000000000000000000000000001"}:{sessionToken:"session",playerId:'+json.dumps(players[i]['id'])+'},text:async()=>""});window.ethereum={request:async({method})=>method==="eth_requestAccounts"?["0x0000000000000000000000000000000000000001"]:method==="eth_chainId"?"0x1":"0x0102"};window.WebSocket=class{constructor(){this.readyState=1;setTimeout(()=>this.onopen?.(),10)}send(m){const obj=JSON.parse(m);window.__sent.push(obj);if(obj.type==="authenticate"){this.onmessage?.({data:JSON.stringify({type:"authenticated",playerId:'+json.dumps(players[i]['id'])+'})});this.onmessage?.({data:JSON.stringify(window.__mockState)})}}close(){this.readyState=3}};window.__mockState='+json.dumps(state)+';')
  page.add_script_tag(content=(root/'host/render-world.js').read_text());page.add_script_tag(content=(root/'host/client.js').read_text())
  page.locator('#connect').click()
  page.wait_for_timeout(2500);print('DEBUG',i,page.locator('#cameraStatus').inner_text(),page.locator('#authStatus').inner_text(),page.locator('#log').inner_text()[:500],errors)
  print('ART',page.locator('#artStatus').inner_text())
 checks['both_clients_256x240']=all(p.locator('#world').evaluate('(c)=>c.width===256&&c.height===240') for p in pages)
 cameras=[p.evaluate('window.ForgeHostedRenderer.makeCamera(window.__mockState.world,window.__mockState.players['+str(i)+'])') for i,p in enumerate(pages)]
 checks['independent_camera_positions']=cameras[0]!=cameras[1] and cameras[0]['x']==0 and cameras[0]['y']==0 and cameras[1]['x']>0 and cameras[1]['y']>0
 checks['two_clients_show_distinct_pixels']=pages[0].locator('#world').evaluate('(c)=>c.toDataURL()')!=pages[1].locator('#world').evaluate('(c)=>c.toDataURL()')
 for page in pages:page.screenshot(path=str(root/('v11_camera_player_'+str(pages.index(page)+1)+'.png')))
 # Move player1 to corner and verify edge clamp. Move player2 to furthest corner and verify maximum clamp.
 checks['max_edge_clamp']=pages[1].evaluate('''() => {const w=window.__mockState.world;let c=window.ForgeHostedRenderer.makeCamera(w,{x:w.width-1,y:w.height-1});return c.x===w.width*16-256&&c.y===w.height*16-240}''')
 # map click converts viewport + scroll offsets into authoritative coordinates
 page=pages[1]
 page.locator('#world').click(position={'x':85,'y':85})
 click=page.locator('#target').inner_text()
 cam=page.evaluate('window.ForgeHostedRenderer.makeCamera(window.__mockState.world,window.__mockState.players[1])')
 box=page.locator('#world').bounding_box()
 x=int((85/box['width']*256+cam['x'])/16);y=int((85/box['height']*240+cam['y'])/16)
 checks['viewport_click_targets_correct_world_cell']=click==f'Target: ({x}, {y})'
 checks['not_original_camera_claim']='not verified' in pages[0].locator('#cameraStatus').inner_text().lower()
 checks['no_browser_js_errors']=not errors
 print(json.dumps({'checks':checks,'cameras':cameras,'errors':errors},indent=2))
 browser.close()
assert all(checks.values()),checks
