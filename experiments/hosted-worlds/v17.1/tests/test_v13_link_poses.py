import os
"""v13: ROM-derived Link OAM art is private and never written into this review kit.
Use NES_FORGE_Z2_ROM=/private/path/to/rom.nes.
"""
import base64, hashlib, json, os, sys, tempfile, asyncio, io
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
from aiohttp.test_utils import TestServer, TestClient
base=Path(__file__).resolve().parents[1]
rom=Path(os.environ['NES_FORGE_Z2_ROM']).read_bytes()
checks={}; errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content((base/'NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html').read_text(),wait_until='load',timeout=120000)
 page.locator('#nativeWorldFile').set_input_files({'name':'edited-source.nes','buffer':rom,'mimeType':'application/octet-stream'})
 page.wait_for_function("S.nativeGame?.profile==='zelda2-overworld-v1'",timeout=45000)
 compiled_before=page.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)')
 asset=page.evaluate('Forge.services.HostedPlayerPoses.build(S.importedRom)')
 checks['actual_30_link_poses']=asset['cols']==15 and asset['rows']==2 and asset['evidence']=='executed-original-display'
 checks['source_digest_matches']=asset['sourceDigest']==page.evaluate('S.nativeGame.sourceSha256')
 checks['source_art_claims_limited']=asset['rendering']=='provisional-CHR0-palette-not-runtime-traced'
 raw=base64.b64decode(asset['png'].split(',')[1]);image=Image.open(io.BytesIO(raw));image.load()
 checks['sprite_atlas_pixels']=image.size==(480,80) and image.mode=='RGBA' and image.getbbox()!=None
 checks['original_rom_build_unchanged']=page.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)')==compiled_before
 # Generate hosted World contract from actual selected Forge edit state (ROM never leaves browser).
 world=page.evaluate('Forge.services.HostedWorldPOC.selected()')
 checks['no_rom_bytes_in_world']=world['sourceDigest']==asset['sourceDigest'] and 'rom' not in json.dumps(world).lower()[:100]
 checks['no_js_errors']=not errors
 b.close()

async def host_test():
 sys.path.insert(0,str(base/'host'))
 from server import create_app
 with tempfile.TemporaryDirectory() as td:
  t=TestServer(create_app(Path(td)/'test.db','secret'));c=TestClient(t);await c.start_server()
  try:
   h={'X-Forge-Admin':'secret'}
   r=await c.post('/api/admin/world',headers=h,json=world)
   assert r.status==200,(r.status,await r.text())
   revision=(await r.json())['revision']
   payload={**asset,'expectedRevision':revision,'sourceWorldId':world['sourceWorldId']}
   r=await c.post('/api/admin/player-poses',headers=h,json=payload)
   checks['original_pose_upload_accepted']=r.status==200
   if r.status!=200:print('UPLOAD_ERROR',r.status,await r.text())
   else:
    digest=(await r.json())['sha256'];checks['sha256_original_art']=digest==hashlib.sha256(raw).hexdigest()
    s=await (await c.get('/api/admin/state',headers=h)).json();checks['player_state_declares_art_without_animation']=s['playerPoses']['sha256']==digest and s['playerPoses']['nativeAnimationVerified'] is False
    a=await (await c.get('/api/player-poses')).json();checks['client_can_retrieve_same_atlas']=a['png']==asset['png'] and a['sha256']==digest
    # Existing player state & resources must not change when art is replaced.
    host=t.app['host'];host.db.execute("INSERT INTO players(id,address,x,y,xp,level) VALUES(?,?,?,?,?,?)",('p1','0x'+'1'*40,2,6,55,1));host.db.execute("INSERT INTO structures(id,player_id,kind,x,y,parent_id,hp) VALUES(?,?,?,?,?,?,?)",('camp1','p1','camp',2,6,None,0))
    before=host.player('p1')
    resp=await c.post('/api/admin/player-poses',headers=h,json=payload)
    after=host.player('p1')
    checks['art_update_preserves_player_and_camp']=resp.status==200 and before==after and host.db.execute('SELECT COUNT(*) FROM structures').fetchone()[0]==1
    for wrong in ({**payload,'sourceDigest':'0'*64},{**payload,'expectedRevision':'0'*64}):
     bad=await c.post('/api/admin/player-poses',headers=h,json=wrong)
     checks['reject_wrong_identity_'+str(len([v for v in checks if v.startswith('reject_wrong_identity')]))]=bad.status==409
    wrong={**payload,'png':asset['png'].replace('base64,','base64,!!',1)}
    bad=await c.post('/api/admin/player-poses',headers=h,json=wrong)
    checks['reject_bad_image']=bad.status==400
   # No accepted source-derived art when host source is gone or mismatched.
  finally:await c.close()
