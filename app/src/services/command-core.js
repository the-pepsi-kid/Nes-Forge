/*
 * NES FORGE MODULE: src/services/command-core.js
 * Entry: Forge.commands
 * Purpose: One UI-agnostic command layer over the existing services. Desktop panels, keyboard,
 *   touch, controllers, command-line/agent tools and spatial (XR) adapters all call the same named
 *   operations with plain-data arguments and receive plain-data results.
 * Contract: No second project model. Every change goes through ProjectStore (one Undo step per
 *   command). Build acceptance stays with BuildGraph / RuntimeCompiler / the native writers; this
 *   layer only reports their verdicts, with the asset and writer route they already attach.
 *   Editability levels are derived from ProjectCapabilities and NativeResourceProject.ownership(),
 *   the same views the native build masks, never guessed from names.
 * Bundle order: last service before the shell suffix (app/source-manifest.json).
 */
(()=>{
'use strict';
const F=window.Forge,services=F.services,VERSION=1;
const registry=new Map(),listeners=new Set(),adapters=new Map();
const state={pack:null,packName:null,buildable:null};
const fail=message=>{throw Error(message);};
const cp=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const hasUI=()=>typeof document!=='undefined'&&!!document.getElementById?.('projectGatewayFile');

// ---------- argument schemas (small, explicit, JSON-describable) ----------
const T={
  string:(v,n)=>{if(typeof v!=='string')fail(n+' must be text');return v;},
  int:(v,n,min=-Infinity,max=Infinity)=>{if(!Number.isInteger(v)||v<min||v>max)fail(n+' must be a whole number from '+min+' to '+max);return v;},
  bool:(v,n)=>{if(typeof v!=='boolean')fail(n+' must be true or false');return v;},
  bytes:(v,n)=>{if(v instanceof Uint8Array)return v;if(typeof v==='string')return base64ToBytes(v);if(Array.isArray(v)&&v.every(x=>Number.isInteger(x)&&x>=0&&x<256))return Uint8Array.from(v);fail(n+' must be bytes (Uint8Array, base64 text or byte array)');},
  object:(v,n)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail(n+' must be an object');return v;},
};
function base64ToBytes(text){const bin=atob(text.replace(/\s+/g,''));const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}
function bytesToBase64(bytes){let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s);}
function args(spec,input){
  input=input==null?{}:input;if(typeof input!=='object'||Array.isArray(input))fail('Command arguments must be an object');
  const out={};
  for(const key of Object.keys(input))if(!spec[key])fail('Unknown argument "'+key+'"');
  for(const [key,s] of Object.entries(spec)){
    if(input[key]===undefined){if(s.required)fail('Missing argument "'+key+'"');if(s.default!==undefined)out[key]=cp(s.default);continue;}
    out[key]=T[s.type](input[key],key,s.min,s.max);
    if(s.enum&&!s.enum.includes(out[key]))fail(key+' must be one of: '+s.enum.join(', '));
  }
  return out;
}

// ---------- registration ----------
/* register({name, title, group, summary, args:{name:{type,required,default,enum,min,max,summary}},
 *           mutates, needs:'none'|'ui'|'emulator', run(args, context)}) */
function register(def){
  if(!def||typeof def.name!=='string'||!/^[a-z]+(\.[a-zA-Z]+)+$/.test(def.name)||registry.has(def.name)||typeof def.run!=='function')fail('Invalid or duplicate command '+def?.name);
  registry.set(def.name,Object.freeze({name:def.name,title:def.title||def.name,group:def.group||def.name.split('.')[0],summary:def.summary||'',
    args:Object.freeze(cp(def.args||{})),mutates:!!def.mutates,needs:def.needs||'none',run:def.run}));
}
function describe(name){const d=registry.get(name);if(!d)fail('Unknown command "'+name+'"');const {run,...rest}=d;return cp(rest);}
function list(){return [...registry.keys()].sort().map(describe);}
function emit(event){for(const fn of [...listeners])try{fn(event);}catch(_){/* a listener error never breaks a command */}}
function subscribe(fn){if(typeof fn!=='function')fail('Listener must be a function');listeners.add(fn);return()=>listeners.delete(fn);}

