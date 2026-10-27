import os
"""v0.15 RE Gameplay Recovery Workbench: original user trace, source-backed, safe, actual editor."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,sys
root=Path(__file__).resolve().parents[1]
trace=Path(os.environ.get('NES_FORGE_NATIVE_TRACE','/mnt/data/NES_Forge_Z2_Native_Animation_Trace.json'))
html=root/'NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html'
rom=Path(os.environ['NES_FORGE_Z2_ROM']).read_bytes() if 'NES_FORGE_Z2_ROM' in os.environ else None
checks={};errors=[]
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1420,'height':980},accept_downloads=True)
  page.on('pageerror',lambda e: errors.append(str(e)))
  page.set_content(html.read_text(),wait_until='load',timeout=120000)
  checks['RE_panel_in_real_Forge']=page.locator('#nf-recovery-workbench').count()==1 and page.locator('#reRuntimePanel').count()==1
  checks['host_world_retained']=page.locator('#nf-host-open').count()==1
  checks['emulator_trace_retained']=page.locator('#nf-trace-panel').count()==1
  first=page.evaluate('''() => ({ project: Forge.services.ProjectStore.serialize?.(), trace:Forge.services.NativeAnimationTrace.report() })''')
  page.locator('#nf-recovery-input').set_input_files(str(trace))
  page.wait_for_function('Forge.services.REGameplayRecoveryUI.getState().hasReport')
  data=page.evaluate('''() => {const s=Forge.services.REGameplayRecoveryUI.getState();return {stats:s.report.stats,candidates:s.report.candidates.map(x=>({id:x.id,status:x.status,frames:x.exampleFrames})),frames:s.report.frameCount,caveats:s.report.caveats,runtime:s.report.runtimeEligibility,blocks:s.report.sceneBlocks,marks:s.report.marks};}''')
  checks['real_3600_trace_analyzed']=data['frames']==3600
  checks['sword_actions_six']=data['stats']['swordActions']==6 and data['stats']['completeSwordStateSequences']==3
  checks['jump_and_walk_detected']=data['stats']['sustainedJumps']>=7 and data['stats']['walkCycles']>=4
  checks['episode_detail_with_frame_evidence']=('Evidence frames' in page.locator('#nf-recovery-detail').inner_text()) and page.locator('#nf-recovery-episodes button').count()==6
  checks['all_candidates_observational']=all(x['status'] in ('observed','insufficient-evidence') for x in data['candidates']) and data['runtime']=='blocked-unverified'
  checks['trace_marks_honest']=len(data['marks'])==0
  checks['scene_specific_analysis']=len(data['blocks'])>=3
  checks['gap_matrix_includes_stabs_collision']=page.evaluate('''() => {const c=Forge.services.REGameplayRecoveryUI.getState().report.coverage;return c.some(x=>x.id==='action.upstab'&&x.status==='needs-targeted-evidence')&&c.some(x=>x.id==='action.downstab'&&x.status==='needs-targeted-evidence')&&c.some(x=>x.id==='collision.world'&&x.status==='unverified')&&c.some(x=>x.id==='actor.metasprite')}''')
  checks['coverage_visible']=page.locator('#nf-recovery-coverage .nf-rec-candidate').count()>=14
  page.evaluate("switchTab('disasm')")
  page.locator('#nf-rec-tab-walk').click()
  checks['change_action_tab']=page.locator('#nf-rec-tab-walk').get_attribute('aria-pressed')=='true' and 'Evidence frames' in page.locator('#nf-recovery-detail').inner_text()
  if not checks['change_action_tab']:print('DEBUG WALK',page.locator('#nf-rec-tab-walk').get_attribute('aria-pressed'),page.locator('#nf-recovery-detail').inner_text()[:200])
  page.locator('#nf-recovery-input-b').set_input_files(str(trace))
  page.wait_for_function('Forge.services.REGameplayRecoveryUI.getState().hasB')
  checks['second_trace_compare']=page.evaluate('''() => !!Forge.services.REGameplayRecoveryUI.getState().comparison && Forge.services.REGameplayRecoveryUI.getState().comparison.checks.length===3''')
  with page.expect_download() as download_info:page.locator('#nf-recovery-export').click()
  download=download_info.value;data_export=json.loads(download.path().read_text())
  checks['export_draft_not_executable']=data_export['promoteToRuntime']==False and data_export['approval']=='not-authorized' and data_export['runtimeEligibility']=='blocked-unverified'
  checks['no_browser_error']=not errors
  page.evaluate("switchTab('disasm')")
  page.locator('#nf-recovery-workbench').scroll_into_view_if_needed()
  page.screenshot(path=str(root/'v15_re_workbench_trace.png'),full_page=False)
  after=page.evaluate('''() => ({project:Forge.services.ProjectStore.serialize?.(),trace:Forge.services.NativeAnimationTrace.report()})''')
  checks['no_project_mutation']=first['project']==after['project']
  checks['no_emulator_trace_mutation']=first['trace']==after['trace']
  # Untrusted malformed JSON rejected, not loaded into app.
  bad=json.loads(trace.read_text());bad['frames'][2]['frame']=bad['frames'][1]['frame']
  checks['reject_duplicate_frames']=page.evaluate('''x=>{try{Forge.services.REGameplayRecovery.validate(x);return false;}catch(e){return String(e.message).includes('skipped or duplicate');}}''',bad)
  bad2=json.loads(trace.read_text());bad2['profile']='arbitrary-rom-profile'
  checks['reject_unknown_profile']=page.evaluate('''x=>{try{Forge.services.REGameplayRecovery.validate(x);return false;}catch(e){return String(e.message).includes('No interpretation profile');}}''',bad2)
  bad3=json.loads(trace.read_text());bad3['frames'][0]['input']='alert(0)'
  checks['reject_injected_data']=page.evaluate('''x=>{try{Forge.services.REGameplayRecovery.validate(x);return false;}catch(e){return String(e.message).includes('Invalid frame');}}''',bad3)
  if rom:
    page.evaluate('''bytes=>emuLoadRomData(new Uint8Array(bytes),'z2-v15-source',0)''',list(rom))
    page.evaluate("switchTab('emu')")
    page.locator('#nf-trace-toggle').click()
    page.evaluate('''() => {for(let i=0;i<12;i++)emuRunFrame();}''')
    page.evaluate("switchTab('disasm')")
    page.locator('#nf-recovery-current').click()
    checks['direct_emulator_data']=page.evaluate('''() => Forge.services.REGameplayRecoveryUI.getState().report.frameCount===12''')
  browser.close()
print(json.dumps({'passes':sum(checks.values()),'total':len(checks),'checks':checks,'observations':data['stats'],'errors':errors},indent=2))
if not all(checks.values()):sys.exit(1)
