import os
"""Chromium: native ROM import -> actual recovered room catalog, no server needed."""
import os,json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];rom=Path(os.environ['NES_FORGE_Z2_ROM']).read_bytes()
checks={};errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1530,'height':960});page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content((ROOT/'NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html').read_text(),wait_until='load',timeout=120000)
 checks['native_decoder_registered']=page.evaluate('typeof ForgeZ2NativeRooms?.catalog === "function"')
 checks['new_world_live_preview_present']=page.locator('#nf-host-native-preview').count()==1
 checks['guided_setup_preserved']=page.locator('#nf-host-guide').count()==1
 page.locator('#nativeWorldFile').set_input_files({'name':'local_z2.nes','mimeType':'application/octet-stream','buffer':rom})
 page.wait_for_function("S.nativeGame?.profile==='zelda2-overworld-v1'",timeout=20000)
 before=hashlib.sha256(bytes(page.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)'))).hexdigest()
 checks['actual_rom_native_build_exact']=before==hashlib.sha256(rom).hexdigest()
 page.locator('#nf-host-open').click();page.locator('#nf-host-native-preview').click();page.wait_for_timeout(500)
 text=page.locator('#nf-host-native-summary').inner_text()
 checks['west_hyrule_native_catalog']=('42 decoded room bindings' in text and '20 unresolved/off-map' in text)
 checks['source_details_displayed']='bank 1 map 0' in text and 'Location 0 (23,22)' in text
 checks['native_build_unchanged_by_recovery']=before==hashlib.sha256(bytes(page.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)'))).hexdigest()
 page.evaluate('''() => {
   const revision='f'.repeat(64); const snapshot=Forge.services.HostedWorldPOC.selected();
   window.__recordedPosts=[];window.confirm=()=>true;
   document.querySelector('#nf-host-token').value='mock-admin';
   window.fetch=async (url,opts={}) => {
     const path=String(url);const body=opts.body?JSON.parse(opts.body):null;
     if(body)window.__recordedPosts.push({path,body});
     let resp={};if(path.includes('/api/admin/world'))resp={ok:true,revision};
     else if(path.includes('/api/admin/native-rooms'))resp={ok:true,recovered:body.stages.length,skipped:body.skipped.length,nativeSceneVerified:false};
     else if(path.includes('/api/admin/native-scene-art'))resp={ok:true,sha256:'a'.repeat(64)};
     else if(path.includes('/api/admin/state'))resp={world:snapshot,revision,online:0,players:[],structures:[],audit:[],nativeRooms:[]};
     return {ok:true,json:async()=>resp};
   };
 }''')
 page.locator('#nf-host-publish').click()
 page.wait_for_function("window.__recordedPosts?.some(x=>x.path.includes('/api/admin/native-rooms'))",timeout=12000)
 calls=page.evaluate('window.__recordedPosts')
 rooms=next(x['body'] for x in calls if x['path'].endswith('/api/admin/native-rooms'))
 checks['normal_load_automatically_publishes_native_catalog']=len(rooms['stages'])==42 and rooms['expectedRevision']=='f'*64
 checks['live_publish_keeps_full_rom_private']='importedRom' not in json.dumps(rooms) and 'data:image' not in json.dumps(rooms)
 checks['world_load_still_has_original_art_snapshot']=any(x['path'].endswith('/api/admin/world') and x['body']['art']['format']=='png-atlas-16x16-v1' for x in calls)

 checks['no_browser_errors']=not errors
 page.screenshot(path=str(ROOT/'NES_Forge_3x_v08_Native_Room_Catalog.png'))
 print(json.dumps({'checks':checks,'errors':errors,'preview':str(ROOT/'NES_Forge_3x_v08_Native_Room_Catalog.png')},indent=2));browser.close()
assert all(checks.values()),checks