/* run(name,args,{adapter}) always resolves; it never throws. Results are plain data.
 * {ok:true,result} or {ok:false,error:{message,diagnostics:[{assetId,assetName,resourceKey,field,path,writerRoute,repair}]}} */
async function run(name,input,{adapter='api'}={}){
  const started=Date.now();let outcome;
  try{
    const d=registry.get(name);if(!d)fail('Unknown command "'+name+'". Use commands.list.');
    if(d.needs==='ui'&&!hasUI())fail('"'+name+'" needs the editor interface; it is unavailable in this environment.');
    const result=await d.run(args(d.args,input),{adapter});
    outcome={ok:true,result:result===undefined?null:result};
  }catch(error){
    const diagnostics=services.BuildDiagnostics?.from?services.BuildDiagnostics.from(error).map(cp):[];
    outcome={ok:false,error:{message:String(error?.message||error),diagnostics}};
  }
  emit({type:'command',name,adapter,ok:outcome.ok,ms:Date.now()-started,...(outcome.ok?{}:{message:outcome.error.message})});
  return outcome;
}

// ---------- interface/input adapters (desktop, touch, controller, cli, xr ...) ----------
function registerAdapter({id,kind,title}){
  if(typeof id!=='string'||!/^[a-z0-9-]+$/.test(id)||!['desktop','touch','controller','keyboard','cli','agent','xr','other'].includes(kind))fail('Invalid adapter');
  adapters.set(id,Object.freeze({id,kind,title:String(title||id)}));emit({type:'adapter',id,kind});return id;
}

