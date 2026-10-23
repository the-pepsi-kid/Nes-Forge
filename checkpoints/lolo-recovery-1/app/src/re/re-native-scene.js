/* Mechanical lifecycle shared by native background and map conversion.
 * Trusted application wrappers own report validation and standalone projects;
 * REMethods remains the registry, ProjectStore the mutation owner, and the
 * ordinary detached compiler the only preview build path. */
(()=>{
'use strict';
const services=window.Forge.services;
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function createLifecycle(spec){
  if(!spec||typeof spec.label!=='string'||typeof spec.format!=='string'||typeof spec.validateRecovery!=='function'||typeof spec.standalone!=='function'||!['packed','single-room','world'].includes(spec.expectedBackend)||typeof spec.importIntent!=='string')throw Error('Native scene: A trusted scene conversion contract is required.');
  const {label,format,validateRecovery,standalone,expectedBackend,importIntent}=spec;
  const compileOptions=Object.freeze({...spec.compileOptions}),messages=Object.freeze({...spec.messages}),stages=new WeakSet();
  const fail=message=>{throw Error(label+': '+message);};
  function checkSignal(signal){if(signal?.aborted){const error=Error(messages.cancelled||'Scene recovery cancelled.');error.name='AbortError';throw error;}}
  async function stage(analysis,methodId,options={},controls={}){
    const store=services.ProjectStore,guard=Object.freeze({epoch:store.state.epoch,snapshot:store.serialize()});
    const result=await services.REMethods.dispatch(methodId,'convert',analysis,options,controls);checkSignal(controls.signal);
    if(result.status!=='supported')fail(result.reason);
    const data=result.data;if(!data?.scene||data.report?.format!==format)fail(messages.wrongKind||'This method does not produce the requested native scene.');
    validateRecovery(data.report);
    if(data.report.method.id!==methodId||data.scene.id!==data.report.sceneId||JSON.stringify(data.scene.captureMeta?.recovery)!==JSON.stringify(data.report))fail(messages.evidenceMismatch||'Scene and method evidence differ.');
    if(data.report.source.sha256!==analysis.report.identity.sha256||data.report.source.byteLength!==analysis.report.identity.byteLength)fail(messages.wrongSource||'Scene preview refers to another source.');
    const project=standalone(data.scene,result.source);store.prepareLoad(project);
    const artifact=services.RuntimeCompiler.compileDetached(project,compileOptions);checkSignal(controls.signal);
    if(artifact.backend!==expectedBackend)fail(messages.wrongBackend||'The preview build backend differs from the declared scene conversion.');
    if(!window.crypto?.subtle?.digest)fail('SHA-256 is unavailable in this context.');
    const digest=await window.crypto.subtle.digest('SHA-256',artifact.rom);checkSignal(controls.signal);
    if(store.state.epoch!==guard.epoch||store.serialize()!==guard.snapshot)fail('The project changed during preview. Preview again.');
    const resultStage=freeze({report:data.report,scene:data.scene,project,guard,previewBuild:{backend:artifact.backend,byteLength:artifact.rom.length,sha256:Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('')}});stages.add(resultStage);return resultStage;
  }
  function importStaged(value){
    if(!stages.has(value))fail(messages.unownedStage||'Preview this scene in the current editor before importing.');
    const result=services.ProjectStore.appendScene(value.scene,{expected:value.guard,intent:importIntent,select:true});
    return Object.freeze({...result,sceneId:value.scene.id});
  }
  return Object.freeze({stage,importStaged});
}
services.RENativeScene=Object.freeze({version:1,createLifecycle});
})();
