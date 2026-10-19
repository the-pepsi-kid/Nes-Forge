"""Preserve every predecessor file, add the real app, and build a Windows-safe ZIP."""
from pathlib import Path
import json,hashlib,zipfile,tempfile,shutil,subprocess,re,html,os

root=Path(__file__).resolve().parents[2];review=Path(__file__).parent;app=root/'app'
sha=lambda b:hashlib.sha256(b).hexdigest()
candidate=json.loads((root/'CANDIDATE.json').read_text())
assert candidate['candidate']=='ninja-zelda-re-1'
predecessor=root/'tester-kit/spatial-re-1/NF_Spatial_RE.zip'
assert sha(predecessor.read_bytes())=='9818b48449a4176f43e4d7139d90adbb3ff062dfa710df11ea332e29e47f79fd'
final_path=root.parent/'NF_Ninja_Zelda_RE.zip'
with tempfile.TemporaryDirectory(prefix='nf-game-kit-') as temporary:
 out=Path(temporary)/'kit';out.mkdir()
 with zipfile.ZipFile(predecessor) as z:
  assert z.testzip() is None
  z.extractall(out)
 archive=out/'RC5';archive.mkdir()
 replaced=set()
 def replace(name,data):
  target=out/name
  if target.exists() and name not in replaced:
   saved=archive/name;saved.parent.mkdir(parents=True,exist_ok=True);saved.write_bytes(target.read_bytes());replaced.add(name)
  target.parent.mkdir(parents=True,exist_ok=True)
  target.write_bytes(data if isinstance(data,bytes) else data.encode())
 def json_file(name,value):replace(name,json.dumps(value,indent=2)+'\n')
 head=(out/'START_HERE.html').read_text().split('</head>')[0]+'</head>'
 def page(title,body):return re.sub(r'<title>.*?</title>','<title>'+html.escape(title)+'</title>',head)+'<body><main><header>NES FORGE / NATIVE GAME RE CHECKPOINT</header>'+body+'</main></body></html>'
 replace('NES_Forge.html',(app/'mainline/NES_Forge_2.0.0-alpha.11.html').read_bytes())
 assert sha((out/'NES_Forge.html').read_bytes())==candidate['htmlSha256']
 for name,target in [('NINJA_ZELDA_RE.md','Native_Game_RE_Guide.html'),('SPATIAL_RE.md','Spatial_RE_Guide.html')]:
  replace(name,(app/'docs'/name).read_bytes())
  body=subprocess.check_output(['pandoc','--from=gfm','--to=html5',str(out/name)],text=True)
  body=body.replace('href="SPATIAL_RE.md"','href="Spatial_RE_Guide.html"').replace('href="NINJA_ZELDA_RE.md"','href="Native_Game_RE_Guide.html"')
  replace(target,page('Native Game RE — controls, evidence and limits','<p><a href="START_HERE.html">Start here</a> · <a href="NES_Forge.html">Open NES Forge</a></p>'+body))
 for name in ['NATIVE_RE_RESEARCH_NOTICE.md','NinjaGaidenNES_Apache_2.0.txt']:replace(name,(app/'docs'/name).read_bytes())
 # Where the kit carries these retained example receipts, refresh identity
 # only. Their authored project/ROM payloads remain byte-identical.
 for item in json.loads((review/'Example_Receipt_Updates.json').read_text()):
  if (out/item['path']).exists():replace(item['path'],(app/item['path']).read_bytes())
 examples=json.loads((review/'Example_Regeneration.json').read_text())['comparisons']
 example_links=[]
 for item in examples:
  source=app/item['path'];relative=Path(item['path']).relative_to('examples').as_posix();target='Current_Examples/'+relative
  assert sha(source.read_bytes())==item['afterSha256'],item['path']
  replace(target,source.read_bytes());example_links.append('<li><a href="'+html.escape(target,quote=True)+'">'+html.escape(relative)+'</a></li>')
 replace('Current_Examples.html',page('Current verified examples','<p><a href="START_HERE.html">Start here</a> · <a href="NES_Forge.html">Open NES Forge</a></p><h1>Current verified examples</h1><p>These 58 retained files were regenerated against this application. Projects and ROMs remain byte-identical; six build receipts update the application identity. In NES Forge choose Open Project, then select a .nesforge.json file from this extracted folder. ROM files can also run in the emulator. No commercial game input is included.</p><ul>'+''.join(example_links)+'</ul>'))
 gate=json.loads((app/'test-results/candidate/Summary.json').read_text());browser=json.loads((review/'browser/Report.json').read_text());retained=json.loads((review/'Retained_Browser_Verification.json').read_text())
 assert gate['status']==browser['status']==retained['status']=='passed'
 browser_checks=browser['passed']+retained['checks']
 intro=f'''<h1>See how the original world is built.</h1><p class="lead">Connected Ninja Gaiden and Zelda II resources: native scene art, geometry, objects, actor tables, sprite poses, code and evidence. The actual standalone NES Forge application is included.</p>
<p><a class="button" href="NES_Forge.html">Open NES Forge</a> <a class="button secondary" href="Native_Game_RE_Guide.html">Native RE tutorial</a></p>
<div class="card"><h2>Start with your ROM</h2><ol><li>Open NES Forge, then <strong>RE / DISASM → Open spatial RE workbench</strong>.</li><li>Choose your investigated Ninja Gaiden or Zelda II ROM. The connected resource catalog opens above the earlier category map.</li><li>Explore scenes and original art, objects, actors, scripts/poses, CHR, code and RAM leads.</li><li>Click a map cell for source evidence. Read Coverage &amp; gaps, then export a selected scene or the resource catalog.</li></ol><p>ROMs are not included. Unknown or modified revisions do not receive guessed native structures. No separate Windows decoder or export step is needed.</p></div>
<div class="grid"><div class="card"><h2>Ninja Gaiden</h2><p>48 rooms with original initial art and palettes; ground kinds, 423 enemy records, 281 lantern records, entrances, actor dispatch/parameter tables, 83 nonempty scripts and 202 native poses.</p></div><div class="card"><h2>Zelda II</h2><p>567 scene/context slots across nine table/world contexts; 561 available views with original construction and initial art, object/enemy records, page-indexed connections and 30 Link pose/facing samples.</p></div></div>
<p>Counts include shared/reused streams and unused table entries. This is read-only source investigation, not a complete playable reconstruction. Full collision response, physics, AI, quest state and animation bindings remain incomplete.</p>
<h2>Zelda II playback correction</h2><p>The supplied title-screen ground/tree corruption is corrected by honoring the original visible PPU address reload. Capture uses the same corrected coordinates. The emulator remains scanline based; this is not a hardware-accuracy claim.</p>
<h2>Earlier tools and tutorials</h2><p><a href="Current_Examples.html">Current verified examples</a> · <a href="Spatial_RE_Guide.html">Earlier four-game spatial controls</a> · <a href="Mega_Man_2_Audio.html">Mega Man 2 audio</a> · <a href="Native_Audio_Guide.html">Native audio</a> · <a href="Audio_Discovery_Guide.html">Unknown-ROM audio</a> · <a href="Guide.html">User guide</a> · <a href="Tutorial.html">Original tutorial</a> · <a href="Manual.html">Manual</a> · <a href="Tutorial.pdf">Tutorial PDF</a> · <a href="Manual.pdf">Manual PDF</a></p><p>The original tutorial/manual styling and all predecessor examples are retained. RC3 preserves the original alpha kit; RC4 and RC5 preserve replaced predecessor launch/metadata files.</p>
<h2>Measured checks</h2><p>{gate['total']:,} automated cases across {gate['suiteCount']} suites, retaining all 107 prior suites and 1,970 cases. {browser_checks} browser checks include the earlier spatial/audio workflows. Native routine comparisons verify the new bounded outputs. See <a href="VERIFICATION.json">verification and limits</a>.</p>
<p>Windows: extract the entire ZIP to a short path such as <code>C:/NF/Ninja_Zelda_RE</code>. Open <code>START_HERE.html</code>. This ZIP has no redundant enclosing directory.</p>'''
 replace('START_HERE.html',page('Start here — NES Forge Native Game RE',intro))
 readme='''NES Forge Native Game RE review kit

Extract the entire ZIP to C:/NF/Ninja_Zelda_RE or another short location. Open START_HERE.html, then Open NES Forge. NES_Forge.html is the complete standalone app.

RE / DISASM > Open spatial RE workbench. Choose your own investigated Ninja Gaiden or Zelda II ROM once. Read Native_Game_RE_Guide.html for controls, exact coverage and gaps. The catalog is read-only; full playable conversion and complete collision/AI/physics are not implemented.

All earlier tools, original tutorials, manual styles and examples are retained. No commercial ROM or extracted commercial asset payload is included. RC3/RC4/RC5 preserve predecessor content. Run python verify_kit.py for the packaged inventory.
'''
 for name in ['README.md','README.txt','START_HERE.md']:replace(name,readme)
 records={
  'Automated_Summary.json':app/'test-results/candidate/Summary.json',
  'Native_Game_ROM_Verification.json':review/'ROM_Verification.json',
  'Native_Game_Browser_Report.json':review/'browser/Report.json',
  'Source_Index_Verification.json':review/'Source_Index_Verification.json',
  'Example_Regeneration.json':review/'Example_Regeneration.json',
  'Example_Receipt_Updates.json':review/'Example_Receipt_Updates.json',
  'Retained_Browser_Verification.json':review/'Retained_Browser_Verification.json',
  'Spatial_Browser_Report.json':root/'reviews/spatial-re-1/browser/Report.json',
  'MegaMan2_Browser_Report.json':root/'reviews/megaman2-native-audio-1/browser/Report.json',
  'Known_Library_Browser_Report.json':root/'reviews/native-audio-library-1/browser/Report.json',
  'Discovery_Browser_Report.json':root/'reviews/audio-discovery-1/browser/Report.json'}
 for name,p in records.items():replace('Evidence/'+name,p.read_bytes())
 json_file('SOURCE_RECORD.json',{'format':'NESForgeNativeGameReviewKit','candidate':candidate['candidate'],'branch':candidate['branch'],'htmlSha256':candidate['htmlSha256'],'parentCommit':candidate['parentCommit'],'standaloneApplication':'NES_Forge.html','guide':'Native_Game_RE_Guide.html','predecessorZipSha256':sha(predecessor.read_bytes()),'commercialROMsIncluded':False,'completeGameRecovery':False})
 json_file('VERIFICATION.json',{'status':'passed','applicationSha256':candidate['htmlSha256'],'automated':{'suites':gate['suiteCount'],'cases':gate['total'],'retainedSuites':107,'retainedCases':1970},'browserChecks':browser_checks,'nativeRoutineVerification':'Evidence/Native_Game_ROM_Verification.json','limits':['Headless Linux browser/phone viewport; no physical Windows/mobile, listening or NES hardware claim.','Static/contextual native structures and bounded original execution; full behavior and playable reconstruction incomplete.']})
 json_file('DOCUMENTATION_REVIEW.json',{'status':'preserved-and-extended','newGuide':'Native_Game_RE_Guide.html','predecessorOriginalManualAndTutorialByteIdentical':True,'actualApplicationIncluded':True,'unsupportedDomainsExplicit':True})
 replace('REVIEW_REPORT.md','# Native Game RE checkpoint\n\nThe complete application, new controls/coverage guide, all predecessor documentation/examples and measured verification records are included. Read Coverage & gaps in the application. Full game recovery and playable conversion are incomplete.\n')
 replace('verify_kit.py','''from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parent
manifest=json.loads((root/'CONTENT_INVENTORY.json').read_text())
for item in manifest['files']:
 p=root/item['path'];assert p.is_file(),item['path'];assert p.stat().st_size==item['bytes'],item['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256'],item['path']
print('Verified',len(manifest['files']),'packaged payloads')
''')
 # Preserve the predecessor inventory before generating the new closed list.
 for name in ['CONTENT_INVENTORY.json','package_files.json']:
  target=out/name
  if name not in replaced:
   saved=archive/name;saved.parent.mkdir(parents=True,exist_ok=True);saved.write_bytes(target.read_bytes());replaced.add(name)
 files=lambda:sorted(p for p in out.rglob('*') if p.is_file() and not any(part.startswith('.') for part in p.relative_to(out).parts))
 names=[p.relative_to(out).as_posix() for p in files()]
 replace('package_files.json',json.dumps(names,indent=2)+'\n')
 payload=[{'path':p.relative_to(out).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in files() if p.name!='CONTENT_INVENTORY.json' or p.parent!=out]
 inventory={'format':'NESForgeReviewKitInventory','version':1,'applicationSha256':candidate['htmlSha256'],'files':payload}
 replace('CONTENT_INVENTORY.json',json.dumps(inventory,indent=2)+'\n')
 # Every original file either remains unchanged or is retained byte-exact in RC5.
 with zipfile.ZipFile(predecessor) as prior:
  for name in prior.namelist():
   if name.endswith('/'):continue
   original=prior.read(name);current=out/name
   assert current.exists()
   assert current.read_bytes()==original or (archive/name).read_bytes()==original,name
 subprocess.run(['python3',str(out/'verify_kit.py')],check=True)
 names=[p.relative_to(out).as_posix() for p in files()]
 for name in names:
  assert len('C:/NF/Ninja_Zelda_RE/'+name)<240,name
  assert not any(re.search(r'[<>:"|?*\\]|[ .]$',part) or re.match(r'(?i)^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)',part) for part in Path(name).parts),name
 staged=Path(temporary)/'NF_Ninja_Zelda_RE.zip'
 with zipfile.ZipFile(staged,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for name in names:
   info=zipfile.ZipInfo(name,(2026,10,19,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,(out/name).read_bytes(),compresslevel=9)
 with zipfile.ZipFile(staged) as z:assert z.testzip() is None
 final_path.parent.mkdir(parents=True,exist_ok=True);delivery=final_path.with_suffix('.zip.tmp');shutil.copyfile(staged,delivery);os.replace(delivery,final_path)
 record={'file':str(final_path),'bytes':final_path.stat().st_size,'sha256':sha(final_path.read_bytes()),'applicationSha256':candidate['htmlSha256'],'files':len(names),'inventoriedPayloads':len(payload),'predecessorFilesPreserved':366,'predecessorReplacementsArchived':len(replaced),'fixedTimestamps':True}
 (review/'Review_Kit.json').write_text(json.dumps(record,indent=2)+'\n');(review/'Review_Kit_Inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
 (review/'Windows_Zip_Check.json').write_text(json.dumps({'status':'passed','fileCount':len(names),'maxExtractionPathAtRecommendedRoot':max(len('C:/NF/Ninja_Zelda_RE/'+n) for n in names),'invalidWindowsNames':0,'redundantEnclosingFolder':False,'nativeWindowsExtractionTested':False},indent=2)+'\n')
 print(json.dumps(record))
