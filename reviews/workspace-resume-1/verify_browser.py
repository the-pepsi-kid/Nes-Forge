"""Actual project download/open, browser save and recovery with private input.

Each revision uses an isolated browser context. Downloads and source-bearing
projects stay in Playwright's temporary storage/RAM; only boolean results persist.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64
import hashlib
import json
import os
import sys

root=Path(__file__).resolve().parents[2]
html=Path(os.environ.get('FORGE_REVIEW_HTML',root/'nes-forge.html')).resolve()
identity=hashlib.sha256(html.read_bytes()).hexdigest()
results=[]
with sync_playwright() as runtime:
    browser=runtime.chromium.launch(executable_path=os.environ['CHROMIUM_PATH'],headless=True,
        args=['--no-sandbox','--disable-dev-shm-usage'])
    for revision in range(2):
        context=browser.new_context(viewport={'width':1440,'height':1080},accept_downloads=True)
        # Exercise the explicit browser-download path; headless Chromium cannot
        # validate an operating-system Save As picker. App handlers remain real.
        context.add_init_script("Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true});")
        errors=[];checks={}
        context.on('page',lambda page:page.on('pageerror',lambda error:errors.append(str(error))))
        def fresh():
            page=context.new_page();page.on('dialog',lambda dialog:dialog.accept())
            page.goto(html.as_uri(),wait_until='load');return page
        def download(page):
            page.locator('button[onclick="project_export()"]').click()
            with page.expect_download() as event:
                page.locator('#forgeSaveBrowser').click()
            return Path(event.value.path()).read_bytes()
        def open_project(page,data):
            page.locator('#projectIn').set_input_files({'name':'resume-check.nesforge.json','mimeType':'application/json','buffer':data})
            page.wait_for_function('S.nativeGame && Forge163.metasprites.current?.id==="po-native-incremental-pose-f0-s192"')
            page.evaluate('async()=>await Forge.services.InvestigationUI.whenReady()')
        def compiled(page):
            return hashlib.sha256(bytes(page.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)'))).hexdigest()

        page=fresh();page.locator('#nf-skin-toggle').click()
        rom=(Path(sys.argv[1])/f"Mike Tyson's Punch-Out!! (U) (PRG {revision}).nes").read_bytes()
        page.evaluate('''async encoded=>{const s=Forge.services,bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
            s.ProjectStore.load(await s.NativeResourceProject.create(bytes,'Punch-Out resume browser'));
            await s.InvestigationUI.whenReady();}''',base64.b64encode(rom).decode())
        page.locator('#fcw-z2').click()
        page.locator('#fcw-panel-native [data-fcw-writer="punch-out-glass-joe-pose-placement-v1"]').click()
        page.locator('#punchOutPoseChoice').select_option('192');page.locator('#punchOutPoseOpen').click()
        page.locator('#msPieces163 [data-piece-id]').nth(2).click()
        piece_id=page.evaluate('Forge163.metasprites.state.pieceId')
        page.locator('#punchOutPoseIdleGroup').check();page.locator('#punchOutPoseX').fill('-12');page.locator('#punchOutPoseApply').click()
        page.locator(f'#msPieces163 [data-piece-id="{piece_id}"]').click()
        expected=compiled(page);saved=download(page);view=json.loads(saved)['editorView']
        checks['actual_download_contains_pose_view']=view['version']==1 and view['metaspriteId'].endswith('s192') and view['pieceId']==piece_id
        other=fresh();open_project(other,saved)
        checks['fresh_file_open_exact_pose_and_piece']=other.evaluate('''piece=>Forge163.metasprites.current.id==='po-native-incremental-pose-f0-s192'&&Forge163.metasprites.state.pieceId===piece''',piece_id)
        checks['fresh_editor_and_position']=other.evaluate('S.tab==="metasprites"') and other.locator('#punchOutPoseX').input_value()=='-12'
        checks['fresh_native_output_identical']=compiled(other)==expected
        other.locator('#fcw-relations').click()
        checks['resources_selects_reopened_pose']=other.evaluate('Forge.services.ResourceRelationshipPreview.summary().selected')=='metasprite:po-native-incremental-pose-f0-s192'
        checks['pose_preview_renders']=other.locator('#frx-preview canvas').is_visible()
        other.locator('#frx-close').click()

        # Real IndexedDB transport, opened from a separate page with no prior pose
        # selection. This test context is unrelated to the user's browser profile.
        stored=other.evaluate('async()=>await Forge.services.ProjectStore.saveBrowser("Resume browser storage")')
        stored_page=fresh()
        okay=stored_page.evaluate('async id=>await Forge.services.ProjectStore.openBrowser(id)',stored)
        checks['browser_storage_exact_resume']=bool(okay) and stored_page.evaluate('S.tab==="metasprites"&&Forge163.metasprites.current?.id==="po-native-incremental-pose-f0-s192"')
        checks['browser_storage_output_identical']=compiled(stored_page)==expected

        # Recover an actual dirty canonical edit with its pose view. Recovery must
        # retain the usual explicit restore step, never auto-replace the new page.
        recovery_written=other.evaluate('''async()=>{const s=Forge.services;await s.ProjectStore.checkRecovery();
          if(s.ProjectStore.state.recoveryPhase==='offered')await s.ProjectStore.dismissRecovery();
          Forge15.dirty=true;return await s.ProjectStore.autoSave();}''')
        recovery_page=fresh();recovery_page.evaluate('async()=>await Forge.services.ProjectStore.checkRecovery()')
        checks['recovery_still_requires_explicit_restore']=bool(recovery_written) and recovery_page.evaluate('Forge.services.ProjectStore.state.recoveryPhase==="offered"&&!S.nativeGame')
        restored=recovery_page.evaluate('async()=>await Forge.services.ProjectStore.restoreRecovery()')
        recovery_page.evaluate('async()=>await Forge.services.InvestigationUI.whenReady()')
        checks['recovery_exact_pose_and_editor']=bool(restored) and recovery_page.evaluate('S.tab==="metasprites"&&Forge163.metasprites.current?.id==="po-native-incremental-pose-f0-s192"')
        checks['recovery_output_identical']=compiled(recovery_page)==expected

        other.locator('#punchOutPoseArtwork').click();other.locator('#chrUsageScope').select_option('pose')
        tile=other.evaluate('Forge.services.ResourceContext.chrUsage().tileIds[1]')
        sheet=other.locator('#cv');bounds=sheet.bounding_box()
        sheet.click(position={'x':(tile%16+.5)*bounds['width']/16,'y':(tile//16+.5)*bounds['height']/16})
        original=other.evaluate('S.chr[S.editTile][0][0]');other.locator('#pixColorSel .ps').nth((original+1)%4).click()
        other.locator('#chrEditCanvas').click(position={'x':4,'y':4})
        art_output=compiled(other);art_saved=download(other)
        art_page=fresh();open_project(art_page,art_saved)
        checks['physical_chr_view_resumes']=art_page.evaluate('S.tab==="chr"&&S.chrBank==="bg"&&S.scenes[S.activeScene].captureMeta.punchOutArt.index===29')
        checks['tile_and_pose_footprint_resume']=art_page.evaluate('tile=>S.editTile===tile&&forgeCHR.usageOnly&&Forge.services.ResourceContext.chrUsage()?.frame.id==="po-native-incremental-pose-f0-s192"',tile)
        checks['combined_art_idle_output_identical']=compiled(art_page)==art_output
        checks['fresh_native_return_route_available']=art_page.locator('#punchOutChrPose').is_visible()
        art_page.locator('#punchOutChrPose').click()
        checks['native_return_route_exact_pose']=art_page.evaluate('S.tab==="metasprites"&&Forge163.metasprites.current?.id==="po-native-incremental-pose-f0-s192"')
        checks['source_snapshot_preserved']=art_page.evaluate('''({tile,original})=>S.scenes[S.activeScene].sprChr[tile][0][0]===original''',{'tile':tile,'original':original})
        checks['no_page_errors']=not errors
        results.append({'revision':revision,'checks':checks,'errors':errors})
        print(f"PRG {revision}: {sum(checks.values())}/{len(checks)} browser checks",flush=True)
        context.close()
    browser.close()
assert hashlib.sha256(html.read_bytes()).hexdigest()==identity,'HTML changed during verification'
report={'status':'passed' if all(all(r['checks'].values()) for r in results) else 'failed',
    'htmlSha256':identity,'browser':'Chromium 153 headless','results':results,
    'scope':'Actual standalone file page, Save Project As/browser-download fallback and Open Project file input. Native OS picker disabled in test environment. Actual isolated IndexedDB/recovery; explicit restore retained. Initial ROM intake uses the existing factory. No full-fight/listening/controller/hardware acceptance.'}
Path(os.environ.get('FORGE_RESUME_BROWSER_REPORT',Path(__file__).with_name('Resume_Browser_Verification.json'))).write_text(json.dumps(report,indent=2)+'\n')
assert report['status']=='passed',json.dumps(report)
