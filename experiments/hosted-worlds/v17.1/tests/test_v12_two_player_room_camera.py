import os
"""Two wallet-like browser clients render independent 256x240 source-raster crops; SYNTHETIC art only."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
import io,base64,json
root=Path(__file__).resolve().parents[1]
world=json.loads((root/'tests/synthetic_snapshot.json').read_text())
canvas=Image.new('RGBA',(1024,240),(0,0,0,255));g=ImageDraw.Draw(canvas)
cols=[(43,66,103,255),(69,96,73,255),(112,67,104,255),(106,89,46,255)]
for i,c in enumerate(cols):
 g.rectangle((i*256,0,(i+1)*256-1,239),fill=c)
 g.rectangle((i*256+12,145,i*256+200,204),fill=(155,121,80,255))
 g.text((i*256+25,35),f'SYNTHETIC ROOM SCREEN {i+1}',fill='white')
b=io.BytesIO();canvas.save(b,format='PNG');png='data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
base={'online':True,'x':2,'y':6,'mode':'sideview','area_id':'z2:1:0:town:2:6','side_facing':1,'attack_level':1,'magic_level':1,'life_level':1,'hp':64,'mp':64,'xp':0,'earned_xp':0,'nextUpgrades':{'attack':200,'magic':100,'life':50}}
players=[{**base,'id':'synthetic1','side_x':8},{**base,'id':'synthetic2','side_x':90}]
state={'type':'state','world':world,'revision':'synthetic-source-v12','stageFrames':[{'x':2,'y':6,'revision':'synthetic-sha','captureMethod':'executed-original-construction:first-screen','widthPx':1024}],'nativeRooms':[],'players':players,'structures':[], 'progression':{'encountersEnabled':False},'online':2,'areas':[]}
errors=[];checks={}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
 pages=[]
 for idx in (0,1):
  page=browser.new_page(viewport={'width':1300,'height':1050});pages.append(page);page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content((root/'host/client.html').read_text(),wait_until='load')
  page.add_script_tag(content='''
   window.__payload='''+json.dumps(state)+''';window.__png='''+json.dumps(png)+''';window.__sent=[];
   window.ethereum={request:async({method})=>method==='eth_requestAccounts'?['0x0000000000000000000000000000000000000001']:method==='eth_chainId'?'0x1':'0x0102'};
   window.fetch=async(u)=>({ok:true,json:async()=>String(u).includes('/api/stage-frame')?{sha256:'synthetic-sha',png:window.__png,widthPx:1024,captureMethod:'executed-original-construction:first-screen'}:String(u).includes('/api/auth/challenge')?{nonce:'n',message:'sign',address:'0x0000000000000000000000000000000000000001'}:{sessionToken:'session',playerId:'''+json.dumps(players[idx]['id'])+'''},text:async()=>''});
   window.WebSocket=class{constructor(){this.readyState=1;setTimeout(()=>this.onopen?.(),10)}send(m){const v=JSON.parse(m);window.__sent.push(v);if(v.type==='authenticate'){this.onmessage?.({data:JSON.stringify({type:'authenticated',playerId:'''+json.dumps(players[idx]['id'])+'''})});this.onmessage?.({data:JSON.stringify(window.__payload)})}}close(){this.readyState=3}};
  ''')
  page.add_script_tag(content=(root/'host/render-world.js').read_text());page.add_script_tag(content=(root/'host/client.js').read_text())
  page.locator('#connect').click()
  page.wait_for_function("document.querySelector('#sideVisualStatus')?.textContent.includes('ORIGINAL ROOM ART')",timeout=20000)
  checks[f'client_{idx+1}_256x240']=page.locator('#sideCanvas').evaluate('(c)=>c.width===256&&c.height===240')
  checks[f'client_{idx+1}_source_raster_1024']= '1024×240' in page.locator('#sideVisualStatus').inner_text()
  page.screenshot(path=str(root/('v12_synthetic_player_'+str(idx+1)+'.png')))
 # Source backgrounds differ (player2 camera is over room screen 3)
 img1=pages[0].locator('#sideCanvas').evaluate('(c)=>Array.from(c.getContext("2d").getImageData(220,70,1,1).data)')
 img2=pages[1].locator('#sideCanvas').evaluate('(c)=>Array.from(c.getContext("2d").getImageData(220,70,1,1).data)')
 checks['two_players_receive_different_room_crops']=img1!=img2
 checks['screen_1_pixel_grounded']=img1[:3]==list(cols[0][:3])
 checks['screen_4_pixel_grounded']=img2[:3]==list(cols[3][:3])
 checks['two_player_markers_share_server_room']='2 player(s)' in pages[0].locator('#sideRoster').inner_text() and '2 player(s)' in pages[1].locator('#sideRoster').inner_text()
 pages[0].locator('#pvpTestAttack').click()
 checks['existing_network_attack_command_preserved']=pages[0].evaluate("window.__sent.some(x=>x.type==='pvp_test_attack')")
 checks['no_js_errors']=not errors
 browser.close()
print(json.dumps({'checks':checks,'errors':errors},indent=2))
assert all(checks.values()),checks
