/* Browse a local extraction on demand. Only ProjectStore may open an editable project. */
(()=>{
'use strict';
const services=window.Forge.services;
const message=text=>{throw new Error('Extraction ZIP: '+text);};
const utf8=new TextDecoder('utf-8',{fatal:true});
const isName=(path,name)=>path.split('/').at(-1).toLowerCase()===name;

async function open(bytes){
  const entries=parseZip(bytes,{onDemand:true});
  const paths=Object.keys(entries).sort();
  for(const path of paths){
    if(path.includes('\\')||path.includes('\0')||/^[A-Za-z]:/.test(path)||path.startsWith('/')||path.split('/').some(s=>!s||s==='.'||s==='..')){
      message('Invalid archive path.');
    }
  }
  async function read(path){
    const entry=entries[path];
    if(!entry)message('Missing entry '+path);
    const data=entry.method===8 ? await inflateData(entry.bytes,entry.size) : entry.bytes;
    if(data.length!==entry.size||zipCRC(data)!==entry.crc)message('Checksum or length failed for '+path);
    return data;
  }
  async function json(path){return JSON.parse(utf8.decode(await read(path)));}
  let reports=paths.filter(p=>isName(p,'native_report.json')||isName(p,'resources_report.json'));
  // Resource and audio exporters share the source-bound archive workflow.
  // An audio report is the root only when no outer extraction report exists.
  const audioOnly=!reports.length&&paths.some(p=>isName(p,'audio_report.json'));
  if(audioOnly)reports=paths.filter(p=>isName(p,'audio_report.json'));
  if(!reports.length){
    const projects=paths.filter(p=>isName(p,'project.json'));
    const workspaces=paths.filter(p=>isName(p,'workspace.nesforge-source.json'));
    if(projects.length+workspaces.length>1)message('Multiple workspace documents. Open one project at a time.');
    if(workspaces.length){
      if(entries[workspaces[0]].size>12*1024*1024)message('Source workspace JSON exceeds 12 MiB.');
      return {kind:'source',project:await json(workspaces[0])};
    }
    if(projects.length===1){
      const project=await json(projects[0]);
      if(project?.format!=='NESForge')message('The project.json file is not a Forge project.');
      return {kind:'project',project};
    }
    if(paths.some(path=>/\.chr$/i.test(path)&&!isName(path,'sprites.chr')))return readZipPack(bytes);
    message('Choose a native extraction, Forge project, source workspace or CHR tile pack.');
  }
  if(reports.length!==1)message('Multiple extraction roots. Open one game pack at a time.');
  const report=await json(reports[0]);
  if(!['NESForgeNativeExtraction','NESForgeNativeResourceExtraction','NESForgeNativeAudioExtraction','NESForgeAudioCapture'].includes(report?.format)||!/^([a-f0-9]{64})$/i.test(report.rom?.sha256||'')){
    message('Missing extraction format or source fingerprint.');
  }
  const captured=report.format==='NESForgeAudioCapture',reportDir=reports[0].slice(0,reports[0].lastIndexOf('/')+1);
  let root=audioOnly?reportDir.slice(0,reportDir.lastIndexOf('/',reportDir.length-2)+1):reportDir;
  if(captured){
    // Captured projects and screen snapshots can be siblings of the audio
    // folder. One explicit report still owns the archive source identity.
    const common=paths[0].split('/').slice(0,-1);
    for(const path of paths)while(common.length&&!path.startsWith(common.join('/')+'/'))common.pop();
    root=common.length?common.join('/')+'/':'';
  }
  report.game=String(report.game||report.title||report.driver?.title||(captured?'Observed runtime capture':'Native extraction'));
  const files={map:[],room:[],resource:[],capture:[],collision:[],pose:[],catalog:[],project:[],animationProject:[],nativeProject:[],audioProject:[],audioReport:[]};
  let nativeProjectPath=null;
  if(report.format==='NESForgeNativeResourceExtraction'){
    if(typeof report.project!=='string'||!report.project||report.project.includes('\\')||report.project.startsWith('/')||report.project.split('/').some(p=>!p||p==='.'||p==='..'))message('Invalid native project path.');
    nativeProjectPath=root+report.project;
    if(!entries[nativeProjectPath])message('Missing declared native project.');
  }
  let capturedAudioPath=null;
  if(captured){
    if(typeof report.project!=='string'||!report.project||report.project.includes('\\')||report.project.startsWith('/')||report.project.split('/').some(p=>!p||p==='.'||p==='..'))message('Invalid captured audio project path.');
    capturedAudioPath=reportDir+report.project;
    if(!entries[capturedAudioPath])message('Missing captured audio project.');
  }
  for(const path of paths){
    if(!path.startsWith(root))continue;
    const local=path.slice(root.length);
    if(/^maps\/.+\.json$/i.test(local))files.map.push(path);
    else if(/^rooms\/.+\.json$/i.test(local))files.room.push(path);
    else if(/^resources\/.+\.json$/i.test(local))files.resource.push(path);
    else if(/^sprites\/.+\.nesforge\.json$/i.test(local))files.animationProject.push(path);
    else if(/^sprites\/.+\.json$/i.test(local))files.pose.push(path);
    else if(/^(actors|poses|animations|locations|ram)\.json$/i.test(local))files.catalog.push(path);
    else if(captured&&/^screens\/.+\/state\.json$/i.test(local))files.capture.push(path);
    else if(path===capturedAudioPath)files.audioProject.push(path);
    else if(captured&&/\.nesforge\.json$/i.test(local))files.project.push(path);
    else if(/^projects\/.+\.nesforge\.json$/i.test(local))files.project.push(path);
    else if(path===nativeProjectPath)files.nativeProject.push(path);
    else if(/^audio\/.+\.nesforge\.json$/i.test(local))files.audioProject.push(path);
    else if(/^audio\/audio_report\.json$/i.test(local)||captured&&path===reports[0])files.audioReport.push(path);
  }
  for(const path of [...files.room,...files.resource]){
    const png=path.replace(/\.json$/i,'_collision.png');if(entries[png])files.collision.push(png);
  }
  if(!Object.values(files).some(group=>group.length))message('No supported map, room, project or audio entries.');
  const catalog=new Map(Object.entries(files).flatMap(([kind,list])=>list.map(path=>[path,kind])));
  async function entry(path){
    const kind=catalog.get(path);
    if(!kind)message('Select a listed resource.');
    const data=await json(kind==='collision'?path.replace(/_collision\.png$/i,'.json'):path);
    if(!data||typeof data!=='object')message('Invalid JSON resource.');
    if(['project','animationProject','nativeProject','audioProject'].includes(kind)){
      if(data.format!=='NESForge')message('Unsupported project format.');
      services.ProjectStore.prepareLoad(data);
      if(kind==='nativeProject'&&data.nativeGame?.sourceSha256!==report.rom.sha256.toLowerCase())message('Native project source differs from the extraction.');
      if(captured&&(data.scenes||[]).some(scene=>scene.captureMeta?.rom_sha256&&scene.captureMeta.rom_sha256!==report.rom.sha256.toLowerCase()))message('Captured project source differs from the report.');
      if(kind==='animationProject'&&(data.scenes||[]).some(scene=>scene.captureMeta?.nativeAssets?.source?.sha256&&scene.captureMeta.nativeAssets.source.sha256!==report.rom.sha256.toLowerCase()))message('Animation project source differs from the extraction.');
    }
    if(kind==='map'&&(!Number.isSafeInteger(data.width)||!Number.isSafeInteger(data.height)||
       data.width<1||data.height<1||!Array.isArray(data.cells)||data.cells.length!==data.width*data.height)){
      message('The map dimensions do not match its cells.');
    }
    if(kind==='room'&&data.format!=='NESForgeNativeSceneEvidence')message('Unsupported room evidence format.');
    if(kind==='resource'&&(!data.resource||typeof data.resource.id!=='string'||!Array.isArray(data.pages)||!data.pages.length||data.pages.length>4096||data.pages.some(page=>!Array.isArray(page.nt)||page.nt.length!==960||!Array.isArray(page.attr)||page.attr.length!==64)))message('Invalid native resource pages.');
    if(kind==='capture'&&(data.format!=='NESForgeRuntimeSnapshot'||data.status!=='observed'||data.rom?.sha256!==report.rom.sha256.toLowerCase()||!Number.isSafeInteger(data.frame)||data.frame<0))message('Invalid or wrong-source runtime snapshot.');
    if(kind==='pose'&&(typeof data.pose?.id!=='string'||typeof data.metasprite?.id!=='string'||!Array.isArray(data.metasprite.pieces)||data.metasprite.pieces.length>256||!Array.isArray(data.sprPal)||data.sprPal.length!==4))message('Invalid exported pose fragment.');
    if(kind==='catalog'){
      if(!Array.isArray(data)||data.length>65536)message('Invalid source catalog.');
      const ram=isName(path,'ram.json');
      if(data.some(item=>ram?(!Array.isArray(item)||!Number.isSafeInteger(item[0])||item[0]<0||item[0]>65535||typeof item[1]!=='string'):(!item||typeof item!=='object'||typeof item.id!=='string')))message('Invalid source catalog record.');
    }
    if(kind==='collision'){
      const c=data.collision,grids=Array.isArray(c?.pages)?c.pages:[c?.cells||c?.solid];
      if(!c||!Number.isSafeInteger(c.width)||!Number.isSafeInteger(c.height)||c.width<1||c.height<1||c.width*c.height>4194304||!grids.length||grids.some(grid=>!Array.isArray(grid)||grid.length!==c.width*c.height||grid.some(v=>!Number.isSafeInteger(v)||v<0||v>255)))message('Invalid exported collision reference grid.');
    }
    return {kind,data,...(kind==='catalog'?{catalogType:path.split('/').at(-1)}:{})};
  }
  async function preview(path){
    if(!catalog.has(path))message('Select a listed resource.');
    const kind=catalog.get(path),png=kind==='collision'?path:kind==='capture'?path.replace(/state\.json$/i,'screen.png'):kind==='animationProject'?path.replace(/\.nesforge\.json$/i,'.png'):path.replace(/\.json$/i,'.png');
    if(!entries[png])return null;
    const data=await read(png);
    if(data.length<24||![137,80,78,71,13,10,26,10].every((n,i)=>data[i]===n))message('Preview is not a PNG.');
    return new Blob([data],{type:'image/png'});
  }
  function verifySource(source){
    if(!(source instanceof Uint8Array)||!source.length||source.length>64*1024*1024)message('Choose a local ROM of at most 64 MiB.');
    const digest=window.NativeEngineFormat.sha256,actual=digest(source),expected=report.rom.sha256.toLowerCase();
    if(actual===expected)return {status:'exact',sha256:actual};
    // A pack may record an explicit old/new iNES header pair. Prove the whole
    // declared file hash on a temporary copy before accepting payload identity.
    const note=String(report.header_note||'');
    const change=note.match(/\(([a-f0-9]{32})\s*->\s*([a-f0-9]{32})\)/i);
    const actualHeader=Array.from(source.subarray(0,16),x=>x.toString(16).padStart(2,'0')).join('');
    if(change&&source.length>=16&&actualHeader.startsWith('4e45531a')&&change[1].toLowerCase().startsWith('4e45531a')&&actualHeader===change[2].toLowerCase()){
      const comparison=source.slice();comparison.set(change[1].match(/../g).map(pair=>parseInt(pair,16)));
      if(digest(comparison)===expected)return {status:'same-payload',sha256:actual,payloadSha256:digest(source.subarray(16))};
    }
    return {status:'mismatch',sha256:actual};
  }
  return {kind:'extraction',report,files,root,entry,preview,verifySource};
}
services.ExtractionPack=Object.freeze({open});
})();
