import os
"""v0.16: real ROM source audit, full source inventory, guarded reversible unlock, probe, original state rollback."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,sys,hashlib
root=Path(__file__).resolve().parents[1]
rompath=Path(os.getenv('NES_FORGE_Z2_ROM','/mnt/data/Zelda 2 - The Adventure of Link (U)(1).nes'))
rom=rompath.read_bytes()
html=(root/'NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html').read_text()
checks={};errors=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
 p=b.new_page(accept_downloads=True,viewport={'width':1400,'height':900})
 p.on('pageerror',lambda e: errors.append(str(e)))
 p.set_content(html,wait_until='load',timeout=120000)
 checks['campaign_UI']=p.locator('#nf-campaign').count()==1
 checks['old_UI']=p.locator('#nf-recovery-workbench').count()==1 and p.locator('#nf-host-open').count()==1
 cat=p.evaluate('Forge.services.REGameplayCampaign.indexedCatalog()')
 checks['source_index_full']=cat['indexedCount']>=1700 and cat['codeCount']>500 and cat['dataCount']>1000
 checks['categorized_groups']=sum(x['total'] for x in cat['groups'].values())==cat['indexedCount']
 checks['search']=p.evaluate('''() => {const x=Forge.services.REGameplayCampaign.lookupCatalog({term:'Link',limit:20}); return x.total>10&&x.rows.length===20}''')
 checks['bad_source_refused']=p.evaluate('''() => {const r=Forge.services.REGameplayCampaign.inspect(new Uint8Array(262160));return r.sourceGuard==='refused-unverified-source'}''')
 # Original ROM loaded in real Emulator. User's ROM never incorporated into output.
 p.evaluate('bytes=>emuLoadRomData(new Uint8Array(bytes),"Zelda II owner ROM",0)',list(rom))
 p.evaluate("switchTab('disasm')")
 before=p.evaluate('''() => ({state:Forge.services.ProjectStore.serialize?.(),ram:emu.ram[0x796],frame:emu.frameCount,romHash:FamiTone2Native.sha256(emu.lastBuiltRom)})''')
 p.locator('#nf-campaign-scan').click()
 att=p.evaluate('''() => Forge.services.REGameplayCampaignUI.getState().scan''')
 checks['ROM_recognized']=att is not None and att['source']['romSha256']==hashlib.sha256(rom).hexdigest()
 checks['protected_byte_anchors']=att is not None and len(att['anchors'])==4 and all(x['verified'] for x in att['anchors'])
 checks['source_attestation']=att is not None and att['source']['sourceGuard']=='verified-for-technique-test'
 checks['read_only_scan']=p.evaluate('emu.ram[0x796]')==before['ram']
 checks['scan_no_project_mutation']=p.evaluate('Forge.services.ProjectStore.serialize?.()')==before['state']
 p.locator('#nf-campaign-query').fill('collision')
 checks['search_UI']=p.locator('#nf-campaign-list .nf-campaign-entry').count()>0
 with p.expect_download() as d: p.locator('#nf-campaign-export').click()
 result=json.loads(d.value.path().read_text())
 checks['evidence_export_no_rom']=result['romIncluded']==False and 'bytes' not in result['source'] and result['runtimeEligibility']=='blocked-unverified'
 p.locator('#nf-campaign-grant').click()
 checks['grant_flag_or']=p.evaluate('emu.ram[0x796]')==(before['ram']|0x14)
 checks['checkpoint_owned']=p.evaluate('Forge.services.REGameplayCampaign.status().active && Forge.services.EmulatorTimeline.listCheckpoints().length>0')
 checks['cannot_double_grant']=p.evaluate('''() => {try{Forge.services.REGameplayCampaign.grantStabs();return false}catch(e){return String(e.message).includes('already active')}}''')
 p.locator('#nf-campaign-probe-up').click()
 p.wait_for_function('!document.querySelector("#nf-campaign-probe-up").disabled',timeout=60000)
 state=p.evaluate('Forge.services.REGameplayRecoveryUI.getState()')
 checks['script_recorded']=state['hasReport'] and state['report']['frameCount']>=20
 if not checks['script_recorded']: print('DEBUG PROBE:',p.locator('#nf-campaign-status').inner_text(),p.locator('#nf-campaign-experiment').inner_text()[:1200],state['hasReport'],p.evaluate('Forge.services.NativeAnimationTrace.report().frameCount'),p.evaluate('Forge.services.EmulatorTimeline.status()'),p.evaluate('Forge.services.NativeAnimationTrace.recording'))
 checks['probe_requires_no_code_patch']=p.evaluate('FamiTone2Native.sha256(emu.lastBuiltRom)')==before['romHash']
 p.locator('#nf-campaign-restore').click()
 checks['restored_original_ram']=p.evaluate('emu.ram[0x796]')==before['ram']
 checks['restored_original_frame']=p.evaluate('emu.frameCount')==before['frame']
 checks['no_checkpoint_left']=not p.evaluate('Forge.services.REGameplayCampaign.status().active')
 checks['no_project_mutation']=p.evaluate('Forge.services.ProjectStore.serialize?.()')==before['state']
 checks['original_rom_unchanged']=p.evaluate('FamiTone2Native.sha256(emu.lastBuiltRom)')==before['romHash']
 # Refuse modified ROM protected instructions even when iNES header remains valid.
 changed=bytearray(rom);changed[0x1584]^=1
 proof=p.evaluate('bytes=>Forge.services.REGameplayCampaign.inspect(new Uint8Array(bytes))',list(changed))
 checks['protected_byte_change_refused']=proof['sourceGuard']=='refused-unverified-source' and not proof['anchors'][0]['verified']
 checks['page_errors_none']=not errors
 b.close()
print(json.dumps({'passed':sum(checks.values()),'total':len(checks),'checks':checks,'pageErrors':errors},indent=2))
if not all(checks.values()): sys.exit(1)
