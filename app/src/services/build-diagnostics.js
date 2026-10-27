/* Structured context for actual build refusals. Native owners attach evidence
 * where they already reject an edit. This module never decides build eligibility,
 * reconstructs a signing baseline, writes an asset, or persists a report.
 * BuildGraph supplies the real compiler result; UI renders text and navigation.
 */
(() => {
  'use strict';
  const services=Forge.services;
  function difference(actual,expected,path='') {
    if(actual===expected)return null;
    if(actual&&expected&&typeof actual==='object'&&typeof expected==='object') {
      const keys=[...new Set([...Object.keys(actual),...Object.keys(expected)])].sort((a,b)=>Number.isInteger(+a)&&Number.isInteger(+b)?+a-+b:a.localeCompare(b));
      for(const key of keys){const next=Array.isArray(actual)?path+'['+key+']':path?path+'.'+key:key;
        const found=difference(actual[key],expected[key],next);if(found)return found;}
      return null;
    }
    return path||'(value)';
  }
  function attach(error,details) {
    error.buildDiagnostics=[{severity:'error',code:'native-build-refused',phase:'native-validation',message:error.message,...details}];return error;
  }
  function from(error) {
    return error.buildDiagnostics||[{severity:'error',code:'build-refused',phase:'compile',message:error.message,
      repair:'Preserve the project with Save Project As, then correct the reported input and check again.'}];
  }
  function render(host,entries) {
    host.replaceChildren();
    for(const item of entries){const row=document.createElement('div');row.className=item.severity==='error'?'err':item.severity==='warning'?'warn':'ok';
      const text=document.createElement('div');text.textContent=item.message;row.append(text);
      for(const value of [item.assetName?'Resource: '+item.assetName+(item.assetId?' ['+item.assetId+']':''):'',item.field?'Field: '+(item.path||item.field):'',item.repair||''])
        if(value){const line=document.createElement('div');line.textContent=value;row.append(line);}
      if(item.resourceKey){const button=document.createElement('button');button.type='button';button.textContent='Inspect this resource';
        button.onclick=()=>{services.ConnectedWorkspacePreview?.close();services.ResourceRelationshipPreview?.openAt(item.resourceKey);};row.append(button);}
      if(item.writerRoute){const button=document.createElement('button');button.type='button';button.textContent='Review supported native tools';
        button.onclick=()=>{services.ResourceRelationshipPreview?.close();services.ConnectedWorkspacePreview?.open('native');};row.append(button);}
      host.append(row);
    }
  }
  services.BuildDiagnostics=Object.freeze({difference,attach,from,render});
})();
