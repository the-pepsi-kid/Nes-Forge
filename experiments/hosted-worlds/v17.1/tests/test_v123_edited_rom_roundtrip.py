import os
"""Zelda II ROM remains private; verify full reconstructed side-view art from actual Forge import to actual host.
Use NES_FORGE_Z2_ROM=/private/path/to/rom.nes. Never persist or package any private image bytes.
"""
from pathlib import Path
import os,io,json,base64,asyncio,tempfile,sys,hashlib
from playwright.sync_api import sync_playwright
from PIL import Image
from aiohttp.test_utils import TestServer,TestClient
root=Path(__file__).resolve().parents[1];rom=Path(os.environ['NES_FORGE_Z2_ROM']).read_bytes();checks={};errors=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1400,'height':940});page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((root/'NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html').read_text(),wait_until='load',timeout=120000)
    page.locator('#nativeWorldFile').set_input_files({'name':'private-test.nes','buffer':rom,'mimeType':'application/octet-stream'})
    page.wait_for_function("S.nativeGame?.profile==='zelda2-overworld-v1'",timeout=35000)
    before=page.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)')
    page.evaluate('''() => {
      window.__deploys=[];window.__hostWorld=null;window.__revision='f'.repeat(64);window.__hostNative=[];window.__hostArt=null;
      window.confirm=()=>true;document.querySelector('#nf-host-token').value='secret';
      window.fetch=async (url,opts={})=>{
        const path=String(url),body=opts.body?JSON.parse(opts.body):null;
        if(body)window.__deploys.push({path,body});
        if(path.endsWith('/api/health'))return {ok:true,json:async()=>({ok:true,protocol:13,maxRoomWidthPx:2048})};
        if(path.endsWith('/api/admin/world')){window.__hostWorld=body;return {ok:true,json:async()=>({revision:window.__revision})};}
        if(path.endsWith('/api/admin/native-rooms')){window.__hostNative=body.stages;return {ok:true,json:async()=>({recovered:body.stages.length,skipped:body.skipped.length})};}
        if(path.endsWith('/api/admin/native-scene-art')){window.__hostArt=body;return {ok:true,json:async()=>({sha256:'a'.repeat(64),widthPx:body.sourceWidth})};}
        if(path.endsWith('/api/admin/state'))return {ok:true,json:async()=>({world:window.__hostWorld,revision:window.__revision,players:[],structures:[],online:0,audit:[],stageFrames:window.__hostArt?[{x:2,y:6,revision:'a'.repeat(64),captureMethod:'executed-original-construction:first-screen',widthPx:window.__hostArt.sourceWidth}]:[],nativeRooms:[]})};
        if(path.includes('/api/stage-frame'))return {ok:!!window.__hostArt,json:async()=>({sha256:'a'.repeat(64),captureMethod:'executed-original-construction:first-screen',widthPx:window.__hostArt?.sourceWidth,png:window.__hostArt?.png||''})};
        return {ok:false,status:404,text:async()=>'Unhandled '+path};
      };
    }''')
    page.locator('#nf-host-open').click();page.locator('#nf-host-publish').click()
    try: page.wait_for_function("window.__hostArt && document.querySelector('#nf-host-status').textContent.includes('original multi-screen town art')",timeout=55000)
    except Exception:
        print(json.dumps({'status':page.locator('#nf-host-status').inner_text(),'summary':page.locator('#nf-host-native-summary').inner_text(),'errors':errors,'calls':page.evaluate('window.__deploys.map(x=>x.path)')},indent=2),flush=True)
        raise
    checks['actual_multi_screen_raster_from_forge']=page.evaluate('window.__hostArt.version===2&&window.__hostArt.sourceWidth>=512&&window.__hostArt.sourceWidth%256===0')
    checks['correct_original_rom_room']=page.evaluate('window.__hostArt.sourceBank===3&&window.__hostArt.sourceScene===5&&window.__hostArt.x===2&&window.__hostArt.y===6')
    checks['verified_readback_with_width']=page.evaluate("document.querySelector('#nf-host-native-summary').textContent.includes('VERIFIED on host')")
    data=page.evaluate('window.__hostArt');all_payloads=page.evaluate('window.__deploys');world=page.evaluate('window.__hostWorld');catalog=next(v['body'] for v in all_payloads if v['path'].endswith('/api/admin/native-rooms'))
    raw=base64.b64decode(data['png'].split(',')[1]);image=Image.open(io.BytesIO(raw));image.load()
    checks['real_png_dimensions']=image.size==(data['sourceWidth'],240) and image.mode=='RGBA' and image.getpixel((10,150))!=image.getpixel((300,150))
    after=page.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)')
    checks['native_rom_build_byte_identical']=before==after
    checks['rom_not_uploaded']=all('importedRom' not in v['body'] for v in all_payloads)
    checks['browser_no_js_errors']=not errors
    browser.close()

async def host_roundtrip():
    sys.path.insert(0,str(root/'host'))
    from server import create_app
    with tempfile.TemporaryDirectory() as td:
        server=TestServer(create_app(Path(td)/'test.db','secret'));client=TestClient(server);await client.start_server()
        try:
            auth={'X-Forge-Admin':'secret'}
            r=await client.post('/api/admin/world',headers=auth,json=world);assert r.status==200,(r.status,await r.text());revision=(await r.json())['revision']
            c={**catalog,'expectedRevision':revision}
            r=await client.post('/api/admin/native-rooms',headers=auth,json=c);assert r.status==200,(r.status,await r.text())
            payload={**data,'expectedRevision':revision}
            r=await client.post('/api/admin/native-scene-art',headers=auth,json=payload)
            checks['real_host_accepts_full_scene']=r.status==200
            if r.status!=200:print('ERROR',r.status,await r.text())
            else:
                response=await r.json();checks['host_agrees_width']=response['widthPx']==data['sourceWidth']
                state=await (await client.get('/api/admin/state',headers=auth)).json()
                checks['host_state_reports_full_room']=any(f['widthPx']==data['sourceWidth'] for f in state['stageFrames'])
                response=await (await client.get('/api/stage-frame?x=2&y=6')).json()
                checks['browser_can_get_original_raster']=response['png']==data['png'] and response['widthPx']==data['sourceWidth']
                # No overworld or stage change while players move through extended source room.
                host=server.app['host']
                for p,pid in enumerate(('p1','p2')):
                    host.db.execute("INSERT INTO players(id,address,x,y,xp,level,mode,area_id,side_x) VALUES(?,?,?,?,?,?,?,?,?)",(pid,'0x'+str(p+1).zfill(40),2,6,0,1,'sideview','22:1:0:town:2:6',31))
                with host.db:out=await host.action('p1',{'type':'side_step','direction':1})
                checks['authoritative_movement_crosses_screen_boundary']=out.get('ok') is True and host.player('p1')['side_x']==32
                # Existing v1 source frames cannot silently gain multi-screen room authority.
                host.db.execute("UPDATE stage_frames SET width_px=256 WHERE x=2 AND y=6")
                host.db.execute("UPDATE players SET side_x=31 WHERE id='p1'")
                host.cooldowns.pop('p1',None)
                with host.db:out=await host.action('p1',{'type':'side_step','direction':1})
                checks['v1_frame_stays_at_original_step_limit']='error' in out
        finally:await client.close()
asyncio.run(host_roundtrip())
print(json.dumps({'passed':sum(bool(x) for x in checks.values()),'total':len(checks),'checks':checks,'errors':errors,'png_bytes':len(raw),'width':data['sourceWidth']},indent=2))
assert all(checks.values()),checks
