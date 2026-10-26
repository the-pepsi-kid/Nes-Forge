"""Real Chromium pixels and controls; only booleans/hashes leave private input RAM."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64,hashlib,json,os,sys
root=Path(__file__).resolve().parents[2]
html=Path(os.environ.get('FORGE_REVIEW_HTML',root/'nes-forge.html')).resolve()
identity=hashlib.sha256(html.read_bytes()).hexdigest()
checks=[];errors=[]
with sync_playwright() as runtime:
 browser=runtime.chromium.launch(executable_path=os.environ['CHROMIUM_PATH'],headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 def fresh():
  page=browser.new_page(viewport={'width':1440,'height':1080})
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
  page.goto(html.as_uri(),wait_until='load')
  page.evaluate('''()=>{window.qa={hash:c=>NativeEngineFormat.sha256(new Uint8Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data)),
   sceneHash:c=>{const g=c.getContext('2d'),out=new Uint8Array(256*240*4),z=c.width/256;for(let y=0;y<240;y++)for(let x=0;x<256;x++)out.set(g.getImageData(x*z,y*z,1,1).data,(y*256+x)*4);return NativeEngineFormat.sha256(out);},
   assets:()=>{const p=Forge.services.ProjectStore.capture();for(const k of ['chr','sprChr','nt','attr','pal','sprPal','oam','tileProps','activeScene','selTile','editTile','selSprite','selEntity','chrBank','_selAnim','_animFrame'])delete p[k];return NativeEngineFormat.sha256(new TextEncoder().encode(JSON.stringify(p)));},
   guides:()=>{for(const id of ['oGrid','oAttr','oMeta','viewShow'])document.getElementById(id).checked=false;document.getElementById('oZoom').value='2';render();}};}''')
  return page
 def check(name,value):
  assert value,name;checks.append({'name':name,'passed':True});print('PASS '+name,flush=True)
 page=fresh()
 page.evaluate('''()=>{const s=Forge.services,p=s.ProjectStore.capture(),chr=normalizeTiles(),spr=normalizeTiles();
   chr[1]=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>(x+y)%4));
   spr[2]=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>(x+y+1)%4));spr[3]=spr[2].map(row=>row.slice().reverse());
   const sc=makeScene({id:'pixel-fixture',name:'Palette and sprite fixture',chr,sprChr:spr,nt:Array(960).fill(1),attr:Array(64).fill(0),
    pal:[[15,1,17,33],[15,2,18,34],[15,3,19,35],[15,4,20,36]],sprPal:[[15,5,21,37],[15,6,22,38],[15,7,23,39],[15,8,24,40]],
    oam:[{x:16,y:17,tile:2,tile2:3,attr:194,height:16,active:true},{x:40,y:20,tile:2,attr:33,height:8,active:true}]});
   p.scenes=[sc];p.activeScene=0;p.metasprites=[];p.animations=[];s.ProjectStore.load(p,{sync:true});switchTab('scene');qa.guides();window.qaBefore=qa.assets();window.qaScene=qa.sceneHash(document.getElementById('cv'));
   s.ResourceRelationshipPreview.openAt('scene:'+sc.id);}''')
 check('Scene composite matches the actual editor pixel-for-pixel with flipped 8x16 OAM and priority',page.evaluate('qaScene===qa.hash(document.querySelector("#frx-preview canvas"))'))
 check('Scene Resources preview leaves canonical assets unchanged',page.evaluate('qa.assets()===qaBefore'))
 page.evaluate('''()=>{Forge.services.ResourceRelationshipPreview.close();const s=Forge.services,p=s.ProjectStore.capture(),sc=p.scenes[0],a=Array.from({length:32},(_,i)=>(i%4===0?15:i+1)&63),b=a.map((v,i)=>i%4?(v+16)&63:15);
   sc.raster={version:1,rows:Array.from({length:240},(_,y)=>Array.from({length:32},(_,x)=>[x*8,8,1,0,y&7,0]).flat()),palettes:[a,b],linePal:Array.from({length:240},(_,y)=>y<120?0:1),masks:Array.from({length:240},(_,y)=>y<120?30:31),baseNt:sc.nt.slice(),baseAttr:sc.attr.slice(),painted:{},attrEdited:{},useMask:true};
   s.ProjectStore.load(p,{sync:true});switchTab('scene');qa.guides();window.qaBefore=qa.assets();window.qaScene=qa.sceneHash(document.getElementById('cv'));s.ResourceRelationshipPreview.openAt('scene:'+sc.id);}''')
 check('Captured raster composite matches editor scanline palettes, grayscale and OAM pixels',page.evaluate('qaScene===qa.hash(document.querySelector("#frx-preview canvas"))'))
 check('Captured raster Resources preview leaves source and palette states unchanged',page.evaluate('qa.assets()===qaBefore'))
 page.evaluate('''()=>{Forge.services.ResourceRelationshipPreview.close();switchTab('chr');setChrBank('spr');S.editTile=S.selTile=3;render();window.qaBefore=qa.assets();}''')
 def chr_match():
  return page.evaluate('''()=>{const a=document.getElementById('chrEditCanvas').getContext('2d'),b=document.querySelector('#frx-preview canvas').getContext('2d'),tile=S.editTile%256;
   for(let y=0;y<8;y++)for(let x=0;x<8;x++){const p=a.getImageData(x*16+8,y*16+8,1,1).data,q=b.getImageData((tile%16)*16+x*2+1,(tile>>4)*16+y*2+1,1,1).data;if(p.some((v,i)=>v!==q[i]))return false;}return true;}''')
 for mode in ['scene','manual','indices']:
  page.locator('#chrPreviewMode').select_option(mode)
  page.evaluate('Forge.services.ResourceRelationshipPreview.openAt("chr:spr:"+S.scenes[S.activeScene].id)')
  check('CHR '+mode+' Resources matches all 64 selected-editor pixels including transparency',chr_match())
  page.locator('#frx-close').click()
 check('CHR color preview changes leave canonical pixels/palettes untouched',page.evaluate('qa.assets()===qaBefore'))
 # A capture atlas above 256 tiles must show the selected page rather than page 1.
 page.evaluate('''()=>{const s=Forge.services,p=s.ProjectStore.capture(),sc=p.scenes[0];sc.raster=null;sc.chr=normalizeTiles(Array.from({length:512},()=>Array.from({length:8},()=>Array(8).fill(0))));sc.chr[300]=Array.from({length:8},()=>Array(8).fill(3));sc.tileProps=Array(512).fill(0);
  s.ProjectStore.load(p,{sync:true});switchTab('chr');setChrBank('bg');S.editTile=S.selTile=300;render();s.ResourceRelationshipPreview.openAt('tile:bg:'+sc.id+':300');}''')
 check('Resources follows the selected tile above 255 to atlas page two', 'Atlas page 2' in page.locator('#frx-viewer-caption').inner_text())
 check('Atlas page two displays the selected tile color from its actual source',page.evaluate('''()=>{const c=document.querySelector('#frx-preview canvas'),d=c.getContext('2d').getImageData((300%16)*16+8,((300%256)>>4)*16+8,1,1).data,rgb=forgeCHR.mode==='indices'?[255,255,255]:NP[forgeCHR.palette(forgeCHR.resolve(300))[3]];return rgb.every((v,i)=>v===d[i]);}'''))
 page.close()
 for revision in range(2):
  page=fresh();prefix=f'PRG{revision} '
  rom=(Path(sys.argv[1])/f"Mike Tyson's Punch-Out!! (U) (PRG {revision}).nes").read_bytes()
  page.evaluate('''async encoded=>{const s=Forge.services; s.ProjectStore.load(await s.NativeResourceProject.create(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),'Preview browser verification'),{sync:true});await s.InvestigationUI.whenReady();}''',base64.b64encode(rom).decode())
  page.locator('#nf-skin-toggle').click();page.locator('#fcw-z2').click()
  page.locator('#fcw-panel-native [data-fcw-writer="punch-out-glass-joe-pose-placement-v1"]').click()
  page.locator('#punchOutPoseChoice').select_option('192');page.locator('#punchOutPoseOpen').click()
  page.locator('#fcw-relations').click();page.locator('#frx-native-output').click()
  check(prefix+'native output preview is visible and declares its bounded state-path scope',page.locator('#frx-native-output-result canvas').is_visible() and 'Declared native state path' in page.locator('#frx-native-output-result').inner_text())
  page.evaluate('''()=>{window.qaSnapshot=qa.hash(document.querySelector('#frx-preview > canvas'));window.qaOriginalOutput=qa.hash(document.querySelector('#frx-native-output-result canvas'));window.qaOriginalAssets=qa.assets();}''')
  check(prefix+'unmodified compiled pose preview matches canonical snapshot pixels',page.evaluate('qaSnapshot===qaOriginalOutput'))
  check(prefix+'native output preview leaves assets and original native bytes unchanged',page.evaluate('qaOriginalAssets===qa.assets()') and page.evaluate('NativeEngineFormat.sha256(Forge.services.RuntimeCompiler.compile().rom)')==hashlib.sha256(rom).hexdigest())
  page.locator('#frx-close').click();page.locator('#punchOutPoseArtwork').click()
  tile=page.evaluate('Forge163.metasprites.current.pieces[0].tile');page.evaluate('(tile)=>{S.editTile=S.selTile=tile;render();}',tile)
  old=page.evaluate('S.chr[S.editTile][0][0]');page.locator('#pixColorSel .ps').nth((old+1)%4).click();page.locator('#chrEditCanvas').click(position={'x':8,'y':8})
  page.locator('#punchOutChrPose').click();page.locator('#fcw-relations').click();page.locator('#frx-native-output').click()
  check(prefix+'native art pixel edit changes the rendered compiled output',page.evaluate('qa.hash(document.querySelector("#frx-native-output-result canvas"))!==qaOriginalOutput'))
  if os.environ.get('FORGE_QA_SCREENSHOT_DIR'):
   destination=Path(os.environ['FORGE_QA_SCREENSHOT_DIR']);destination.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(destination/f'preview-prg{revision}.png'),full_page=True)
  check(prefix+'canonical snapshot preview remains unchanged after physical edit',page.evaluate('qa.hash(document.querySelector("#frx-preview > canvas"))===qaSnapshot'))
  check(prefix+'preview reports the exact current compiled output SHA-256',page.evaluate('document.getElementById("frx-native-output-result").textContent.includes(NativeEngineFormat.sha256(Forge.services.RuntimeCompiler.compile().rom))'))
  page.locator('#frx-close').click();page.locator('#fcw-open').click();page.locator('[data-fcw-tab="health"]').click();page.locator('#fcw-check-build').click()
  check(prefix+'Project Health compiles supported native edits through real button','Compiler passed' in page.locator('#fcw-panel-health').inner_text())
  page.locator('#fcw-close').click();page.evaluate('''()=>{switchTab('chr');setChrBank('spr');S.editTile=S.selTile=8;render();}''')
  copied_pixel=page.evaluate('S.sprChr[8][0][0]');page.locator('#pixColorSel .ps').nth((copied_pixel+1)%4).click();page.locator('#chrEditCanvas').click(position={'x':8,'y':8})
  page.locator('#fcw-open').click();page.locator('[data-fcw-tab="health"]').click()
  check(prefix+'previous passing result is invalidated after unsupported snapshot edit','Check again' in page.locator('#fcw-panel-health').inner_text())
  page.locator('#fcw-check-build').click();text=page.locator('#fcw-build-report').inner_text()
  check(prefix+'real copied-art refusal locates source Scene pixel field and correct writer','sprChr[8][0][0]' in text and 'protected artwork snapshot' in text and 'Physical CHR' in text)
  page.locator('#fcw-build-report').get_by_role('button',name='Inspect this resource',exact=True).click()
  check(prefix+'diagnostic shortcut selects the confirmed source Scene resource',page.evaluate('Forge.services.ResourceRelationshipPreview.summary().selected==="scene:"+Forge163.metasprites.current.sceneId'))
  page.locator('#frx-close').click();page.evaluate("switchTab('metasprites')");page.locator('#fcw-relations').click();page.locator('#frx-native-output').click()
  check(prefix+'blocked native preview reports refusal instead of falling back to original pixels',page.locator('#frx-native-output-result canvas').count()==0 and 'Current output unavailable' in page.locator('#frx-native-output-result').inner_text())
  page.close()
 browser.close()
assert not errors,errors
assert hashlib.sha256(html.read_bytes()).hexdigest()==identity
report={'status':'passed','htmlSha256':hashlib.sha256(html.read_bytes()).hexdigest(),'checks':checks,'errors':errors,
 'scope':'Actual Chromium pixels/controls; initial native intake uses existing factory. No screenshots, ROM bytes or source-bearing projects persisted. No live-fight/hardware or OS file-picker acceptance.'}
Path(os.environ.get('FORGE_PREVIEW_BROWSER_REPORT',Path(__file__).with_name('Workflow_Browser.json'))).write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'passed':len(checks)}))
