"""Private-ROM browser acceptance for Rauru floor alignment and crouch input.
Requires NES_FORGE_Z2_ROM; no original art/media is written into the kit.
"""
import base64,hashlib,json,os,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
from io import BytesIO
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R))
from PREPARE_PRIVATE_Z2_DEMO import original_assets
rom=Path(os.environ['NES_FORGE_Z2_ROM']).read_bytes()
assets=original_assets(rom,os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'))
room=assets['stage']['png'];poses=assets['poses']['png']
img=Image.open(BytesIO(base64.b64decode(room.partition(',')[2]))).convert('RGBA')
atlas=Image.open(BytesIO(base64.b64decode(poses.partition(',')[2]))).convert('RGBA')
checks={}
checks['source_floor_real_rom_row_208']=all(img.getpixel((x,208))[:3]==(160,170,0) for x in range(8,img.width,24))
checks['source_character_body_pixels_opaque']=all(a==255 for r,g,b,a in atlas.getdata() if a!=0)
checks['source_character_margin_transparent']=atlas.getpixel((0,0))[3]==0
state={'type':'state','world':json.loads((R/'tests/synthetic_snapshot.json').read_text()),'revision':'r3','stageFrames':[{'x':2,'y':6,'revision':'stage-sha','captureMethod':'executed-original-construction:first-screen','widthPx':img.width}], 'nativeRooms':[], 'playerPoses':{'sha256':'pose-sha','nativeAnimationVerified':False},'online':2,'structures':[],'progression':{'encountersEnabled':False},'players':[]}
for i,x in enumerate((8,18)):
 state['players'].append({'id':'p'+str(i),'online':True,'x':2,'y':6,'mode':'sideview','area_id':'z2:1:0:town:2:6','side_x':x,'side_facing':1,'side_air_px':0,'side_pose':0,'side_action':'idle','attack_level':1,'magic_level':1,'life_level':1,'xp':0,'earned_xp':0,'hp':64,'mp':64,'nextUpgrades':{'attack':200,'magic':100,'life':50}})
errors=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
 p=b.new_page(viewport={'width':1320,'height':1000});p.on('pageerror',lambda e:errors.append(str(e)))
 html=(R/'host/client.html').read_text()
 html=html.replace('<script src="/render-world.js"></script>','').replace('<script src="/playability.js"></script>','').replace('<script src="/native-link-client.js"></script>','').replace('<script src="/client.js"></script>','')
 p.set_content(html,wait_until='load')
 p.evaluate('''({state,room,poses})=>{
   window.__state=state;window.__room=room;window.__poses=poses;window.__sent=[];
   window.ethereum={request:async({method})=>method==='eth_requestAccounts'?['0x'+'1'.repeat(40)]:method==='eth_chainId'?'0x1':'0xabcdef'};
   window.fetch=async url=>{const u=String(url),v=u.includes('/api/stage-frame')?{sha256:'stage-sha',png:window.__room,widthPx:1024}:u.includes('/api/player-poses')?{sha256:'pose-sha',png:window.__poses,cellWidth:32,cellHeight:40,nativeAnimationVerified:false}:u.includes('/api/auth/challenge')?{nonce:'n',message:'sign',address:'0x'+'1'.repeat(40)}:{sessionToken:'session',playerId:'p0'};
    return {ok:true,json:async()=>v,text:async()=>''};};
   window.WebSocket=class{constructor(){this.readyState=1;window.__socket=this;setTimeout(()=>this.onopen?.(),5)}send(msg){const d=JSON.parse(msg);window.__sent.push(d);if(d.type==='authenticate')setTimeout(()=>{this.onmessage?.({data:JSON.stringify({type:'authenticated',playerId:'p0'})});this.onmessage?.({data:JSON.stringify(window.__state)})},10)}close(){this.readyState=3}};
 }''',{'state':state,'room':room,'poses':poses})
 for file in ['render-world.js','playability.js','native-link-client.js','client.js']:
  p.add_script_tag(content=(R/'host'/file).read_text())
 p.locator('#connect').click()
 p.wait_for_function("document.getElementById('sideVisualStatus')?.textContent.includes('VISUAL FLOOR 208px') && document.getElementById('sideVisualStatus')?.textContent.includes('LINK OAM/CHR ART LOADED')",timeout=12000)
 info=p.locator('#sideCanvas').evaluate('''c=>{const g=c.getContext('2d'),get=(x,y)=>Array.from(g.getImageData(x,y,1,1).data);
   const colors=[];for(let x=0;x<c.width;x++)colors.push(get(x,207));
   return {ground:get(20,208),charactersAtFeet:colors.filter(c=>c[0]===222&&c[1]===173&&c[2]===106).length};}''')
 checks['two_grounded_original_link_feet_at_207']=info['charactersAtFeet']>1
 checks['room_floor_pixel_intact']=info['ground'][:3]==[160,170,0]
 if os.environ.get('NES_FORGE_PRIVATE_SCREENSHOT'):p.locator('#sideCanvas').screenshot(path=os.environ['NES_FORGE_PRIVATE_SCREENSHOT'])
 p.keyboard.down('ArrowDown');p.wait_for_timeout(100);p.keyboard.up('ArrowDown')
 messages=p.evaluate('window.__sent')
 checks['crouch_hold_release_reaches_socket']=any(x.get('type')=='side_nes_direction' and x.get('direction')=='down' for x in messages) and any(x.get('type')=='side_nes_direction' and x.get('direction')=='neutral' for x in messages)
 p.keyboard.down('ArrowUp');p.wait_for_timeout(45);p.keyboard.up('ArrowUp')
 p.keyboard.press('Space')
 messages=p.evaluate('window.__sent')
 checks['up_hold_and_release_relayed']=any(x.get('type')=='side_nes_direction' and x.get('direction')=='up' for x in messages) and sum(x.get('type')=='side_nes_direction' and x.get('direction')=='neutral' for x in messages)>=2
 checks['jump_input_sent_to_authoritative_host']=any(x.get('type')=='side_jump' for x in messages)
 p.locator('#sideHoldUp').dispatch_event('pointerdown')
 p.locator('#sideHoldUp').dispatch_event('pointerup')
 checks['touch_up_input_supported']=sum(x.get('type')=='side_nes_direction' and x.get('direction')=='up' for x in p.evaluate('window.__sent'))>=2
 p.evaluate('''()=>{window.__state.players[0].side_air_px=26;window.__state.players[0].side_pose=6;window.__state.players[0].side_action='jump';window.__socket.onmessage({data:JSON.stringify(window.__state)});}''')
 p.wait_for_timeout(125)
 info2=p.locator('#sideCanvas').evaluate('''c=>{const g=c.getContext('2d');let rows=[];for(let y=130;y<202;y++){let n=0;for(let x=45;x<95;x++){const d=g.getImageData(x,y,1,1).data;if(d[0]===222&&d[1]===173&&d[2]===106)n++;}if(n)rows.push([y,n]);}return rows;}''')
 checks['jump_moves_sprite_up_from_floor']=len(info2)>0 and min(y for y,n in info2)<178
 print('jump opaque body rows:',info2,flush=True)
 checks['no_browser_errors']=not errors
 b.close()
print(json.dumps({'checks':checks,'errors':errors},indent=2));assert all(checks.values()),checks
