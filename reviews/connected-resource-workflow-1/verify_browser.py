"""Actual file-page controls and rendered canvases; private ROMs are CLI inputs.

Screenshots, if requested through FORGE_QA_SCREENSHOT_DIR, stay outside the kit.
Factory intake is explicit: this does not claim full file-import UI acceptance.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64
import hashlib
import json
import os
import sys

root = Path(__file__).resolve().parents[2]
html = Path(os.environ.get('FORGE_REVIEW_HTML', root / 'nes-forge.html')).resolve()
identity = hashlib.sha256(html.read_bytes()).hexdigest()
results = []
with sync_playwright() as engine:
    browser = engine.chromium.launch(executable_path=os.environ['CHROMIUM_PATH'],
        headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
    for revision in range(2):
        rom = (Path(sys.argv[1]) / f"Mike Tyson's Punch-Out!! (U) (PRG {revision}).nes").read_bytes()
        page = browser.new_page(viewport={'width': 1440, 'height': 1080})
        errors, checks = [], {}
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('dialog', lambda dialog: dialog.accept())
        page.goto(html.as_uri(), wait_until='load')
        page.locator('#nf-skin-toggle').click()
        page.evaluate('''async encoded=>{const s=Forge.services,bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
            s.ProjectStore.load(await s.NativeResourceProject.create(bytes,'Punch-Out browser workflow'),{sync:true});
            await s.InvestigationUI.whenReady();}''', base64.b64encode(rom).decode())
        page.locator('#fcw-z2').click()
        page.locator('#fcw-panel-native [data-fcw-writer="punch-out-glass-joe-pose-placement-v1"]').click()
        page.locator('#punchOutPoseChoice').select_option('192')
        page.locator('#punchOutPoseOpen').click()
        pose_id = page.evaluate('Forge163.metasprites.current.id')
        page.locator('#fcw-relations').click()
        checks['exact_pose_resource'] = page.evaluate('Forge.services.ResourceRelationshipPreview.summary().selected') == 'metasprite:' + pose_id
        checks['rendered_pose_preview'] = page.locator('#frx-preview canvas').is_visible() and page.evaluate('''()=>{
          const c=document.querySelector('#frx-preview canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
          return new Set(Array.from({length:d.length/4},(_,i)=>Array.from(d.slice(i*4,i*4+3)).join(','))).size>3;}''')
        page.locator('#frx-related-tools').get_by_role('button',name='Used pose tiles',exact=True).click()
        checks['resource_used_tiles_shortcut'] = page.evaluate('S.tab==="chr" && S.chrBank==="spr" && forgeCHR.usageOnly')
        before = page.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)')
        page.locator('#chrUsageScope').select_option('pose')
        checks['used_pose_view'] = '52 pieces · 38 distinct tile IDs' in page.locator('#chrPoseUsageInfo').inner_text()
        checks['no_fabricated_scene_oam'] = page.evaluate('S.oam.length===0 && Forge.services.ResourceContext.chrUsage().pieceCount===52')
        checks['actual_appearances'] = page.locator('#chrPoseAppearances canvas').count() > 0 and 'Pose use:' in page.locator('#chrPreviewInfo').inner_text()
        checks['browse_keeps_native_bytes'] = page.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)') == before
        checks['rom_chooser_scope_visible'] = 'does not select the displayed Scene buffer' in page.locator('#chrBrowserSelectionNote').inner_text()
        page.locator('#punchOutChrArtwork').click()
        checks['exact_native_writer'] = page.evaluate('S.scenes[S.activeScene].captureMeta.punchOutArt.index===29 && S.chrBank==="bg"')
        page.locator('#chrUsageScope').select_option('whole')
        canvas = page.locator('#cv')
        rect = canvas.bounding_box()
        tile = 83
        canvas.click(position={'x': (tile % 16 + .5) * rect['width'] / 16,
                               'y': (tile // 16 + .5) * rect['height'] / 16})
        page.locator('#chrInspectNativeUses').click()
        checks['known_consumers_and_coverage'] = all(word in page.locator('#chrNativeConsumers').inner_text()
            for word in ['Don Flamenco', '367 full poses decoded', '176 need other context', 'not exhaustively covered'])
        # Return to an actual tile used by C0, select through the sheet and paint
        # through the ordinary pixel canvas. No direct asset mutation in the test.
        tile = page.evaluate('Forge.services.ResourceContext.chrUsage().tileIds[0]')
        canvas.click(position={'x': (tile % 16 + .5) * rect['width'] / 16,
                               'y': (tile // 16 + .5) * rect['height'] / 16})
        previous = page.evaluate('S.chr[S.editTile][0][0]')
        page.locator('#pixColorSel .ps').nth((previous+1)%4).click()
        pixels = page.locator('#chrEditCanvas')
        pixels.click(position={'x': 4, 'y': 4})
        current = bytes(page.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)'))
        changes = [i for i, (a, b) in enumerate(zip(rom, current)) if a != b]
        checks['pixel_changes_only_owned_bytes'] = bool(changes) and set(changes) <= {0x20010+29*4096+tile*16, 0x20010+29*4096+tile*16+8}
        screenshot_dir = os.environ.get('FORGE_QA_SCREENSHOT_DIR')
        if screenshot_dir:
            target = Path(screenshot_dir); target.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(target/f'prg{revision}-native-chr.png'))
        page.locator('#punchOutChrPose').click()
        page.locator('#punchOutPoseIdleGroup').check()
        page.locator('#punchOutPoseX').fill('-12')
        page.locator('#punchOutPoseApply').click()
        output = bytes(page.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)'))
        checks['idle_and_art_compose'] = [output[i] for i in [490,497,504]] == [244,242,243] and all(output[i] == current[i] for i in changes)
        saved = page.evaluate('Forge.services.ProjectStore.serialize()')
        other = browser.new_page()
        other.on('pageerror', lambda error: errors.append(str(error)))
        other.goto(html.as_uri(), wait_until='load')
        other.evaluate('saved=>Forge.services.ProjectStore.load(saved,{sync:true})', saved)
        checks['fresh_file_page_build_identical'] = bytes(other.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)')) == output
        checks['no_page_errors'] = not errors
        results.append({'revision': revision, 'checks': checks, 'errors': errors})
        page.close(); other.close()
        print(f'PRG {revision}: {sum(checks.values())}/{len(checks)} browser checks', flush=True)
    browser.close()
assert hashlib.sha256(html.read_bytes()).hexdigest() == identity, 'HTML changed during verification'
report = {'status': 'passed' if all(all(x['checks'].values()) for x in results) else 'failed',
    'htmlSha256': identity, 'browser': 'Chromium 153 headless', 'results': results,
    'scope': 'Actual standalone file page, rendered pose/CHR canvases, controls and pixel clicks after factory project intake. Native diff and fresh page checks. No full-fight, listening, controller or hardware acceptance.'}
Path(os.environ.get('FORGE_BROWSER_REPORT', Path(__file__).with_name('Browser_Verification.json'))).write_text(json.dumps(report,indent=2)+'\n')
assert report['status'] == 'passed', json.dumps(report)