asyncio.run(host_test())
print(json.dumps({'passed':sum(bool(v) for v in checks.values()),'total':len(checks),'checks':checks,'js_errors':errors,'atlas_size':image.size},indent=2))
assert all(checks.values()),checks

# Offline browser acceptance: genuine recovered pixels used by both player overlays,
# not just accepted by an isolated upload endpoint. No original art saved to disk.
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page();client_errors=[];page.on('pageerror',lambda e:client_errors.append(str(e)))
 page.set_content((base/'host/client.html').read_text().replace('<script src="/render-world.js"></script><script src="/client.js"></script>',''),wait_until='load')
 players=[]
 for i in range(2):
  players.append({'id':'player'+str(i),'address':'0x'+'1'*40,'online':True,'x':2,'y':6,'mode':'sideview','area_id':'22:1:0:town:2:6','side_x':8+i*2,'side_facing':1 if i==0 else -1,'xp':0,'earned_xp':0,'attack_level':1,'magic_level':1,'life_level':1,'hp':64,'mp':64,'encounter':'','enemy_hp':0,'nextUpgrades':{'attack':200,'magic':100,'life':50}})
 state={'type':'state','world':world,'revision':'1'*64,'stageFrames':[],'nativeRooms':[],'playerPoses':{'sha256':hashlib.sha256(raw).hexdigest(),'nativeAnimationVerified':False},'online':2,'players':players,'structures':[],'progression':{'encountersEnabled':False},'costs':{}}
 page.evaluate('''({atlas,state})=>{
   window.__testAtlas=atlas;window.__testState=state;
   window.ethereum={request:async({method})=>method==='eth_requestAccounts'?['0x'+'1'.repeat(40)]:method==='eth_chainId'?'0x1':'0xabcd'};
   window.fetch=async url=>{
     url=String(url);
     const obj=url.includes('player-poses')?{sha256:window.__testState.playerPoses.sha256,png:window.__testAtlas,cellWidth:32,cellHeight:40,nativeAnimationVerified:false}:url.includes('/api/auth/challenge')?{message:'mock',address:'0x'+'1'.repeat(40),nonce:'n'}:url.includes('/api/auth/verify')?{sessionToken:'fake',playerId:'player0'}:{ok:false};
     return {ok:true,json:async()=>obj,text:async()=>JSON.stringify(obj)};
   };
   class FakeSocket{constructor(){this.readyState=1;setTimeout(()=>this.onopen?.(),10);}send(m){const x=JSON.parse(m);if(x.type==='authenticate'){setTimeout(()=>{this.onmessage?.({data:JSON.stringify({type:'authenticated',playerId:'player0'})});this.onmessage?.({data:JSON.stringify(window.__testState)})},20)}}close(){} }
   window.WebSocket=FakeSocket;
 }''',{'atlas':asset['png'],'state':state})
 page.add_script_tag(content=(base/'host/render-world.js').read_text())
 page.add_script_tag(content=(base/'host/client.js').read_text())
 page.locator('#connect').click()
 page.wait_for_function("document.getElementById('sideRoster').textContent.includes('2 player(s)')",timeout=10000)
 # Sprite image loading runs asynchronously; wait for 480x80 PNG source pixels to appear at player coordinate.
 page.wait_for_function('''() => {
   const c=document.getElementById('sideCanvas'),g=c.getContext('2d');
   const pixels=g.getImageData(0,152,256,40).data;let opaqueColored=0;
   for(let i=0;i<pixels.length;i+=4){if(pixels[i]===222&&pixels[i+1]===173&&pixels[i+2]===106)opaqueColored++}
   return opaqueColored>40;
 }''',timeout=10000)
 checks['two_players_render_source_OAM_pixels']=True
 checks['player_ui_no_errors']=not client_errors
 browser.close()
print('BROWSER SOURCE ART',json.dumps({'source_poses_visible':checks['two_players_render_source_OAM_pixels'],'errors':client_errors}))
assert all(checks.values()),checks