// ---------- shared helpers ----------
const store=()=>services.ProjectStore;
function project(){return JSON.parse(store().serialize());}
function commitProject(next,intent){
  const prepared=store().prepareLoad(typeof next==='string'?next:JSON.stringify(next));
  store().commit(prepared,{sync:true,intent:'command:'+intent});
  emit({type:'project',intent});
}
async function sha256(bytes){const d=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function nodesAndEdges(){
  const g=services.ResourceRelationshipPreview?.liveGraph?.();if(!g)fail('Resource graph unavailable');
  const nodes=g.nodes instanceof Map?[...g.nodes.values()]:Array.isArray(g.nodes)?g.nodes:[];
  const edges=Array.isArray(g.edges)?g.edges:g.edges instanceof Map?[...g.edges.values()]:[];
  return {nodes,edges,issues:Array.isArray(g.issues)?g.issues:[]};
}

/* Editability levels (same words in every interface):
 *   build      authored asset; it is compiled into your Forge game
 *   native     a registered native writer encodes these fields into the original ROM
 *   copy       saved with the project; a native build refuses changes to it
 *   reference  evidence/source record; read-only
 *   unknown    this project type does not publish per-asset ownership yet */
function editability(node,ctx){
  const t=node.type,open=node.open||{},sceneId=open.sceneId||(t==='scene'?node.id:null);
  if(['source','native','audio-evidence','evidence'].includes(t)||node.evidenceKind||node.apuAuditDigest)return {level:'reference',note:'Read-only source evidence.'};
  if(ctx.cap.kind!=='native')return {level:'build',note:'Authored asset; compiled into your Forge game.'};
  if(!ctx.own)return {level:'unknown',note:'This native project type does not publish per-asset ownership yet. Writers: '+ctx.cap.writers.map(w=>w.title).join('; ')};
  const fieldFor={scene:null,chr:['chr','sprChr'],palette:['pal','sprPal','bgColor'],tile:['chr','sprChr'],collision:[],sprite:[]};
  if(t==='metasprite'){const w=ctx.own.metasprites[node.id];return w?{level:'native',writers:w,note:'Native writer: '+w.map(x=>x.writer+' ('+x.fields.join(', ')+')').join('; ')}:{level:'copy',note:'Saved with the project; the native build refuses changes to this pose.'};}
  if(sceneId&&t in fieldFor){
    const owners=ctx.own.scenes[sceneId]||[],wanted=fieldFor[t];
    const writers=wanted===null?owners:owners.filter(w=>w.fields.some(f=>wanted.includes(f)));
    if(writers.length)return {level:'native',writers,note:'Native writer: '+writers.map(x=>x.writer+' ('+x.fields.join(', ')+')').join('; ')};
    return {level:'copy',note:'Saved with the project; the native build refuses changes here.'+(ctx.cap.writers.length?' Writers available: '+ctx.cap.writers.map(w=>w.title+' ['+w.route+']').join('; '):'')};
  }
  if(t==='audio')return {level:'copy',note:'Editable copy; no native audio writer is registered.'};
  return {level:'copy',note:'Saved with the project; no registered native writer owns it.'};
}
function context(){
  const p=project(),cap=services.ProjectCapabilities.describe();
  let own=null;try{own=services.NativeResourceProject?.ownership?.(p)||null;}catch(_){own=null;}
  return {p,cap:{...cap,writers:cap.writers||[]},own};
}
function summarize(node,ctx){
  return {key:node.key,type:node.type,id:node.id,name:node.name,summary:node.summary||'',scope:node.scope||'',
    open:node.open?cp(node.open):null,derived:!!node.derived,editability:editability(node,ctx)};
}

// ---------- last buildable state, to name the assets behind a refused build ----------
/* The native build compares a protected hash and cannot always say which asset changed
 * (e.g. a pose). The command layer remembers the project at load time and after every
 * passing build check, and on a refusal lists the assets that differ from that state. */
function rememberBuildable(){try{state.buildable=project();}catch(_){state.buildable=null;}}
function changedAssets(){
  if(!state.buildable)return null;
  const now=project(),ctx=context(),out=[];
  const groups=[['scenes','scene'],['metasprites','metasprite'],['animations','animation'],['worlds','world']];
  for(const [field,type] of groups){
    const before=new Map((state.buildable[field]||[]).map(x=>[x.id,JSON.stringify(x)]));
    for(const item of now[field]||[]){
      const old=before.get(item.id);if(old===JSON.stringify(item))continue;
      const node={key:type+':'+item.id,type,id:item.id,name:item.name||item.id,open:type==='scene'?{kind:'scene',sceneId:item.id}:null};
      out.push({resourceKey:node.key,type,id:item.id,name:node.name,change:old===undefined?'added':'edited',editability:editability(node,ctx)});
    }
    const ids=new Set((now[field]||[]).map(x=>x.id));
    for(const id of before.keys())if(!ids.has(id))out.push({resourceKey:type+':'+id,type,id,change:'removed'});
  }
  return out;
}
async function guardedBuild(fn){
  try{const result=await fn();rememberBuildable();return result;}
  catch(error){
    const changed=changedAssets();
    if(changed&&changed.length){
      const diags=services.BuildDiagnostics.from(error);
      error.buildDiagnostics=diags.map(d=>({...d,changedSinceLastBuildable:changed,
        ...(d.assetId?{}:{assetId:changed[0].id,assetName:changed[0].name||changed[0].id,resourceKey:changed[0].resourceKey,
          repair:(d.repair?d.repair+' ':'')+'Changed since the last buildable state: '+changed.map(c=>(c.name||c.id)+' ('+c.type+', '+c.change+(c.editability?', '+c.editability.level:'')+')').join('; ')+'.'})}));
    }
    throw error;
  }
}

// ---------- commands ----------
register({name:'commands.list',group:'system',title:'List commands',summary:'Every command with its argument schema.',run:()=>list()});
register({name:'commands.describe',group:'system',title:'Describe a command',args:{name:{type:'string',required:true}},run:a=>describe(a.name)});
register({name:'system.info',group:'system',title:'Environment',summary:'Release, available interface features and registered adapters.',
  run:()=>({release:cp(F.release),commandVersion:VERSION,commands:registry.size,ui:hasUI(),
    webxr:typeof navigator!=='undefined'&&!!navigator.xr,gamepads:typeof navigator!=='undefined'&&typeof navigator.getGamepads==='function',
    adapters:[...adapters.values()].map(cp)})});

register({name:'project.info',group:'project',title:'Project summary',
  run:()=>{const {p,cap}=context();return {name:p.projectName,schema:p.version,foundation:p.foundation,kind:cap.kind,backend:cap.backend,label:cap.label,
    counts:{scenes:(p.scenes||[]).length,worlds:(p.worlds||[]).length,metasprites:(p.metasprites||[]).length,animations:(p.animations||[]).length},
    writers:cap.writers.map(w=>({id:w.id,title:w.title,route:w.route,scope:w.scope})),scope:cap.scope};}});
register({name:'project.new',group:'project',title:'New blank project',mutates:true,
  run:()=>{store().initializeBlank();rememberBuildable();emit({type:'project',intent:'new'});return {name:store().capture().projectName};}});
register({name:'project.load',group:'project',title:'Load a Forge project (JSON text)',mutates:true,args:{json:{type:'string',required:true}},
  run:a=>{store().load(a.json,{intent:'command:load'});rememberBuildable();emit({type:'project',intent:'load'});return {name:store().capture().projectName};}});
register({name:'project.save',group:'project',title:'Serialize the project',summary:'Returns the project JSON exactly as Save Project writes it.',
  run:()=>({json:store().serialize()})});
register({name:'project.replace',group:'project',title:'Commit an edited project',mutates:true,
  summary:'Commits a whole edited project as one Undo step through ProjectStore. Use for scripted edits.',args:{json:{type:'string',required:true},intent:{type:'string',default:'edit'}},
  run:a=>{commitProject(a.json,a.intent);return {name:store().capture().projectName};}});

register({name:'rom.inspect',group:'rom',title:'Inspect a ROM (intake report)',
  summary:'The editor intake report for an exact ROM: container, recognised profile and what each resource type supports (inspect / edit / build).',
  args:{bytes:{type:'bytes',required:true},name:{type:'string',default:'rom.nes'}},
  run:async a=>{const r=await services.ProjectGateway.inspect(a.bytes,{name:a.name});
    return {kind:r.kind,source:cp(r.source),container:cp(r.container)||null,profile:r.profile||null,rows:cp(r.rows||[]),
      actions:(r.actions||[]).map(x=>cp(typeof x==='object'?{id:x.id,label:x.label||x.title,enabled:x.enabled!==false}:x)),limitations:cp(r.limitations||[])};}});
register({name:'rom.import',group:'rom',title:'Import a ROM as a new project',mutates:true,
  summary:'Same as "Prepare investigated game" + "Import as new project": preserved source and every recovered catalog, one ProjectStore commit.',
  args:{bytes:{type:'bytes',required:true},name:{type:'string',default:'rom.nes'}},
  run:async a=>{const project=await services.InvestigationProject.create(a.bytes,a.name);commitProject(project,'rom-import');rememberBuildable();
    let described=null;try{described=cp(services.InvestigationProject.describe(project.investigation));}catch(_){described=null;}
    return {name:store().capture().projectName,investigation:described};}});

register({name:'pack.open',group:'pack',title:'Open an extraction ZIP',summary:'Validates with the editor intake and keeps it open for pack.* commands.',
  args:{bytes:{type:'bytes',required:true},name:{type:'string',default:'pack.zip'}},
  run:async a=>{const pack=await services.ExtractionPack.open(a.bytes);state.pack=pack;state.packName=a.name;
    return {name:a.name,game:pack.report.game,format:pack.report.format,romSha256:pack.report.rom.sha256,
      groups:Object.fromEntries(Object.entries(pack.files).filter(([,v])=>v.length).map(([k,v])=>[k,v.length]))};}});
register({name:'pack.list',group:'pack',title:'List records in the open pack',args:{kind:{type:'string',required:true}},
  run:a=>{if(!state.pack)fail('Open a pack first (pack.open).');return cp(state.pack.files[a.kind]||[]);}});
register({name:'pack.openProject',group:'pack',title:'Open a project from the pack',mutates:true,args:{path:{type:'string',required:true}},
  run:async a=>{if(!state.pack)fail('Open a pack first (pack.open).');const rec=await state.pack.entry(a.path);
    if(!['project','nativeProject','audioProject','animationProject'].includes(rec.kind))fail('Not a project record: '+rec.kind);
    store().load(rec.data,{intent:'command:pack-project'});rememberBuildable();emit({type:'project',intent:'pack-project'});return {name:store().capture().projectName,kind:rec.kind};}});

register({name:'resources.list',group:'resources',title:'List resources',
  summary:'Every resource in the live project with its editability level (build / native / copy / reference / unknown).',
  args:{type:{type:'string'},search:{type:'string'},level:{type:'string',enum:['build','native','copy','reference','unknown']},offset:{type:'int',default:0,min:0},limit:{type:'int',default:200,min:1,max:5000}},
  run:a=>{const ctx=context(),{nodes}=nodesAndEdges();
    let rows=nodes.map(n=>summarize(n,ctx));
    if(a.type)rows=rows.filter(r=>r.type===a.type);
    if(a.search){const q=a.search.toLowerCase();rows=rows.filter(r=>(r.name+' '+r.key+' '+r.summary).toLowerCase().includes(q));}
    if(a.level)rows=rows.filter(r=>r.editability.level===a.level);
    const counts={};for(const r of rows)counts[r.editability.level]=(counts[r.editability.level]||0)+1;
    return {total:rows.length,counts,offset:a.offset,items:rows.slice(a.offset,a.offset+a.limit)};}});
register({name:'resources.inspect',group:'resources',title:'Inspect a resource',args:{key:{type:'string',required:true}},
  run:a=>{const ctx=context(),{nodes,edges}=nodesAndEdges(),n=nodes.find(x=>x.key===a.key);if(!n)fail('No resource "'+a.key+'"');
    const rel=e=>({from:e.from??e.source??e[0],to:e.to??e.target??e[1],label:e.label??e.reason??e[2]??''});
    const all=edges.map(rel);
    return {...summarize(n,ctx),details:n.details||'',source:cp(n.source)||null,
      uses:all.filter(e=>e.from===a.key),usedBy:all.filter(e=>e.to===a.key)};}});
register({name:'resources.open',group:'resources',title:'Open a resource in its editor',needs:'ui',args:{key:{type:'string',required:true}},
  run:a=>{const {nodes}=nodesAndEdges(),n=nodes.find(x=>x.key===a.key);if(!n)fail('No resource "'+a.key+'"');const o=n.open||{};
    const sc=services.SceneContext;
    if(o.sceneId&&sc?.selectScene)sc.selectScene(o.sceneId);
    if(n.type==='metasprite'&&window.Forge163?.metasprites){window.Forge163.metasprites.select(n.id);switchTab('metasprites');return {opened:'metasprites'};}
    const tab={scene:'scene',chr:'chr',tile:'chr',palette:'scene',collision:'collision',audio:'audio',meta:'meta',metatile:'meta',world:'world',animation:'anim'}[o.kind||n.type];
    if(tab){switchTab(tab);return {opened:tab};}
    services.ResourceRelationshipPreview.openAt(a.key);return {opened:'resources'};}});

register({name:'writer.list',group:'writers',title:'Native writers for this project',
  run:()=>{const {cap,own}=context();return {writers:cap.writers.map(cp),ownership:own?cp(own):null};}});
register({name:'writer.prepare',group:'writers',title:'Open a native writer view',mutates:true,
  summary:'Adds the explicit editing view a native writer encodes (e.g. Punch-Out physical CHR bank or palette, Glass Joe pose).',
  args:{writer:{type:'string',required:true,enum:['punch-out-art','punch-out-pose']},kind:{type:'string',enum:['chr','palette']},index:{type:'int',min:0,max:255}},
  run:a=>{const p=project();let res;
    if(a.writer==='punch-out-art'){if(!a.kind||a.index===undefined)fail('punch-out-art needs kind (chr|palette) and index');res=services.PunchOutArtProject.prepare(p,a.kind,a.index);}
    else{if(a.index===undefined)fail('punch-out-pose needs index (pose selector)');res=services.PunchOutPoseProject.prepare(p,a.index);}
    if(res.added)commitProject(res.project,'writer:'+a.writer);
    return {sceneId:res.sceneId||null,frameId:res.frameId||null,added:!!res.added,resourceKey:res.sceneId?'scene:'+res.sceneId:null};}});

/* Writer suggestions: for an asset that is only a copy, the explicit native writer view (if any)
 * that encodes the same original data, and which other assets share it. Providers are small and
 * title-specific; the generic Library shows whatever they return. */
const suggestionProviders=[];
function registerSuggestions(fn){if(typeof fn!=='function')fail('Provider must be a function');suggestionProviders.push(fn);}
registerSuggestions(({p,node,cap})=>{
  if(cap.kind!=='native'||!services.PunchOutArtProject)return [];
  const sceneId=node.open?.sceneId||(node.type==='scene'?node.id:null),scene=sceneId&&p.scenes.find(s=>s.id===sceneId);
  const content=scene?.captureMeta?.punchOutContent,out=[];
  if(content&&Number.isInteger(content.chrBank4KiB)&&['scene','chr','tile','sprite'].includes(node.type)){
    const bank=content.chrBank4KiB,shared=p.scenes.filter(s=>s.id!==scene.id&&s.captureMeta?.punchOutContent?.chrBank4KiB===bank).map(s=>s.name);
    out.push({writer:'punch-out-art',args:{writer:'punch-out-art',kind:'chr',index:bank},level:'native',
      title:'Edit these graphics in physical CHR bank '+bank+' (writes to the ROM)',
      note:'The fighter scene is a reference snapshot. Pixel edits in the bank view are encoded into the ROM; tile layout (pose geometry) has no writer yet.',
      sharedWith:shared});
  }
  const pose=node.type==='metasprite'&&/^po-pose-f(\d+)-s(\d+)$/.exec(node.id);
  if(pose&&services.PunchOutPoseProject){
    const fight=+pose[1],selector=+pose[2];
    if(fight===0)out.push({writer:'punch-out-pose',args:{writer:'punch-out-pose',index:selector},level:'native',title:'Move this Glass Joe pose (writes X/Y to the ROM)',note:'Whole-pose position only; piece geometry has no writer yet.',sharedWith:[]});
    else out.push({writer:null,level:'copy',title:'No pose writer for this fighter yet',note:'Pose layout writers exist only for Glass Joe positions. Graphics can be edited through the CHR bank view.',sharedWith:[]});
  }
  return out;
});
register({name:'writer.suggest',group:'writers',title:'Native writer options for a resource',args:{key:{type:'string',required:true}},
  summary:'For a copy-level asset: which explicit native writer view encodes the same original data, and what else shares it.',
  run:a=>{const ctx=context(),{nodes}=nodesAndEdges(),node=nodes.find(x=>x.key===a.key);if(!node)fail('No resource "'+a.key+'"');
    const out=[];for(const provider of suggestionProviders){try{out.push(...(provider({p:ctx.p,node,cap:ctx.cap})||[]));}catch(_){/* a provider never breaks the list */}}
    return {key:a.key,editability:editability(node,ctx),suggestions:cp(out)};}});

register({name:'build.check',group:'build',title:'Check the build',summary:'Compiles without saving or downloading. A refusal names the asset, field and writer route.',
  run:()=>guardedBuild(async()=>{const artifact=services.RuntimeCompiler.compile();return {ok:true,backend:artifact.backend,bytes:artifact.rom.length,sha256:await sha256(artifact.rom),
    diagnostics:(artifact.diagnostics||[]).map(cp)};})});
register({name:'build.rom',group:'build',title:'Build the ROM',summary:'Compiles and returns the ROM (base64) with its SHA-256.',
  run:()=>guardedBuild(async()=>{const artifact=services.RuntimeCompiler.compile(),rom=services.RuntimeCompiler.commit(artifact);
    return {backend:artifact.backend,bytes:rom.length,sha256:await sha256(rom),base64:bytesToBase64(rom),diagnostics:(artifact.diagnostics||[]).map(cp)};})});

register({name:'build.changes',group:'build',title:'Changes since the last buildable state',
  summary:'Assets that differ from the project as loaded or as last checked successfully, with their editability level.',
  run:()=>({changes:changedAssets()})});

register({name:'emulator.load',group:'emulator',title:'Load ROM bytes into the emulator',needs:'emulator',args:{bytes:{type:'bytes',required:true},name:{type:'string',default:'rom.nes'}},
  run:a=>{emuLoadRomData(a.bytes,a.name,0);return {loaded:!!emu.loaded,mapper:emu.mapper,prgBytes:emu.prgSize};}});
register({name:'emulator.loadBuilt',group:'emulator',title:'Build and load the project into the emulator',needs:'emulator',
  run:()=>{const artifact=services.RuntimeCompiler.compile(),rom=services.RuntimeCompiler.commit(artifact);emuLoadRomData(rom,'built.nes',0);return {loaded:!!emu.loaded,bytes:rom.length};}});
register({name:'emulator.frames',group:'emulator',title:'Advance frames',needs:'emulator',args:{count:{type:'int',default:1,min:1,max:36000}},
  run:a=>{if(!emu.loaded)fail('No ROM loaded in the emulator.');const tab=S.tab;S.tab='emu';try{for(let i=0;i<a.count;i++)emuRunFrame();}finally{S.tab=tab;}return {frame:emu.frameCount??null};}});
register({name:'emulator.screen',group:'emulator',title:'Current screen (RGBA 256x240)',needs:'emulator',
  run:()=>{if(!emu.frameBuffer)fail('No frame yet.');return {width:256,height:240,format:'rgba',base64:bytesToBase64(new Uint8Array(emu.frameBuffer.buffer||emu.frameBuffer))};}});
register({name:'emulator.reset',group:'emulator',title:'Reset the emulator',needs:'emulator',run:()=>{services.EmulatorBridge.reset();return {reset:true};}});

/* Input-agnostic controller: every adapter (keyboard, touch, gamepad, XR controller or hand,
 * agent) presses the same eight NES buttons through this command. */
const BUTTON={a:1,b:2,select:4,start:8,up:16,down:32,left:64,right:128};
const KEY={a:'KeyZ',b:'KeyX',select:'ShiftLeft',start:'Enter',up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
register({name:'input.set',group:'input',title:'Press or release NES buttons',needs:'emulator',
  args:{buttons:{type:'object',required:true}},
  summary:'buttons: {a,b,select,start,up,down,left,right: true|false}. The same path for every interface.',
  run:a=>{for(const [name,down] of Object.entries(a.buttons)){if(!(name in BUTTON))fail('Unknown button '+name);if(typeof down!=='boolean')fail(name+' must be true or false');
      if(down)emuKeys[KEY[name]]=true;else delete emuKeys[KEY[name]];}
    return {held:Object.keys(BUTTON).filter(n=>emuKeys[KEY[n]])};}});

F.commands=Object.freeze({version:VERSION,register,list,describe,run,subscribe,registerAdapter,registerSuggestions,
  adapters:()=>[...adapters.values()].map(cp),buttons:Object.freeze({...BUTTON})});
services.Commands=F.commands;
})();
