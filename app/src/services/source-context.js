/* Read-only source roles for intake, RE, Audio and lessons. ProjectStore and the
 * original source sessions retain ownership. A matching hash describes identity,
 * never current build eligibility, write permission, or a runtime event binding.
 */
(() => {
  'use strict';
  const services=Forge.services,hash=value=>/^[a-f0-9]{64}$/.test(value||'');
  let cachedBytes=null,cachedHash=null;
  function project() {
    const declared=S.nativeGame?.sourceSha256||S.investigation?.source?.sha256;
    if(hash(declared)){cachedBytes=cachedHash=null;return {sha256:declared,name:S.investigation?.source?.name||S.projectName,kind:'preserved'};}
    const bytes=S.importedRom;
    if(!bytes?.length){cachedBytes=cachedHash=null;return null;}
    // Only a disposable display cache. Imported ROM identity is replaced through
    // the existing loader; declared native identity remains its validator's job.
    if(bytes!==cachedBytes){cachedBytes=bytes;cachedHash=NativeEngineFormat.sha256(Uint8Array.from(bytes));}
    return {sha256:cachedHash,name:S.projectName,kind:'imported'};
  }
  function describe(source,{valid=true,kind='rom'}={}) {
    const active=project(),present=hash(source?.sha256),matches=present&&active?.sha256===source.sha256;
    const role=!present?'empty':!valid?'detached':kind==='project-file'?'inspected-file':matches?'project':'independent';
    const label={empty:'No source loaded',detached:'Detached source',project:'Current project source',independent:'Independent source',
      'inspected-file':'Inspected project file'}[role];
    const detail=role==='detached'?'Retained evidence; its previous project or source guard is no longer current.':
      role==='project'?'Source identity matches the active project. Native writers still enforce their own scope.':
      role==='independent'?'This inspection is separate from the active project. Importing remains an explicit action.':
      role==='inspected-file'?'This is a saved project input. Opening it replaces the active workspace.':'Choose a source to inspect.';
    return {role,label,detail,sourceSha256:present?source.sha256:null,projectSha256:active?.sha256||null,matchesProject:!!matches,valid:!!valid&&present};
  }
  services.SourceContext=Object.freeze({project,describe});
})();
