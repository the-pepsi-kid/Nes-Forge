/* Seeded canonical asset mashups. Detached source snapshots only; never executes
 * donor assembly, loads a ROM, commits a project, or advances an emulator. */
(()=>{
'use strict';
const services=(window.Forge=window.Forge||{}).services=window.Forge.services||{},VERSION=1;
const LIMITS=Object.freeze({sources:9,sourceBytes:8*1024*1024,poolBytes:32*1024*1024,seedLength:128});
const DOMAINS=Object.freeze(['background','sprites','palettes','music']);
const sourcesMade=new WeakSet(),cp=x=>JSON.parse(JSON.stringify(x)),fail=m=>{throw Error('Mashup: '+m);};
function freeze(x){if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;}
function stable(x,depth=0){if(depth>64)fail('Data exceeds the 64-level nesting limit');if(x===null||typeof x==='string'||typeof x==='boolean')return JSON.stringify(x);if(typeof x==='number'){if(!Number.isFinite(x))fail('Nonfinite numbers are not supported');return JSON.stringify(x);}if(Array.isArray(x))return '['+x.map(v=>stable(v,depth+1)).join(',')+']';if(x&&typeof x==='object')return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k],depth+1)).join(',')+'}';fail('Only JSON values are supported');}
function hash(x){return window.FamiTone2Native.sha256(new TextEncoder().encode(typeof x==='string'?x:stable(x)));}
const int=(v,a,b,label)=>{if(!Number.isInteger(v)||v<a||v>b)fail(label+' must be an integer from '+a+' through '+b);};
const arr=(v,n,label)=>{if(!Array.isArray(v)||v.length!==n)fail(label+' must contain '+n+' entries');};
function bank(v,label){arr(v,256,label);v.forEach((t,i)=>{arr(t,8,label+' tile '+i);t.forEach(r=>{arr(r,8,label+' row');r.forEach(p=>int(p,0,3,label+' pixel'));});});}
function palette(v,label,bg){arr(v,4,label);v.forEach(r=>{arr(r,4,label);r.forEach(p=>int(p,0,63,label+' color'));if(r[0]!==bg)fail(label+' universal background colors disagree');});}
function audioShape(p){
 for(const k of ['instruments','patterns','orderList','sfx'])if(!Array.isArray(p[k]))fail('Missing canonical '+k);
 if(p.patterns.length<1||p.patterns.length>255||p.instruments.length>255||p.orderList.length<1||p.orderList.length>255)fail('Audio collection count exceeds the 255-entry mashup limit');
 int(p.audRows,16,128,'Audio rows');int(p.tempo,30,300,'Tempo');int(p.speed,1,15,'Speed');
 p.instruments.forEach((i,n)=>{if(!i||typeof i.name!=='string'||!i.name||i.name.length>80)fail('Invalid instrument name');for(const [key,min,max]of[['volEnv',0,15],['arpEnv',-24,24]]){if(!Array.isArray(i[key])||!i[key].length||i[key].length>255)fail('Invalid '+key+' length');i[key].forEach(v=>int(v,min,max,key));}arr(i.dutyEnv,1,'Duty envelope');int(i.dutyEnv[0],0,3,'Duty');arr(i.pitchEnv,1,'Pitch envelope');if(i.pitchEnv[0]!==0)fail('Canonical pitch envelopes must contain zero');int(i.loopVol,-1,i.volEnv.length-1,'Volume loop');int(i.loopArp,-1,i.arpEnv.length-1,'Arpeggio loop');});
 p.patterns.forEach((pattern,n)=>{if(!Array.isArray(pattern.rows)||pattern.rows.length<16||pattern.rows.length>128)fail('Invalid pattern rows');pattern.rows.forEach(row=>{arr(row,5,'Pattern channels');row.forEach(c=>{if(!c||typeof c!=='object')fail('Invalid pattern cell');int(c.note,-2,95,'Note');int(c.inst,-1,p.instruments.length-1,'Instrument reference');int(c.vol,-1,15,'Volume');int(c.fx,0,255,'Effect');int(c.fxp,0,255,'Effect value');if(c.note>=0&&!p.instruments.length)fail('A sounding note needs an instrument');});});});
 p.orderList.forEach(row=>{arr(row,5,'Music order');row.forEach(v=>int(v,0,p.patterns.length-1,'Pattern reference'));});
 p.sfx.forEach(s=>{int(s.pattern,0,p.patterns.length-1,'SFX pattern');int(s.channel,0,3,'SFX channel');int(s.startRow,0,p.audRows-1,'SFX start');int(s.endRow,s.startRow,p.audRows-1,'SFX end');});
}
function validate(project){
 if(!project||project.format!=='NESForge'||![12,13].includes(project.version))fail('Use a canonical schema 12 Forge project; open and save older projects first');
 if(project.nativeGame!==undefined)fail('Native engine projects require their verified native editors; mashup encoders are not available.');
 if(!Array.isArray(project.scenes)||!project.scenes.length||project.scenes.length>64)fail('Expected 1–64 scenes');int(project.activeScene,0,project.scenes.length-1,'Active scene');
 for(const [index,s]of project.scenes.entries()){
  if(typeof s.id!=='string'||!s.id||s.id.length>200)fail('Every scene needs a bounded stable ID');bank(s.chr,'Background CHR');bank(s.sprChr,'Sprite CHR');int(s.bgColor,0,63,'Background color');palette(s.pal,'Background palettes',s.bgColor);palette(s.sprPal,'Sprite palettes',s.bgColor);
  for(const [key,n,max]of[['nt',960,255],['attr',64,255],['tileProps',256,7]]){arr(s[key],n,key);s[key].forEach(v=>int(v,0,max,key));}
  if(!Array.isArray(s.oam)||s.oam.length>64)fail('Invalid OAM');s.oam.forEach(o=>{int(o.x,0,255,'Sprite X');int(o.y,0,239,'Sprite Y');int(o.tile,0,255,'Sprite tile');int(o.attr,0,255,'Sprite attributes');if(o.attr&~0xe3)fail('Unsupported sprite attribute bits');if(o.height!==8&&o.height!==16)fail('Sprite height must be 8 or 16');});
  for(const m of s.metatiles||[]){arr(m.tiles,4,'Metatile tiles');m.tiles.forEach(v=>int(v,0,255,'Metatile tile'));if(Array.isArray(m.collision)){arr(m.collision,4,'Collision quadrants');m.collision.forEach(v=>int(v,0,7,'Collision'));}else if(m.collision!==undefined)int(m.collision,0,7,'Collision');}
 }
 audioShape(project);
 const refs=services.AssetRegistry.validate(project);if(refs.length)fail(refs[0].path+': '+refs[0].message);
 // Validate before normalization, then ensure no protected data is silently
 // repaired. Canonical factories may add harmless UI/default metadata only.
 services.GameplayModel.validateProject(project.gameplayCore,project,{references:true,executable:false});
 const p=services.ProjectStore.prepareLoad(project);
 for(const key of ['patterns','instruments','sfx'])if(stable(p[key])!==stable(project[key]))fail(key+' would change during canonical normalization');
 for(let i=0;i<p.scenes.length;i++)for(const key of ['id','chr','sprChr','nt','attr','pal','sprPal','bgColor','oam','tileProps','metatiles','metaMap','entities','links'])if(project.scenes[i][key]!==undefined&&stable(p.scenes[i][key])!==stable(project.scenes[i][key]))fail('Scene '+(i+1)+' '+key+' would change during canonical normalization');
 return {valid:true,build:'not-checked',referenceIssues:0};
}
function musicEligibility(p){
 try{
  services.AudioCompiler.plan({...p,audioRuntime:{...p.audioRuntime,enabled:true,musicEnabled:true}});
  let notes=0;const initialized=[false,false,false,false];
  for(const order of p.orderList)for(let row=0;row<p.audRows;row++)for(let ch=0;ch<4;ch++){const cell=p.patterns[order[ch]].rows[row]?.[ch];if(cell?.note>=0){if(cell.inst>=0)initialized[ch]=true;if(!initialized[ch])fail('Music starts with an implicit instrument; assign its first sounding note an explicit instrument before donating');notes++;}}
  if(!notes)fail('Music contains no sounding notes');return {eligible:true};
 }catch(e){return {eligible:false,reason:e.message};}
}
function createSource(input,{name}={}){
 let text;if(typeof input==='string'){if(new TextEncoder().encode(input).length>LIMITS.sourceBytes)fail('Source exceeds 8 MiB');text=input;}else{text=stable(input);if(new TextEncoder().encode(text).length>LIMITS.sourceBytes)fail('Source exceeds 8 MiB');}
 const project=JSON.parse(text);validate(project);const canonical=stable(project),byteLength=new TextEncoder().encode(canonical).length;if(byteLength>LIMITS.sourceBytes)fail('Source exceeds 8 MiB');
 const sha256=hash(canonical),label=String(name||project.projectName||'Project').slice(0,160),sceneAssets=project.scenes.map(s=>({id:sha256+':scene:'+s.id,sceneId:s.id,name:label+' / '+s.name})),music=musicEligibility(project);
 const source={id:sha256,sha256,name:label,byteLength,project,assets:{background:cp(sceneAssets),sprites:cp(sceneAssets),palettes:cp(sceneAssets),music:music.eligible?[{id:sha256,name:label+' / music'}]:[]},warnings:music.eligible?[]:[music.reason]};sourcesMade.add(source);return freeze(source);
}
function pool(input){if(!Array.isArray(input)||!input.length||input.length>LIMITS.sources)fail('Choose 1–9 sources, including the current project');const ids=new Set();let bytes=0;for(const s of input){if(!sourcesMade.has(s))fail('Sources must come from createSource; do not edit or import source wrapper objects');if(ids.has(s.id))fail('Duplicate source project');ids.add(s.id);bytes+=s.byteLength;}if(bytes>LIMITS.poolBytes)fail('Source pool exceeds 32 MiB');return input;}
function createPool(items){return freeze(pool(items.map(x=>createSource(x.project,{name:x.name}))));}
function rng(seed,domain){const digest=hash('NESForgeMashup/1\0'+seed+'\0'+domain);let state=parseInt(digest.slice(0,8),16)>>>0;return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function optionsShape(o){if(!o||typeof o!=='object'||Array.isArray(o))fail('Options must be an object');for(const k of Object.keys(o))if(!['seed','baseSourceId','targetSceneId','choices','locks','previousRecipe','gameplay'].includes(k))fail('Unknown option '+k);if(typeof o.seed!=='string'||!o.seed.length||o.seed.length>LIMITS.seedLength)fail('Seed must contain 1–128 characters');for(const group of ['choices','locks']){if(o[group]!==undefined&&(!o[group]||typeof o[group]!=='object'||Array.isArray(o[group])))fail('Invalid '+group);for(const k of Object.keys(o[group]||{}))if(!DOMAINS.includes(k)&&!(group==='locks'&&k==='gameplay'))fail('Unknown '+group+' domain '+k);}for(const v of Object.values(o.locks||{}))if(typeof v!=='boolean')fail('Locks must be booleans');}
function eligible(sources,domain,base){return sources.flatMap(source=>source.assets[domain].filter(a=>domain!=='music'||source.project.audRows===base.project.audRows).map(asset=>({source,asset}))).sort((a,b)=>a.asset.id<b.asset.id?-1:a.asset.id>b.asset.id?1:0);}
function choose(sources,domain,base,o){const candidates=eligible(sources,domain,base);let id=o.choices?.[domain];if(o.locks?.[domain]&&o.previousRecipe){if(o.previousRecipe.baseSourceId!==base.id)fail('Locked choices belong to a different base source');id=o.previousRecipe.choices?.[domain];}if(id==='keep')return null;if(id===undefined||id==='random'){if(!candidates.length)return null;return candidates[Math.floor(rng(o.seed,domain)()*candidates.length)];}if(typeof id!=='string')fail('Invalid '+domain+' choice');const chosen=candidates.find(c=>c.asset.id===id);if(!chosen)fail('Unavailable or incompatible '+domain+' source; refresh the pool or unlock this choice');return chosen;}
function preview(input,o){
 const sources=pool(input);optionsShape(o);const base=sources.find(s=>s.id===(o.baseSourceId||sources[0].id));if(!base)fail('Base source is unavailable');const project=cp(base.project),target=project.scenes.find(s=>s.id===(o.targetSceneId||project.scenes[project.activeScene].id));if(!target)fail('Target scene is unavailable');
 if(typeof project.asmSource!=='string'||project.asmSource.trim())fail('The base project must use generated Forge code; save and clear custom assembly before creating a mashup');if(project.mapper!==0)fail('Mashup builds currently require mapper 0');
 const changes=[],warnings=['CHR banks are replaced by tile number. Layout, collisions and gameplay meanings remain from the base; visual semantics and playability need review.'],choices={};
 for(const domain of DOMAINS){const selected=choose(sources,domain,base,o);choices[domain]=selected?.asset.id||'keep';if(!selected)continue;const donor=selected.source.project,scene=donor.scenes.find(s=>s.id===selected.asset.sceneId);
  if(domain==='background')target.chr=cp(scene.chr);else if(domain==='sprites')target.sprChr=cp(scene.sprChr);else if(domain==='palettes'){target.pal=cp(scene.pal);target.sprPal=cp(scene.sprPal);target.bgColor=scene.bgColor;}else if(selected.source.id!==base.id){
   const pi=project.patterns.length,ii=project.instruments.length;if(pi+donor.patterns.length>255||ii+donor.instruments.length>255)fail('Combined music exceeds 255 patterns or instruments');
   const patterns=cp(donor.patterns);for(const p of patterns)for(const row of p.rows)for(const cell of row)if(cell.inst>=0)cell.inst+=ii;
   project.patterns.push(...patterns);project.instruments.push(...cp(donor.instruments));project.orderList=donor.orderList.map(row=>row.map(index=>index+pi));project.tempo=donor.tempo;project.speed=donor.speed;
   warnings.push('Music replaces the order and tempo/speed; existing SFX definitions and source patterns remain. Existing SFX timing follows the new tempo/speed.');
  }
  changes.push({domain,targetSceneId:domain==='music'?null:target.id,sourceId:selected.source.id,assetId:selected.asset.id,description:domain+' from '+selected.asset.name});
 }
 if(target.id===project.scenes[project.activeScene].id){for(const [domain,keys]of [['background',['chr']],['sprites',['sprChr']],['palettes',['pal','sprPal']]])if(choices[domain]!=='keep')for(const k of keys)project[k]=cp(target[k]);}
 let gameplay=null;if(o.gameplay||o.locks?.gameplay){if(!services.MashupGameplay)fail('Gameplay variation service is unavailable');const varied=services.MashupGameplay.vary(project,{...(o.gameplay||{}),seed:o.seed,locks:{gameplay:!!o.locks?.gameplay},previousRecipe:o.previousRecipe?.gameplay});Object.assign(project,varied.project);gameplay=varied.recipe;changes.push(...varied.changes);warnings.push(...varied.warnings,...(varied.unavailable||[]).map(x=>typeof x==='string'?x:(x.domain+': '+x.reason+(x.actorId?' ('+x.actorId+')':''))));}
 // Use the canonical audio owners' field ordering as well as their values.
 // The packed authoring record must survive Apply -> Save -> reopen -> build.
 const preparedAudio=services.ProjectStore.prepareLoad(project);for(const key of ['patterns','instruments'])project[key]=cp(preparedAudio[key]);
 const validation=validate(project);services.AudioCompiler.plan(project);
 if(project.worldRuntime?.enabled){const plan=services.WorldCompiler.plan(project),artifact=services.WorldCompiler.compile(plan);validation.build='compiled-world';validation.romSha256=window.FamiTone2Native.sha256(artifact.rom);validation.romBytes=artifact.rom.length;validation.notice='Detached candidate World ROM compiled and capacity checked. Its hash identifies this preflight artifact; ordinary Save/build may serialize project metadata differently. This is not a browser, listening or hardware acceptance result.';}
 else{const backend=project.gameplay?.mode==='single-room'?'single-room':'packed',plan=services.GameplayCompiler.plan(project,{backend});if(backend==='single-room')services.GameplayCompiler.locateSingleRoom(plan);services.GameplayCompiler.compileSemantics(plan);validation.build='structural-only';validation.notice='Structure, references and applicable Audio/Gameplay plans passed. Complete scene/single-room ROM capacity remains pending the existing Build action.';warnings.push(validation.notice);}
 const effective=hash(project)!==base.sha256;if(!effective)warnings.push('These selections produce no changes. Choose another donor, seed or enabled gameplay variation.');
 if(project.importedRom)warnings.push('The base original ROM remains attached for reference; generated builds use the mashed editable project. Donor original ROMs and assembly are never executed.');
 if(!project.audioRuntime?.enabled||!project.audioRuntime?.musicEnabled)warnings.push('Audio Runtime or autoplay is disabled in the base project. Enable the existing AUDIO runtime settings if this music should play in a built ROM.');
 const recipe={format:'NESForgeMashupRecipe',version:VERSION,algorithm:'sha256-mulberry32-domains-1',sources:sources.map(s=>({sha256:s.sha256,byteLength:s.byteLength})).sort((a,b)=>a.sha256<b.sha256?-1:a.sha256>b.sha256?1:0),baseSourceId:base.id,targetSceneId:target.id,seed:o.seed,choices,locks:Object.fromEntries([...DOMAINS,'gameplay'].map(k=>[k,!!o.locks?.[k]])),gameplay,resultSha256:hash(project)};
 return freeze({status:effective?'ready':'no-change',effective,project,recipe,changes,warnings:[...new Set(warnings)],validation});
}
function replay(input,recipe){
 const sources=pool(input);if(!recipe||typeof recipe!=='object'||Array.isArray(recipe))fail('Unsupported mashup recipe');const allowed=['format','version','algorithm','sources','baseSourceId','targetSceneId','seed','choices','locks','gameplay','resultSha256'];if(Object.keys(recipe).length!==allowed.length||Object.keys(recipe).some(k=>!allowed.includes(k)))fail('Unknown or missing recipe field');if(!/^[0-9a-f]{64}$/.test(recipe.resultSha256||''))fail('Invalid recipe result identity');if(!recipe.choices||Object.keys(recipe.choices).length!==DOMAINS.length||DOMAINS.some(k=>typeof recipe.choices[k]!=='string'))fail('Recipe must contain exactly four domain choices');if(!recipe.locks||Object.keys(recipe.locks).length!==DOMAINS.length+1||[...DOMAINS,'gameplay'].some(k=>typeof recipe.locks[k]!=='boolean'))fail('Recipe must contain exactly five boolean locks');if(recipe.format!=='NESForgeMashupRecipe'||recipe.version!==VERSION||recipe.algorithm!=='sha256-mulberry32-domains-1')fail('Unsupported mashup recipe');const expected=sources.map(s=>({sha256:s.sha256,byteLength:s.byteLength})).sort((a,b)=>a.sha256<b.sha256?-1:a.sha256>b.sha256?1:0);if(stable(expected)!==stable(recipe.sources))fail('Recipe source identities differ; provide the exact original editable source projects');
 const result=preview(sources,{seed:recipe.seed,baseSourceId:recipe.baseSourceId,targetSceneId:recipe.targetSceneId,choices:recipe.choices,locks:recipe.locks,...(recipe.gameplay?{gameplay:recipe.gameplay.options,previousRecipe:{...recipe,gameplay:recipe.gameplay},locks:{...recipe.locks,gameplay:true}}:{})});
 if(result.recipe.resultSha256!==recipe.resultSha256)fail('Recipe replay result differs; no project was changed');return freeze({...result,recipe:cp(recipe)});
}
services.MashupModel=Object.freeze({version:VERSION,limits:LIMITS,domains:DOMAINS,createSource,createPool,validate,preview,replay,stable,hash});
})();
