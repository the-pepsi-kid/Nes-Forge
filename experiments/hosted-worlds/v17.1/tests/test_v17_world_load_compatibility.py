import os
"""WORLD Live load regression: frontend protocol 13 gating, guided status,
explicit publication and backend accept, without distributing a Zelda II ROM.
Synthetic fixture never claims native room/ROM parity.
Run: python tests/test_v17_world_load_compatibility.py
"""
import asyncio, json, os, sys, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from aiohttp.test_utils import TestServer, TestClient
ROOT=Path(__file__).resolve().parents[1]
SNAPSHOT=json.loads((ROOT/'tests/synthetic_snapshot.json').read_text())
checks={};errors=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1280,'height':920})
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.set_content((ROOT/'NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html').read_text(),wait_until='load',timeout=120000)
    api={'protocol':12,'width':2048,'posts':[],'world':None,'revision':'d'*64}
    def intercept(route):
        request=route.request;path=request.url.split('8765',1)[-1].split('?',1)[0]
        if path=='/api/health':
            payload={'ok':True,'host':'localhost','protocol':api['protocol'],'maxRoomWidthPx':api['width'],'hasWorld':bool(api['world'])}
            return route.fulfill(json=payload)
        if path=='/api/admin/world' and request.method=='POST':
            api['world']=request.post_data_json;api['posts'].append(api['world'])
            return route.fulfill(json={'revision':api['revision'],'resetOverlays':True})
        if path=='/api/admin/state':
            return route.fulfill(json={'world':api['world'],'revision':api['revision'],'players':[],'structures':[], 'online':0,'audit':[], 'stageFrames':[], 'nativeRooms':[]})
        return route.fulfill(status=404,json={'error':'not fixture supplied'})
    page.route('http://127.0.0.1:8765/**',intercept)
    # Synthesize World/terrain palette for deployment UI only. The app's real
    # export code still constructs the atlas, validates dimensions and calls API.
    page.evaluate('''snapshot=>{
        const world={id:'fixture-world',name:snapshot.name,map:new Uint8Array(snapshot.terrain)};
        S.worlds.push(world);
        S.nativeGame={profile:window.ZeldaOverworld.id,sourceSha256:snapshot.sourceDigest,resources:[{worldId:world.id,mapId:snapshot.sourceWorldId}]};
        const palette=document.getElementById('nativeWorldBrushes');
        for(let i=0;i<16;i++){
           const btn=document.createElement('button');btn.dataset.terrain=String(i);
           const c=document.createElement('canvas');c.width=16;c.height=16;
           const g=c.getContext('2d');g.fillStyle=`rgb(${i*13},${i*7},${i*4})`;g.fillRect(0,0,16,16);
           btn.appendChild(c);palette.appendChild(btn);
        }
        window.confirm=()=>true;
    }''',SNAPSHOT)
    checks['fixture_selected_world_is_valid']=page.evaluate('''()=>{const s=Forge.services.HostedWorldPOC.selected();return s.sourceWorldId==='z2:1:0'&&s.terrain.length===4800&&s.art.png.startsWith('data:image/png;base64,')}''')
    page.locator('#nf-host-open').click()
    page.locator('#nf-host-token').fill('test-token')
    page.locator('#nf-g-verify').click()
    page.wait_for_function("document.querySelector('#nf-g-info').textContent.includes('Incompatible host protocol 12')")
    checks['setup_rejects_old_protocol']=page.locator('#nf-g-checks .nf-g-check').first.evaluate('(e)=>e.classList.contains("no")')
    page.locator('#nf-host-publish').click()
    page.wait_for_function("document.querySelector('#nf-host-status').textContent.includes('Incompatible localhost host')")
    checks['old_protocol_does_not_publish']=not api['posts']
    api['protocol']=13;api['width']=256
    page.locator('#nf-host-publish').click()
    page.wait_for_function("document.querySelector('#nf-host-status').textContent.includes('Incompatible localhost host')")
    checks['wrong_room_width_does_not_publish']=not api['posts']
    api['width']=2048
    page.locator('#nf-g-verify').click()
    page.wait_for_function("document.querySelector('#nf-g-info').textContent.includes('administrator token verified')")
    checks['matching_host_guide_green']=page.locator('#nf-g-checks .nf-g-check').first.evaluate('(e)=>e.classList.contains("yes")')
    page.locator('#nf-host-health').click()
    page.wait_for_function("document.querySelector('#nf-host-status').textContent.includes('protocol 13 verified')")
    checks['test_localhost_protocol13_status']='v0.12' not in page.locator('#nf-host-status').inner_text()
    page.locator('#nf-host-publish').click()
    page.wait_for_function("document.querySelector('#nf-host-status').textContent.includes('Loaded revision')",timeout=15000)
    checks['publish_calls_host_once']=len(api['posts'])==1
    checks['correct_world_posted']=bool(api['world']) and api['world']['sourceWorldId']=='z2:1:0' and api['world']['version']==2 and api['world']['width']==64
    checks['native_recovery_opt_in_without_rom_does_not_undo_world']=bool(api['world']) and 'Loaded revision' in page.locator('#nf-host-status').inner_text()
    page.locator('#nf-g-verify').click()
    page.wait_for_function("document.querySelectorAll('#nf-g-checks .nf-g-check')[3].classList.contains('yes')")
    checks['guide_world_loaded']=page.locator('#nf-g-checks').locator('.nf-g-check').nth(3).evaluate('(e)=>e.classList.contains("yes")')
    browser.close()

async def backend():
    sys.path.insert(0,str(ROOT/'host'))
    from server import create_app
    with tempfile.TemporaryDirectory() as tmp:
        srv=TestServer(create_app(Path(tmp)/'world.db','test-token'));client=TestClient(srv)
        await client.start_server()
        try:
            r=await client.get('/api/health');health=await r.json()
            checks['actual_host_advertises_protocol13']=r.status==200 and health['protocol']==13 and health['maxRoomWidthPx']==2048
            r=await client.post('/api/admin/world',json=SNAPSHOT,headers={'X-Forge-Admin':'test-token'})
            result=await r.json()
            checks['actual_host_accepts_world']=r.status==200 and len(result['revision'])==64
            r=await client.get('/api/admin/state',headers={'X-Forge-Admin':'test-token'})
            state=await r.json()
            checks['actual_host_retains_deployed_world']=r.status==200 and state['world']['sourceWorldId']==SNAPSHOT['sourceWorldId']
        finally:await client.close()
asyncio.run(backend())
checks['no_browser_errors']=not errors
print(json.dumps({'passed':sum(bool(v) for v in checks.values()),'total':len(checks),'checks':checks,'browserErrors':errors},indent=2))
assert all(checks.values()),checks
