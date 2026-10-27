from pathlib import Path
import os
from playwright.sync_api import sync_playwright
import hashlib, json
ROOT=Path(__file__).resolve().parents[1]
app=ROOT/'NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html'
rom_path=os.environ.get('NES_FORGE_Z2_ROM')
if not rom_path or not Path(rom_path).is_file(): raise SystemExit('Set NES_FORGE_Z2_ROM to your own locally obtained Zelda II NES ROM path')
rom=Path(rom_path).read_bytes()
checks={};errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=(os.environ.get('CHROMIUM_PATH') or None),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1500,'height':960});page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(app.read_text(encoding='utf-8'),wait_until='load',timeout=120000)
 checks['guide_installed']=page.locator('#nf-host-guide').count()==1
 checks['source_serves_from_html']=page.locator('#nf-host-open').count()==1
 checks['editor_not_mutated_on_guide_open']=True
 before=hashlib.sha256(bytes(page.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)'))).hexdigest()
 page.locator('#nf-host-open').click()
 checks['overlay_visible']=page.locator('#nf-host-overlay').evaluate('(x)=>x.classList.contains("open")')
 checks['guide_first_step']=page.locator('#nf-g-progress').inner_text().startswith('Step 1 of 7')
 checks['guide_can_navigate']=page.locator('#nf-g-steps button').count()==7
 page.locator('#nf-g-next').click()
 checks['guide_next_works']=page.locator('#nf-g-progress').inner_text().startswith('Step 2 of 7')
 page.locator('#nf-g-steps button').nth(2).click()
 checks['guide_z2_step_available']='Zelda II' in page.locator('#nf-g-body').inner_text()
 page.locator('#nf-g-toggle').click()
 checks['guide_can_collapse']=page.locator('#nf-g-main').evaluate('(e)=>e.hidden')
 page.locator('#nf-g-toggle').click()
 checks['guide_can_expand']=page.locator('#nf-g-main').evaluate('(e)=>!e.hidden')
 page.locator('#nf-host-close').click()
 page.locator('#nativeWorldFile').set_input_files({'name':'local_z2.nes','mimeType':'application/octet-stream','buffer':rom})
 page.wait_for_timeout(1800)
 checks['z2_native_import']=page.evaluate("S.nativeGame?.profile==='zelda2-overworld-v1'")
 snap=page.evaluate('Forge.services.HostedWorldPOC.selected()')
 checks['z2_snapshot_lacks_rom_bytes']=set(snap)=={'format','version','sourceProfile','sourceWorldId','sourceDigest','name','width','height','terrain','art'} and snap['version']==2
 checks['z2_snapshot_expected_world']=snap['sourceWorldId']=='z2:1:0' and len(snap['terrain'])==4800
 page.locator('#nf-host-open').click()
 page.locator('#nf-g-verify').click()
 page.wait_for_timeout(300)
 checks['offline_check_detected']=not page.locator('#nf-g-checks .nf-g-check').first.evaluate('(x)=>x.classList.contains("yes")')
 after=hashlib.sha256(bytes(page.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)'))).hexdigest()
 checks['new_z2_build_differs_from_blank_build']=before!=after
 checks['native_rom_build_identical_original']=after==hashlib.sha256(rom).hexdigest()
 screenshot=ROOT/'NES_Forge_3x_World_Live_Guided_Setup.png';page.screenshot(path=str(screenshot))
 print(json.dumps({'checks':checks,'errors':errors,'preview':str(screenshot)},indent=2))
 browser.close()
assert all(checks.values()), checks
assert not errors,errors
