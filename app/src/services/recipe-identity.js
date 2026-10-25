/* Versioned recipe identity migration. Raw v1 algorithms keep their exact
 * source/result hashes. Only this adapter may bridge reviewed release metadata. */
(()=>{
'use strict';
const services=window.Forge.services,VERSION=1,METHOD='exact-v1-foundation-reissue-1';
// A schema or behavioral migration is not implied by a new release number.
// Extend this reviewed list only with canonical source/result equivalence tests.
const RELEASES=Object.freeze(['2.0.0-alpha.10','2.0.0-alpha.11']);
const cp=value=>JSON.parse(JSON.stringify(value)),fail=message=>{throw Error('Recipe identity: '+message);};
const model=()=>services.MashupModel,stable=value=>model().stable(value),hash=value=>model().hash(value);
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);Object.values(value).forEach(freeze);}return value;}
function binding(value,bytes=true){
 const keys=bytes?['sha256','byteLength']:['sha256'];
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||Object.keys(value).some(key=>!keys.includes(key))||!/^[a-f0-9]{64}$/.test(value.sha256||'')||(bytes&&(!Number.isSafeInteger(value.byteLength)||value.byteLength<1||value.byteLength>model().limits.sourceBytes)))fail('Malformed exact source identity.');
 return value;
}
function sourceBindings(sources){return sources.map(source=>({sha256:source.sha256,byteLength:source.byteLength})).sort((a,b)=>a.sha256<b.sha256?-1:a.sha256>b.sha256?1:0);}
function sameBinding(source,expected){return source.sha256===expected.sha256&&(expected.byteLength===undefined||source.byteLength===expected.byteLength);}
function historicalSource(source,expected,createSource){
 if(sameBinding(source,expected))return source;
 if(!RELEASES.includes(source.project.foundation))return null;
 for(const foundation of RELEASES){
  if(foundation===source.project.foundation)continue;
  const project=cp(source.project);project.foundation=foundation;
  // Hash the complete original serialization, not a metadata-stripped digest.
  const canonical=stable(project),byteLength=new TextEncoder().encode(canonical).length;
  if(hash(canonical)!==expected.sha256||(expected.byteLength!==undefined&&byteLength!==expected.byteLength))continue;
  const original=createSource(project,{name:source.name});
  if(sameBinding(original,expected))return original;
 }
 return null;
}
function matchSources(sources,expected,createSource){
 if(!Array.isArray(expected)||expected.length!==sources.length||new Set(expected.map(item=>item.sha256)).size!==expected.length)fail('Recipe source identities differ; provide every exact original editable source project.');
 const remaining=new Set(sources),pairs=[];
 // Reserve exact matches before metadata aliases; never let an alias consume
 // another exact source, or guess between ambiguous source wrappers.
 for(const wanted of expected){const source=sources.find(item=>sameBinding(item,wanted));if(source){pairs.push({current:source,original:source});remaining.delete(source);}}
 for(const wanted of expected){
  if(pairs.some(pair=>pair.original.sha256===wanted.sha256))continue;
  const matches=[];for(const source of remaining){const original=historicalSource(source,wanted,createSource);if(original)matches.push({current:source,original});}
  if(matches.length!==1)fail('Recipe source identities differ; provide the exact original project and donors under the reviewed foundation-only migration.');
  pairs.push(matches[0]);remaining.delete(matches[0].current);
 }
 return pairs;
}
function migrated(result,originalRecipe,pairs){
 const migration={format:'NESForgeRecipeIdentityMigration',version:VERSION,method:METHOD,field:'foundation',originalRecipeSha256:hash(originalRecipe),currentRecipeSha256:hash(result.recipe),originalResultSha256:originalRecipe.resultSha256,currentResultSha256:result.recipe.resultSha256,sources:pairs.filter(pair=>pair.current.sha256!==pair.original.sha256).map(pair=>({originalSha256:pair.original.sha256,currentSha256:pair.current.sha256,originalByteLength:pair.original.byteLength,currentByteLength:pair.current.byteLength,fromFoundation:pair.original.project.foundation,toFoundation:pair.current.project.foundation}))};
 return freeze({...result,migration,warnings:[...result.warnings,'Recipe migrated with '+METHOD+': every original source and the original result passed exact SHA-256 verification. Only the foundation release metadata changed; the current-source v1 recipe was reissued and replayed. Download the recipe to keep that current identity.']});
}
function expectedCurrent(verified,pairs,baseSha256){
 const base=pairs.find(pair=>pair.original.sha256===baseSha256);if(!base)fail('The original base source is unavailable.');
 const expected=cp(verified.project);expected.foundation=base.current.project.foundation;return expected;
}
async function replayMashup(sources,recipe){
 let mismatch;
 try{
  const result=await model().replay(sources,recipe);
  if(recipe.baseSourceId!==sources[0].id)fail('This recipe requires its exact original base project. Open that project and choose Use current project first.');
  return result;
 }catch(error){if(!/^Mashup: Recipe source identities differ;/.test(error.message||''))throw error;mismatch=error;}
 // Raw replay has already checked source ownership, pool budgets and recipe
 // schema. Migration validates bindings before considering known releases.
 if(!Array.isArray(recipe.sources))throw mismatch;
 recipe.sources.forEach(item=>binding(item));
 const pairs=matchSources(sources,recipe.sources,(project,options)=>model().createSource(project,options));
 const base=pairs.find(pair=>pair.original.sha256===recipe.baseSourceId);
 if(!base||base.current.id!==sources[0].id)fail('This recipe requires its exact original base project. Open that project and choose Use current project first.');
 const originalSources=sources.map(source=>pairs.find(pair=>pair.current===source).original),verified=await model().replay(originalSources,recipe),expected=expectedCurrent(verified,pairs,recipe.baseSourceId),next=cp(recipe);
 const remap=id=>{if(id==='keep')return id;for(const pair of pairs){if(id===pair.original.id)return pair.current.id;if(id.startsWith(pair.original.id+':'))return pair.current.id+id.slice(pair.original.id.length);}fail('A recipe asset is not bound to a verified source.');};
 next.sources=sourceBindings(sources);next.baseSourceId=base.current.id;next.choices=Object.fromEntries(Object.entries(next.choices).map(([domain,id])=>[domain,remap(id)]));next.resultSha256=hash(expected);
 const result=await model().replay(sources,next);
 if(stable(result.project)!==stable(expected))fail('Reissued mashup changes more than foundation metadata; migration refused.');
 return migrated(result,recipe,pairs);
}
async function replayMovement(source,recipe){
 const movement=services.MovementRules;
 try{return await movement.replay(source,recipe);}catch(error){if(!/^Movement rules: Recipe is stale or belongs to a different original project\/runtime\./.test(error.message||''))throw error;}
 binding({sha256:recipe.sourceSha256},false);
 const pairs=matchSources([source],[{sha256:recipe.sourceSha256}],(project,options)=>movement.createSource(project,options)),verified=await movement.replay(pairs[0].original,recipe),expected=expectedCurrent(verified,pairs,recipe.sourceSha256),next=cp(recipe);
 next.sourceSha256=source.sha256;next.resultSha256=hash(expected);
 const result=await movement.replay(source,next);
 if(stable(result.project)!==stable(expected))fail('Reissued movement rules change more than foundation metadata; migration refused.');
 return migrated(result,recipe,pairs);
}
services.RecipeIdentity=Object.freeze({version:VERSION,method:METHOD,supportedFoundations:RELEASES,replayMashup,replayMovement});
})();
