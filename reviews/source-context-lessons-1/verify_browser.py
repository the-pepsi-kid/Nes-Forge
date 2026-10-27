"""Actual file inputs, source roles, lesson navigation and responsive layout.

Private source bytes and project JSON remain in RAM/temporary browser storage.
Reports contain booleans/hashes only; optional QA screenshots stay outside Git/kit.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64,hashlib,json,os,sys
root=Path(__file__).resolve().parents[2];html=Path(os.environ.get('FORGE_REVIEW_HTML',root/'nes-forge.html')).resolve()
identity=hashlib.sha256(html.read_bytes()).hexdigest();checks=[];errors=[];requests=[]
with sync_playwright() as runtime:
 browser=runtime.chromium.launch(executable_path=os.environ['CHROMIUM_PATH'],headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 def fresh():
  page=browser.new_page(viewport={'width':1440,'height':1080})
  page.set_default_timeout(90000)
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
  page.on('request',lambda r:requests.append(r.url) if r.url.startswith(('http:','https:')) else None)
  page.add_init_script("Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true});")
  page.goto(html.as_uri(),wait_until='load')
  page.evaluate('''()=>{window.qa={assets:()=>{const p=Forge.services.ProjectStore.capture();for(const k of ['chr','sprChr','nt','attr','pal','sprPal','oam','tileProps','activeScene','selTile','editTile','selSprite','selEntity','chrBank','_selAnim','_animFrame'])delete p[k];return NativeEngineFormat.sha256(new TextEncoder().encode(JSON.stringify(p)));}};}''')
  return page
 def check(name,value):
  assert value,name;checks.append({'name':name,'passed':True});print('PASS '+name,flush=True)
 def open_project(page,data):
  page.locator('#projectIn').set_input_files({'name':'authored-context-check.json','mimeType':'application/json','buffer':data})
  page.wait_for_function('!S.nativeGame')
 def intake(page,data,name):
  page.locator('#projectGatewayFile').set_input_files({'name':name,'mimeType':'application/octet-stream','buffer':data})
  page.wait_for_function('!Forge.services.ProjectGatewayUI.getState().busy')
 def audio(page):
  page.locator('[data-view="audio"]').click()
  if page.locator('#nativeAudioOpen').is_visible():page.locator('#nativeAudioOpen').click()
 def screenshot(page,name):
  if os.environ.get('FORGE_QA_SCREENSHOT_DIR'):
   out=Path(os.environ['FORGE_QA_SCREENSHOT_DIR']);out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/(name+'.png')),full_page=True)
 page=fresh();blank=json.dumps(page.evaluate('Forge.services.ProjectStore.capture()')).encode()
 original=page.evaluate('qa.assets()');page.locator('[data-view="docs"]').click()
 check('Tech Docs directly exposes all 16 maintained chapters/exercise and retains original authoring reference',page.locator('#projectLessonChapter option').count()==16 and 'World Runtime' in page.locator('#sideDocs .doc').inner_text())
 page.locator('#projectLessonChapter').select_option('general');page.locator('#projectLessonSection').select_option(label='18. Current, independent and detached sources; in-app lessons')
 check('Section navigation places the selected heading below pinned reader controls',page.evaluate('''()=>{const a=document.querySelector('#general-18-current-independent-and-detached-sources-in-app-lessons').getBoundingClientRect(),b=document.getElementById('projectLessonControls').getBoundingClientRect();return a.top>=b.bottom-2&&a.top<innerHeight;}'''))
 page.locator('#projectLessonChapter').select_option('projects');page.locator('#projectLessonBody a[href="#metroid-audio"]').click()
 check('Cross-chapter Audio links open the exact longer chapter id',page.evaluate('Forge.services.ProjectLessons.getState().chapter==="metroid-audio"'))
 page.locator('#projectLessonReturn').click();check('Reading and returning preserve canonical project data',page.evaluate('qa.assets()')==original)
 unknown=bytearray(24592);unknown[:6]=bytes([78,69,83,26,1,1]);intake(page,bytes(unknown),'Independent_unknown.nes')
 check('Real intake input is labeled independent and offers current guarded actions',page.evaluate('Forge.services.ProjectGatewayUI.getState().ready') and page.locator('#projectGatewayPanel').get_attribute('data-source-role')=='independent')
 page.locator('[data-view="chr"]').click();page.locator('#pixColorSel .ps').nth(1).click();page.locator('#chrEditCanvas').click(position={'x':8,'y':8})
 check('Real pixel editing visibly disables stale intake actions',page.locator('#projectGatewayPanel').get_attribute('data-source-role')=='detached' and page.locator('#projectGatewayActions button:enabled').count()==0)
 intake(page,bytes(unknown),'Independent_unknown.nes');open_project(page,blank)
 check('Actual Open Project invalidates previous intake without a follow-up action',page.locator('#projectGatewayPanel').get_attribute('data-source-role')=='detached' and not page.evaluate('Forge.services.ProjectGatewayUI.getState().ready'))
 page.locator('[data-view="code"]').click();page.locator('#sourceWorkspaceToggle').click();page.locator('#sourceWorkspaceExample').click();page.locator('#sourceWorkspaceBuild').click()
 source_hash=page.evaluate('NativeEngineFormat.sha256(Forge.services.SourceWorkspaceUI.build().rom)');open_project(page,blank)
 check('Independent source files and compiled source ROM survive actual project opening',page.evaluate('Forge.services.SourceWorkspaceUI.getState().hasBuild') and page.evaluate('NativeEngineFormat.sha256(Forge.services.SourceWorkspaceUI.build().rom)')==source_hash and page.evaluate('S.asmSource===""'))
 page.close()
 for revision in range(2):
  page=fresh();prefix=f'PRG{revision} ';blank=json.dumps(page.evaluate('Forge.services.ProjectStore.capture()')).encode()
  rom=(Path(sys.argv[1])/f"Mike Tyson's Punch-Out!! (U) (PRG {revision}).nes").read_bytes();source_sha=hashlib.sha256(rom).hexdigest()
  intake(page,rom,f'Punch-Out PRG {revision}.nes');page.wait_for_function('Forge.services.ProjectGatewayUI.getState().ready')
  page.locator('#projectGateway-rom-project').click();page.wait_for_function('Forge.services.InvestigationUI.getState().staged')
  page.locator('#investigationImport').click();page.wait_for_function('S.nativeGame&&Forge.services.NativeAudioLibraryUI.getState().isCurrent')
  check(prefix+'actual gateway prepare/import restores matching project Audio and RE identities',page.evaluate('Forge.services.NativeAudioLibraryUI.getState().sourceSha256')==source_sha and page.locator('#nativeAudioSourceContext').get_attribute('data-source-role')=='project')
  check(prefix+'successful import leaves old intake visibly expired despite matching source hash',page.locator('#projectGatewayPanel').get_attribute('data-source-role')=='detached' and page.locator('#projectGatewayActions button:enabled').count()==0)
  page.locator('[data-view="disasm"]').click();page.locator('#spatialREShow').click()
  page.locator('#spatialREFile').set_input_files({'name':'Spatial source.nes','mimeType':'application/octet-stream','buffer':rom});page.wait_for_function('!Forge.services.SpatialREUI.getState().busy')
  page.locator('#investigationPrepare').click();page.wait_for_function('Forge.services.InvestigationUI.getState().staged')
  spatial_before=page.evaluate('qa.assets()');page.locator('#spatialREFile').set_input_files({'name':'Changed spatial source.nes','mimeType':'application/octet-stream','buffer':bytes(unknown)})
  page.wait_for_function('!Forge.services.InvestigationUI.getState().staged&&!Forge.services.SpatialREUI.getState().busy')
  check(prefix+'actual spatial source replacement disables its old prepared import without project mutation',page.locator('#investigationImport').is_disabled() and page.evaluate('qa.assets()')==spatial_before)
  page.locator('#nf-skin-toggle').click();page.locator('#fcw-z2').click();page.locator('#fcw-panel-native [data-fcw-writer="punch-out-glass-joe-pose-placement-v1"]').click()
  page.locator('#punchOutPoseChoice').select_option('192');page.locator('#punchOutPoseOpen').click();before=page.evaluate('qa.assets()')
  page.locator('#projectLessonsOpen').click()
  check(prefix+'idle pose opens its exact in-app edit lesson with visible section heading',page.evaluate('Forge.services.ProjectLessons.getState().anchor.includes("17-edit-native-idle")') and page.locator('#punch-out-17-edit-native-idle-and-incremental-poses').is_visible())
  screenshot(page,f'idle-lesson-prg{revision}')
  page.locator('#projectLessonReturn').click()
  check(prefix+'lesson return preserves selected pose, canonical assets and exact native output',page.evaluate('S.tab==="metasprites"&&Forge163.metasprites.current?.id==="po-native-incremental-pose-f0-s192"') and page.evaluate('qa.assets()')==before and page.evaluate('NativeEngineFormat.sha256(Forge.services.RuntimeCompiler.compile().rom)')==source_sha)
  page.locator('#fcw-relations').click();page.locator('#frx-related-tools').get_by_role('button',name='Lesson for this resource',exact=True).click()
  check(prefix+'Resources pose help follows its resource kind',page.evaluate('Forge.services.ProjectLessons.getState().anchor.includes("17-edit-native-idle")'))
  page.locator('#projectLessonReturn').click();page.locator('#punchOutPoseArtwork').click();page.locator('#fcw-relations').click();page.locator('#frx-related-tools').get_by_role('button',name='Lesson for this resource',exact=True).click()
  check(prefix+'physical CHR help opens the footprint/writer lesson',page.evaluate('Forge.services.ProjectLessons.getState().anchor.includes("19-follow-a-pose")'))
  page.locator('#projectLessonReturn').click();intake(page,rom,f'Audio return PRG {revision}.nes');page.locator('#projectGateway-audio').click();page.wait_for_function('Forge.services.NativeAudioLibraryUI.getState().isCurrent')
  page.locator('[data-view="chr"]').click();page.locator('#cv').click(position={'x':36,'y':12});audio(page)
  assert page.locator('#nativeAudioSourceContext').get_attribute('data-source-role')=='detached'
  source_before=page.evaluate('qa.assets()');page.locator('#nativeAudioProjectSource').click();page.wait_for_function('Forge.services.NativeAudioLibraryUI.getState().isCurrent&&!Forge.services.NativeAudioLibraryUI.getState().busy')
  check(prefix+'current-project Audio source button restores the matching ROM without changing assets or emulator',page.locator('#nativeAudioSourceContext').get_attribute('data-source-role')=='project' and page.evaluate('qa.assets()')==source_before and page.evaluate('!emu.loaded'))
  page.locator('#nativeAudioLesson').click()
  check(prefix+'Audio source help opens the native Audio chapter',page.evaluate('Forge.services.ProjectLessons.getState().anchor.includes("7-audio")'))
  page.locator('#projectLessonReturn').click();open_project(page,blank);audio(page)
  check(prefix+'actual project replacement retains old evidence and visibly disables stale Audio operations',page.locator('#nativeAudioSourceContext').get_attribute('data-source-role')=='detached' and all(page.locator('#'+id).is_disabled() for id in ['nativeAudioInspect','nativeAudioPlay','nativeAudioPreview','nativeAudioApply']))
  page.locator('#nativeAudioLesson').click()
  check(prefix+'detached catalog help retains the detached role', 'Detached source' in page.locator('#projectLessonContext').inner_text() and not page.evaluate('Forge.services.NativeAudioLibraryUI.getState().isCurrent'))
  page.locator('#projectLessonReturn').click();before=page.evaluate('qa.assets()');page.locator('#nativeAudioIndependent').click();page.wait_for_function('Forge.services.NativeAudioLibraryUI.getState().isCurrent&&!Forge.services.NativeAudioLibraryUI.getState().busy')
  check(prefix+'explicit independent continuation preserves project and emulator state',page.locator('#nativeAudioSourceContext').get_attribute('data-source-role')=='independent' and page.evaluate('qa.assets()')==before and page.evaluate('S.importedRom===null&&!emu.loaded'))
  page.locator('#nativeAudioInspect').click();page.wait_for_function('!Forge.services.NativeAudioLibraryUI.getState().busy')
  check(prefix+'independent native cue inspection uses the retained exact ROM',page.evaluate('Forge.services.NativeAudioLibraryUI.getState().sourceSha256')==source_sha and 'Cue source decoded' in page.locator('#nativeAudioStatus').inner_text())
  open_project(page,blank)
  check(prefix+'independent Audio remains current after opening another authored project',page.evaluate('Forge.services.NativeAudioLibraryUI.getState().isCurrent&&Forge.services.NativeAudioLibraryUI.getState().sourceRole==="independent"&&S.importedRom===null'))
  audio(page);page.locator('#nativeAudioLesson').click()
  check(prefix+'independent source lesson separates current generated project output', 'Independent source' in page.locator('#projectLessonContext').inner_text() and 'Generated' in page.locator('#projectLessonScope').inner_text())
  page.set_viewport_size({'width':390,'height':844});page.locator('#projectLessonSection').select_option(label='22. Identify the source and find the lesson inside Forge')
  check(prefix+'narrow-screen section and return controls stay accessible without page overflow',page.locator('#projectLessonReturn').is_visible() and page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  check(prefix+'narrow-screen selected heading clears pinned controls',page.evaluate('''()=>{const a=document.getElementById('punch-out-22-identify-the-source-and-find-the-lesson-inside-forge').getBoundingClientRect(),b=document.getElementById('projectLessonControls').getBoundingClientRect();return a.top>=b.bottom-2&&a.top<innerHeight;}'''))
  screenshot(page,f'mobile-lesson-prg{revision}');page.close()
 browser.close()
assert not errors,errors;assert not requests,requests;assert hashlib.sha256(html.read_bytes()).hexdigest()==identity
report={'status':'passed','htmlSha256':identity,'checks':checks,'errors':errors,'externalRequests':requests,
 'scope':'Actual Chromium file-input intake/import/open, source role/guard presentation, independent native cue inspection, lesson controls/anchors and 390px layout. No full fight, listening/controller/hardware or public hosting acceptance. Private bytes/projects/screenshots excluded.'}
Path(os.environ.get('FORGE_SOURCE_LESSONS_BROWSER_REPORT',Path(__file__).with_name('Workflow_Browser.json'))).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':len(checks)}))
