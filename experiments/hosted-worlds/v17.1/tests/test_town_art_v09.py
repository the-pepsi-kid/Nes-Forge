import os
"""Real local Zelda II ROM: verifies Forge reuses its existing GameRENative scene constructor."""
import os, json, base64, hashlib, io
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];ROM=Path(os.environ['NES_FORGE_Z2_ROM']).read_bytes()
checks={};errs=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1380,'height':900});page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content((ROOT/'NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html').read_text(),wait_until='load',timeout=120000)
 page.locator('#nativeWorldFile').set_input_files({'name':'z2_private.nes','mimeType':'application/octet-stream','buffer':ROM})
 page.wait_for_function("S.nativeGame?.profile==='zelda2-overworld-v1'",timeout=30000)
 before=hashlib.sha256(bytes(page.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)'))).hexdigest()
 page.evaluate('''() => {
  const snapshot=Forge.services.HostedWorldPOC.selected(),revision='f'.repeat(64);
  window.__published=[];window.confirm=()=>true;document.querySelector('#nf-host-token').value='test-admin';
  window.fetch=async (url,opts={}) => {
   const path=String(url),body=opts.body?JSON.parse(opts.body):null;
   if(body)window.__published.push({path,body});
   let result={ok:true};
   if(path.endsWith('/api/admin/world'))result={ok:true,revision};
   if(path.endsWith('/api/admin/native-rooms'))result={ok:true,recovered:body.stages.length,skipped:body.skipped.length};
   if(path.endsWith('/api/admin/native-scene-art'))result={ok:true,sha256:'a'.repeat(64)};
   if(path.endsWith('/api/admin/state'))result={world:snapshot,revision,online:0,players:[],structures:[],audit:[],nativeRooms:[]};
   return {ok:true,json:async()=>result};
  };
 }''')
 page.locator('#nf-host-open').click();page.locator('#nf-host-publish').click()
 page.wait_for_function("window.__published?.some(x=>x.path.endsWith('/api/admin/native-scene-art'))",timeout=50000)
 rows=page.evaluate('window.__published');src=next(z['body'] for z in rows if z['path'].endswith('/api/admin/native-scene-art'))
 checks['source_constructor_called']=src['evidence']=='executed-original-construction:first-screen'
 checks['correct_original_town_binding']=(src['x'],src['y'],src['sourceBank'],src['sourceScene'],src['sourceKind'])==(2,6,3,5,'town')
 data=base64.b64decode(src['png'].split(',')[1]);im=Image.open(io.BytesIO(data)).convert('RGBA')
 checks['first_screen_256x240_rgba']=im.size==(256,240)
 checks['native_pixels_not_placeholder']=len(set(im.getdata()))>=4
 im.save(ROOT/'NES_Forge_3x_v09_Auto_Reconstructed_Town_FirstScreen.png')
 checks['rom_never_transmitted']=all('importedRom' not in json.dumps(row['body']) for row in rows)
 after=hashlib.sha256(bytes(page.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)'))).hexdigest()
 checks['no_native_rom_build_change']=before==after==hashlib.sha256(ROM).hexdigest()
 checks['guide_retained']=page.locator('#nf-host-guide').count()==1
 checks['no_browser_exceptions']=not errs
 print(json.dumps({'checks':checks,'errors':errs,'firstScreenSHA256':hashlib.sha256(data).hexdigest(),'originalROMChanged':before!=after},indent=2));b.close()
assert all(checks.values()),checks
