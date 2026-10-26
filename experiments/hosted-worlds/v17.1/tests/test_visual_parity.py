import os
import os,json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
rom_file=os.environ.get('NES_FORGE_Z2_ROM')
if not rom_file: raise SystemExit('Set NES_FORGE_Z2_ROM to the path of your own Zelda II ROM')
rom=Path(rom_file).read_bytes()
assert len(rom)==262160
errs=[];checks={}
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1560,'height':1000});page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content((root/'NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html').read_text(),wait_until='load',timeout=120000)
 page.locator('#nativeWorldFile').set_input_files({'name':'z2.nes','mimeType':'application/octet-stream','buffer':rom})
 page.wait_for_function('S.nativeGame?.profile === "zelda2-overworld-v1"',timeout=15000)
 page.wait_for_function('document.querySelectorAll("#nativeWorldBrushes button canvas").length===16')
 snap=page.evaluate('Forge.services.HostedWorldPOC.selected()')
 checks['format_v2']=snap['version']==2 and snap['art']['format']=='png-atlas-16x16-v1'
 checks['one_png_atlas']=snap['art']['png'].startswith('data:image/png;base64,') and len(snap['art']['png'])<100000
 checks['same_project_terrain']=snap['terrain']==page.evaluate('Array.from(S.worlds[Forge161.worlds.state.selected].map)')
 checks['source_no_rom_in_snapshot']=bytes(rom) not in json.dumps(snap).encode()
 (root/'tests/_local_z2_snapshot.json').write_text(json.dumps(snap))
 # 16x16 atlased art must pixel match the Forge native World renderer for 48 sampling cells.
 result=page.evaluate('''async()=>{const w=Forge.services.HostedWorldPOC.selected();const a=new Image();a.src=w.art.png;await a.decode();const atlas=document.createElement('canvas');atlas.width=256;atlas.height=16;atlas.getContext('2d').drawImage(a,0,0);const ctx=atlas.getContext('2d');const map=document.querySelector('#nativeWorldCanvas');const cm=map.getContext('2d');let failed=[];let checks=0;for(let k=0;k<48;k++){const i=Math.floor((k*97)%w.terrain.length),tile=w.terrain[i],x=i%64,y=Math.floor(i/64);for(const [px,py] of [[0,0],[5,5],[8,12],[15,15]]){checks++;const from=ctx.getImageData(tile*16+px,py,1,1).data,to=cm.getImageData(x*16+px,y*16+py,1,1).data;if([...from].join(',')!==[...to].join(','))failed.push({i,tile,px,py,from:[...from],to:[...to]});}}return {checks,failed}}''')
 checks['source_visual_pixels_identical']=result['checks']==192 and len(result['failed'])==0
 # native ROM generated after world import still matches original, even though new snapshot available.
 outcome=page.evaluate('Array.from(Forge.services.RuntimeCompiler.compile().rom)');checks['native_build_unchanged']=hashlib.sha256(bytes(outcome)).hexdigest()==hashlib.sha256(rom).hexdigest()
 page.locator('#nf-host-open').click();checks['author_world_live_available']=page.locator('#nf-host-patch').count()==1
 page.screenshot(path=str(root/'NES_Forge_3x_Visual_Parity_Author.png'))
 print(json.dumps({'checks':checks,'sample_comparison':result,'browser_errors':errs,'snapshot_length':len(json.dumps(snap))},indent=2))
 b.close()
assert all(checks.values()) and not errs,(checks,errs)
