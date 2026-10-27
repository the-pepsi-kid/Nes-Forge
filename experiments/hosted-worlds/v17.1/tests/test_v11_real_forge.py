import os
"""Real ROM, actual Forge constructor, explicit localhost publication and verification UI."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import io,base64,json,os,hashlib
root=Path(__file__).resolve().parents[1];rom=Path(os.environ['NES_FORGE_Z2_ROM']).read_bytes();checks={};errors=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1380,'height':940});page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content((root/'NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html').read_text(),wait_until='load',timeout=120000)
 page.locator('#nativeWorldFile').set_input_files({'name':'Z2-private.nes','buffer':rom,'mimeType':'application/octet-stream'})
 page.wait_for_function("S.nativeGame?.profile==='zelda2-overworld-v1'",timeout=35000)
 before=page.evaluate('Forge.services.RuntimeCompiler.compile().rom.reduce((sum,b)=>(sum+b)>>>0,0)')
 page.evaluate('''() => {
  window.__deploys=[];window.__hostWorld=null;window.__hostRevision='f'.repeat(64);window.__hostNative=[];window.__hostArt=null;
  window.confirm=()=>true;document.querySelector('#nf-host-token').value='test-admin';
  window.fetch=async (url,opts={})=>{
   const path=String(url),body=opts.body?JSON.parse(opts.body):null;
   if(body)window.__deploys.push({path,body});
   if(path.endsWith('/api/admin/world')){window.__hostWorld=body;return {ok:true,json:async()=>({ok:true,revision:window.__hostRevision})};}
   if(path.endsWith('/api/admin/native-rooms')){window.__hostNative=body.stages;return {ok:true,json:async()=>({ok:true,recovered:body.stages.length,skipped:body.skipped.length})};}
   if(path.endsWith('/api/admin/native-scene-art')){window.__hostArt=body;return {ok:true,json:async()=>({ok:true,sha256:'a'.repeat(64)})};}
   if(path.endsWith('/api/admin/state'))return {ok:true,json:async()=>({world:window.__hostWorld,revision:window.__hostRevision,players:[],structures:[],online:0,audit:[],stageFrames:window.__hostArt?[{x:2,y:6,revision:'a'.repeat(64),captureMethod:'executed-original-construction:first-screen'}]:[],nativeRooms:[]})};
   if(path.includes('/api/stage-frame'))return {ok:!!window.__hostArt,json:async()=>({sha256:'a'.repeat(64),captureMethod:'executed-original-construction:first-screen',png:window.__hostArt?.png||''})};
   return {ok:false,status:404,text:async()=>'Unhandled '+path};
  };
 }''')
 page.locator('#nf-host-open').click();page.locator('#nf-host-publish').click()
 page.wait_for_function("document.querySelector('#nf-host-status')?.textContent.includes('original town first-screen art')",timeout=50000)
 checks['verified_status_retained']='TOWN ART FAILED' not in page.locator('#nf-host-status').inner_text()
 checks['real_source_town_uploaded']=page.evaluate("Boolean(window.__hostArt&&window.__hostArt.x===2&&window.__hostArt.y===6&&window.__hostArt.sourceScene===5&&window.__hostArt.evidence==='executed-original-construction:first-screen')")
 checks['matching_png_confirmed_with_get']=page.evaluate("document.querySelector('#nf-host-native-summary')?.textContent.includes('VERIFIED on host')")
 checks['no_rom_sent']=page.evaluate("window.__deploys.every(x=>!('importedRom' in x.body))")
 image=page.evaluate('window.__hostArt?.png');im=Image.open(io.BytesIO(base64.b64decode(image.split(',')[1]))).convert('RGBA');checks['full_native_ppu_png']=im.size==(256,240) and len(set(im.getdata()))>4
 after=page.evaluate('Forge.services.RuntimeCompiler.compile().rom.reduce((sum,b)=>(sum+b)>>>0,0)')
 checks['native_build_unchanged']=before==after and len(rom)==262160
 checks['seven_step_guide_retained']=page.locator('#nf-host-guide').count()==1
 checks['no_page_js_errors']=not errors
 print(json.dumps({'checks':checks,'errors':errors,'artBytes':len(image)},indent=2));b.close()
assert all(checks.values()),(checks,errors)
