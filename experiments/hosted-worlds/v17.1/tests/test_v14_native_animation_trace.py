import os
"""v0.14: observe actual completed frames in NES Forge emulator; do not infer Zelda II animation mappings."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,sys
root=Path(__file__).resolve().parents[1]
rom=Path(os.environ['NES_FORGE_Z2_ROM']).read_bytes()
html=root/'NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html'
checks={};errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1420,'height':980});page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html.read_text(),wait_until='load',timeout=120000)
 checks['panel_exists']=page.locator('#nf-trace-panel').count()==1
 checks['original_project_still_has_world_live']=page.locator('#nf-host-open').count()==1
 loaded=page.evaluate('''bytes => emuLoadRomData(new Uint8Array(bytes),'z2-safety-test',0)''',list(rom))
 checks['rom_loaded']=bool(loaded)
 page.evaluate("switchTab('emu')")
 page.locator('#nf-trace-toggle').click()
 checks['recording_started']=page.evaluate('Forge.services.NativeAnimationTrace.recording')
 # ROM is actually executed; trace is called only AFTER real NES frames complete.
 result=page.evaluate('''() => {for(let i=0;i<6;i++)emuRunFrame();const r=Forge.services.NativeAnimationTrace.report();return {r,last:{frame:emu.frameCount,pose:emu.ram[0x80],facing:emu.ram[0x9f],sword:emu.ram[0x400],jump:emu.ram[0x479]},isRunning:Forge.services.NativeAnimationTrace.recording}}''')
 r=result['r']; last=r['frames'][-1]
 checks['six_actual_emulator_frames']=r['frameCount']==6 and len(r['frames'])==6 and last['frame']==6
 checks['source_memory_matches']=all(last[key]==result['last'][key] for key in ['frame','pose','facing','sword','jump'])
 checks['trace_is_read_only_evidence']=r['evidence']=='original-ROM emulator RAM sampled after completed frames' and any('not a verified animation-state machine' in x for x in r['limits'])
 checks['source_info_no_rom_blob']=not any(k.lower().startswith('rom') for k in r.keys()) and len(json.dumps(r))<20000
 page.locator('#nf-trace-mark').select_option('walk')
 page.locator('#nf-trace-mark-button').click()
 checks['observer_mark_not_native_claim']=page.evaluate("Forge.services.NativeAnimationTrace.report().marks[0].annotationOnly===true")
 page.locator('#nf-trace-toggle').click()
 checks['stop_keeps_data']=page.evaluate('!Forge.services.NativeAnimationTrace.recording&&Forge.services.NativeAnimationTrace.frames===6')
 page.locator('#nf-trace-toggle').click()
 checks['new_recording_resets_trace']=page.evaluate('Forge.services.NativeAnimationTrace.frames===0')
 page.evaluate('emuRunFrame()')
 checks['actual_trace_after_restart']=page.evaluate('Forge.services.NativeAnimationTrace.frames===1')
 # Restart source should fail safely and not affect emulator.
 page.evaluate('emuDoReset()')
 page.evaluate('emuRunFrame()')
 checks['reset_stops_observer_safely']=page.evaluate('!Forge.services.NativeAnimationTrace.recording')
 checks['no_javascript_errors']=not errors
 page.screenshot(path=str(root/'v14_native_trace_ui.png'),full_page=False)
 browser.close()
print(json.dumps({'checks':checks,'pass':sum(checks.values()),'total':len(checks),'errors':errors},indent=2))
if not all(checks.values()):sys.exit(1)
