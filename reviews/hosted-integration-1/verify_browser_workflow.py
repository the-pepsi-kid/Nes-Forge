from pathlib import Path
from playwright.sync_api import sync_playwright
import os,base64,json,hashlib,sys
r=Path(__file__).resolve().parents[2];html=r/'experiments/hosted-worlds/v17.1/NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html'
rom=Path(sys.argv[1]).read_bytes();errors=[];checks={}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ['CHROMIUM_PATH'],headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1440,'height':1040});page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 page.goto(html.as_uri(),wait_until='load');page.locator('#nf-skin-toggle').click()
 page.evaluate('''async encoded=>{const s=Forge.services,bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));s.ProjectStore.load(await s.NativeResourceProject.create(bytes,'Punch-Out browser integration'),{sync:true});await s.InvestigationUI.whenReady();}''',base64.b64encode(rom).decode())
 page.locator('#fcw-z2').click()
 checks['correct_mode']=page.locator('#fcw-status').inner_text()=='Punch-Out · bounded native editing'
 page.locator('#fcw-panel-native [data-fcw-writer="punch-out-glass-joe-pose-placement-v1"]').click();page.locator('#punchOutPoseChoice').select_option('192');page.locator('#punchOutPoseOpen').click();page.locator('#punchOutPoseIdleGroup').check();page.locator('#punchOutPoseX').fill('-12');page.locator('#punchOutPoseApply').click()
 checks['actual_native_pose_controls']=page.locator('#punchOutPoseControls').is_visible() and page.locator('#punchOutPoseX').input_value()=='-12'
 output=page.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)');saved=page.evaluate('Forge.services.ProjectStore.serialize({includeEditorView:true})')
 checks['native_edit_changes_rom']=hashlib.sha256(bytes(output)).hexdigest()!=hashlib.sha256(rom).hexdigest()
 page.locator('#punchOutPoseTiles').click();page.locator('#punchOutChrArtwork').click();checks['native_art_bank29']=page.evaluate('S.scenes[S.activeScene].captureMeta.punchOutArt.index===29 && S.chrBank==="bg"')
 other=b.new_page();other.on('pageerror',lambda e:errors.append(str(e)));other.goto(html.as_uri(),wait_until='load');other.evaluate('saved=>Forge.services.ProjectStore.load(saved,{sync:true})',saved)
 checks['fresh_reopen_build_identical']=other.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)')==output
 checks['no_page_errors']=not errors;b.close()
report={'status':'passed' if all(checks.values()) else 'failed','htmlSha256':hashlib.sha256(html.read_bytes()).hexdigest(),'browser':'Chromium 153 headless','scope':'Actual hosted-editor controls after factory project load: Native tools, grouped C0 idle, CHR owner route and fresh page build. No physical controller, listening or full-fight claim.','checks':checks,'errors':errors}
(r/'reviews/hosted-integration-1/Browser_Workflow_Verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));assert all(checks.values())
