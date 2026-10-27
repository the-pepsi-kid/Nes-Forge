/* Source role presentation across existing sessions. ProjectStore commits call
 * InvestigationUI.projectChanged; this UI refreshes there and on editing events.
 * It creates no source/asset owner, polling loop, persistence, or write shortcut.
 */
(() => {
  'use strict';
  const services=Forge.services;
  function badge(parentId,id,context) {
    const parent=document.getElementById(parentId);if(!parent)return;
    let node=document.getElementById(id);if(!node){node=document.createElement('p');node.id=id;node.className='source-role';node.setAttribute('role','status');parent.after(node);}
    node.dataset.sourceRole=context.role;node.textContent=context.label+' — '+context.detail;
  }
  function refresh() {
    services.ProjectGatewayUI?.refresh();services.NativeAudioLibraryUI?.refresh();services.InvestigationUI?.refresh();
    const analysis=services.REAnalysisUI.currentAnalysis()?.report?.identity;
    const state=services.REAnalysisUI.getState();
    badge('reAnalysisIdentity','reAnalysisSourceContext',services.SourceContext.describe(analysis,{valid:!state.pendingSelection&&!state.busy}));
    const spatial=services.SpatialREUI.getState();
    badge('spatialREIdentity','spatialRESourceContext',services.SourceContext.describe({sha256:spatial.sha256},{valid:!spatial.busy}));
  }
  const css=document.createElement('style');css.textContent='#nativeAudioSourceContext{overflow-wrap:anywhere;white-space:normal}.source-role{padding:8px;border-left:3px solid var(--acc,#60cbd2);font:12px/1.6 system-ui;overflow-wrap:anywhere}.source-role[data-source-role=detached],#nativeAudioSourceContext[data-source-role=detached]{border-left:3px solid #e3ae67;padding-left:10px;color:#ffcb87}';document.head.append(css);
  const workspace=document.getElementById('sourceWorkspace');
  if(workspace){const text=document.createElement('p');text.id='sourceWorkspaceContext';text.className='source-role';text.dataset.sourceRole='independent';text.textContent='Independent multi-file source workspace. Files, reports and source-ROM builds stay separate from the active Forge project; export them before closing.';workspace.prepend(text);}
  const changed=()=>queueMicrotask(refresh);
  for(const type of ['click','change','input','pointerup'])document.addEventListener(type,changed);
  window.addEventListener('forge:re-analysis-source-change',changed);
  // Spatial RE also opens asynchronously during saved-project restoration.
  // Observe presentation changes only as a refresh signal; source validity is
  // still read from SpatialREUI and the original project/source guards.
  const observer=new MutationObserver(changed);
  for(const id of ['spatialREIdentity','spatialREStatus']){const node=document.getElementById(id);if(node)observer.observe(node,{childList:true,subtree:true,characterData:true});}
  const results=document.getElementById('spatialREResults');if(results)observer.observe(results,{attributes:true,attributeFilter:['hidden']});
  services.SourceContextUI=Object.freeze({refresh});refresh();
})();
