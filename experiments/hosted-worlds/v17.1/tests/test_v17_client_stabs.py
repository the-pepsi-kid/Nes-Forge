import os
"""v17 original-ROM-backed source pose projection into two player canvases.
Requires NES_FORGE_Z2_ROM; ROM/art bytes never embedded in release package.
"""
import os,base64,json,hashlib,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
rom=Path(os.environ['NES_FORGE_Z2_ROM']).read_bytes()
checks={};errors=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
 source=browser.new_page();source.on('pageerror',lambda e:errors.append(str(e)))
 source.set_content((root/'NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html').read_text(),wait_until='load',timeout=120000)
 source.locator('#nativeWorldFile').set_input_files({'name':'Original ZeldaII.nes','buffer':rom,'mimeType':'application/octet-stream'})
 source.wait_for_function("S.nativeGame?.profile==='zelda2-overworld-v1'",timeout=45000)
 atlas=source.evaluate('Forge.services.HostedPlayerPoses.build(S.importedRom)')
 checks['rom_derived_original_30_pose_atlas']=atlas['cols']==15 and atlas['rows']==2 and atlas['evidence']=='executed-original-display'
 source.close()
 world=json.loads((root/'tests/synthetic_snapshot.json').read_text())
 player={'online':True,'x':2,'y':6,'mode':'sideview','area_id':'z2:1:0:town:2:6','side_facing':1,'attack_level':1,'magic_level':1,'life_level':1,'hp':64,'mp':64,'xp':0,'earned_xp':0,'nextUpgrades':{'attack':200,'magic':100,'life':50}}
 players=[{**player,'id':'player0','side_x':12,'side_action':'up_stab','side_pose':8,'side_air_px':0},{**player,'id':'player1','side_x':14,'side_action':'down_stab','side_pose':9,'side_air_px':40,'side_facing':-1}]
 state={'type':'state','world':world,'revision':'test','stageFrames':[],'nativeRooms':[],'playerPoses':{'sha256':hashlib.sha256(base64.b64decode(atlas['png'].split(',')[1])).hexdigest(),'nativeAnimationVerified':False},'online':2,'players':players,'structures':[],'progression':{'encountersEnabled':False},'costs':{}}
 pages=[]
 for n in (0,1):
  page=browser.new_page(viewport={'width':1320,'height':900});pages.append(page);page.on('pageerror',lambda e:errors.append(str(e)))
  html=(root/'host/client.html').read_text().replace('<script src="/render-world.js"></script><script src="/client.js"></script>','')
  page.set_content(html,wait_until='load')
  page.evaluate('''({state,atlas,index})=>{
   window.__state=state;window.__atlas=atlas;window.__sent=[];window.__index=index;
   window.ethereum={request:async({method})=>method==='eth_requestAccounts'?['0x'+'1'.repeat(40)]:method==='eth_chainId'?'0x1':'0x0102'};
   window.fetch=async url=>{const u=String(url);const data=u.includes('/api/player-poses')?{sha256:window.__state.playerPoses.sha256,png:window.__atlas,cellWidth:32,cellHeight:40,nativeAnimationVerified:false}:u.includes('/api/auth/challenge')?{nonce:'n',message:'m',address:'0x'+'1'.repeat(40)}:{sessionToken:'token',playerId:'player'+window.__index};return {ok:true,json:async()=>data,text:async()=>JSON.stringify(data)}};
   window.WebSocket=class{constructor(){this.readyState=1;window.__socket=this;setTimeout(()=>this.onopen?.(),20)}send(m){const data=JSON.parse(m);window.__sent.push(data);if(data.type==='authenticate'){setTimeout(()=>{this.onmessage?.({data:JSON.stringify({type:'authenticated',playerId:'player'+window.__index})});this.onmessage?.({data:JSON.stringify(window.__state)})},20)}}close(){}};
  }''',{'state':state,'atlas':atlas['png'],'index':n})
  page.add_script_tag(content=(root/'host/render-world.js').read_text())
  page.add_script_tag(content=(root/'host/client.js').read_text())
  page.locator('#connect').click()
  page.wait_for_function("document.querySelector('#sideVisualStatus')?.textContent.includes('LINK OAM/CHR ART LOADED')",timeout=15000)
  checks[f'client_{n}_room_has_two_source_players']='2 player(s)' in page.locator('#sideRoster').inner_text()
  checks[f'client_{n}_source_pose_status']='pose selectors 8/9' in page.locator('#sideVisualStatus').inner_text()
  checks[f'client_{n}_correct_canvas']=page.locator('#sideCanvas').evaluate('(c)=>c.width===256 && c.height===240')
  page.locator('#sideUpStab').click();page.locator('#sideDownStab').click();page.locator('#sideJump').click();page.locator('#sideForwardStab').click()
  sent=page.evaluate('window.__sent')
  checks[f'client_{n}_up_down_jump_forward_controls']=[(x.get('type'),x.get('action')) for x in sent[-4:]]==[('side_action','up_stab'),('side_action','down_stab'),('side_jump',None),('side_action','forward_stab')]
  checks[f'client_{n}_renders_original_source_pixels']=page.locator('#sideCanvas').evaluate('''c=>{let d=c.getContext('2d').getImageData(0,108,256,83).data,found=0;for(let i=0;i<d.length;i+=4)if(d[i]===222&&d[i+1]===173&&d[i+2]===106)found++;return found>15;}''')
  # Visual parity assertion: changing both servers' source pose selectors to
  # idle changes the actual rendered NES pixels, not only state metadata.
  different=page.evaluate('''()=>{
    const c=document.getElementById('sideCanvas'),g=c.getContext('2d');
    const before=new Uint8Array(g.getImageData(0,100,256,100).data);
    for(const p of window.__state.players){p.side_pose=0;p.side_action='idle';p.side_air_px=0;}
    window.__socket.onmessage({data:JSON.stringify(window.__state)});
    const after=g.getImageData(0,100,256,100).data;
    let count=0;for(let i=0;i<before.length;i+=4){if(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2])count++}
    return count;
  }''')
  checks[f'client_{n}_verified_pose_change_alters_pixels']=different>40
  # Test keyboard too, not only touch/mouse buttons.
  page.locator('#sideCanvas').click();page.keyboard.press('x');page.keyboard.press('c');page.keyboard.press('Space')
  sent=page.evaluate('window.__sent')
  checks[f'client_{n}_keyboard_controls']=[(x.get('type'),x.get('action')) for x in sent[-3:]]==[('side_action','up_stab'),('side_action','down_stab'),('side_jump',None)]
 checks['no_browser_errors']=not errors
 browser.close()
print(json.dumps({'passed':sum(bool(v) for v in checks.values()),'total':len(checks),'checks':checks,'errors':errors},indent=2))
assert all(checks.values()),checks
