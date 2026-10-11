/* Movement rules: detached, seeded edits to existing generated-runtime physics.
 * No emitter, schema, emulator, legacy mashup algorithm or live project changes. */
(()=>{
'use strict';
const services=window.Forge.services,FORMAT='NESForgeMovementRecipe',VERSION=1,ALGORITHM='sha256-mulberry32-movement-1';
const FIELDS=Object.freeze(['moveSpeed','jumpSpeed','gravity','maxFallSpeed']);
const LIMITS=Object.freeze(Object.fromEntries(FIELDS.map(field=>[field,window.Forge165.config.limits[field]])));
const PRESETS=Object.freeze(['keep','sprint','high-jump','slow-fall','heavy-fall','seeded-mix']);
const sourcesMade=new WeakSet(),cp=value=>JSON.parse(JSON.stringify(value)),fail=message=>{throw Error('Movement rules: '+message);};
const model=()=>{if(!services.MashupModel)fail('Canonical source validation is unavailable.');return services.MashupModel;};
const stable=value=>model().stable(value),hash=value=>model().hash(value);
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);Object.values(value).forEach(freeze);}return value;}
function record(value,keys,label){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||Object.keys(value).some(key=>!keys.includes(key)))fail(label+' has unknown or missing fields.');}
function seedValue(value){if(typeof value!=='string'||!value.trim()||value.length>128)fail('Seed must contain 1–128 characters and cannot be blank.');return value;}
function origin(value){record(value,['seed','preset','intensity'],'Rule origin');seedValue(value.seed);if(!PRESETS.includes(value.preset))fail('Unknown movement preset.');if(!Number.isInteger(value.intensity)||value.intensity<1||value.intensity>3)fail('Intensity must be 1, 2 or 3.');return{seed:value.seed,preset:value.preset,intensity:value.intensity};}
function locksValue(value={},exact=false){if(!value||typeof value!=='object'||Array.isArray(value))fail('Locks must be an object.');if(exact)record(value,FIELDS,'Rule locks');for(const key of Object.keys(value)){if(!FIELDS.includes(key))fail('Unknown movement lock '+key+'.');if(typeof value[key]!=='boolean')fail('Movement locks must be true or false.');}return Object.fromEntries(FIELDS.map(key=>[key,value[key]===true]));}
function configValidation(project,backend){
 services.WorldConfig.validate(project.worldRuntime,{references:backend==='world',project});
 window.Forge165.config.validate(project.gameplay,{references:backend==='single-room',project});
}
function createSource(input,{name}={}){
 // Check JSON values before stringifying, while retaining the source's field
 // ordering. Applying four scalar writes must not reorder unrelated audio.
 const text=typeof input==='string'?input:(stable(input),JSON.stringify(input)),canonical=model().createSource(text,{name}),project=canonical.project;
 if(project.mapper!==0)fail('Movement rules require mapper 0 generated Forge code.');
 if(typeof project.asmSource!=='string'||project.asmSource.trim())fail('Save and clear custom assembly before using movement rules.');
 const backend=project.worldRuntime?.enabled?'world':project.gameplay?.mode==='single-room'?'single-room':null;
 if(!backend)fail('Select and configure an existing generated World or single-room runtime first; Scene viewer has no playable movement rules.');
 configValidation(project,backend);
 const source={id:canonical.id,sha256:canonical.sha256,byteLength:canonical.byteLength,name:canonical.name,project,backend,configKey:backend==='world'?'worldRuntime':'gameplay'};sourcesMade.add(source);return freeze(source);
}
function sourceValue(source){if(!sourcesMade.has(source))fail('Capture an original project with createSource; source wrappers cannot be imported or edited.');return source;}
function random(seed,field){let state=parseInt(hash(ALGORITHM+'\0'+seed+'\0'+field).slice(0,8),16)>>>0;state=(state+0x6d2b79f5)>>>0;let value=state;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);return((value^(value>>>14))>>>0)/4294967296;}
function choice(source,field,from){
 const base=source.project[source.configKey][field],level=from.intensity-1;
 if(from.preset==='seeded-mix'){const[minimum,maximum]=LIMITS[field],radius=from.intensity,lo=from.intensity===3?minimum:Math.max(minimum,base-radius),hi=from.intensity===3?maximum:Math.min(maximum,base+radius);return lo+Math.floor(random(from.seed,field)*(hi-lo+1));}
 const targets={keep:{},sprint:{moveSpeed:[2,3,4][level]},'high-jump':{jumpSpeed:[10,11,12][level],gravity:1},'slow-fall':{maxFallSpeed:[4,2,1][level],gravity:1},'heavy-fall':{gravity:[2,2,3][level],maxFallSpeed:[6,7,8][level]}};
 return Object.hasOwn(targets[from.preset],field)?targets[from.preset][field]:base;
}
function build(source,current,locks,origins){
 const project=cp(source.project),decisions={},changes=[];
 for(const field of FIELDS){const after=choice(source,field,origins[field]),before=project[source.configKey][field];decisions[field]=after;project[source.configKey][field]=after;if(after!==before)changes.push({domain:'movement',backend:source.backend,configKey:source.configKey,field,before,after,description:field+': '+before+' → '+after});}
 const recipe={format:FORMAT,version:VERSION,algorithm:ALGORITHM,sourceSha256:source.sha256,backend:source.backend,...current,locks:cp(locks),origins:cp(origins),decisions,resultSha256:hash(project)};
 return{project,recipe,changes};
}
function verifyRecipe(source,recipe){
 record(recipe,['format','version','algorithm','sourceSha256','backend','seed','preset','intensity','locks','origins','decisions','resultSha256'],'Movement recipe');
 if(recipe.format!==FORMAT||recipe.version!==VERSION||recipe.algorithm!==ALGORITHM)fail('Unsupported movement recipe.');
 if(recipe.sourceSha256!==source.sha256||recipe.backend!==source.backend)fail('Recipe is stale or belongs to a different original project/runtime.');
 if(!/^[a-f0-9]{64}$/.test(recipe.resultSha256||''))fail('Invalid recipe result identity.');
 const current=origin({seed:recipe.seed,preset:recipe.preset,intensity:recipe.intensity}),locks=locksValue(recipe.locks,true),origins={};
 record(recipe.origins,FIELDS,'Rule origins');record(recipe.decisions,FIELDS,'Rule decisions');
 for(const field of FIELDS){origins[field]=origin(recipe.origins[field]);const[min,max]=LIMITS[field];if(!Number.isInteger(recipe.decisions[field])||recipe.decisions[field]<min||recipe.decisions[field]>max)fail('Invalid recipe decision for '+field+'.');if(!locks[field]&&stable(origins[field])!==stable(current))fail('An unlocked rule has a mismatched generating origin.');}
 const result=build(source,current,locks,origins);if(stable(result.recipe)!==stable(recipe))fail('Recipe decisions or result identity differ from deterministic regeneration.');return result;
}
function complete(source,result){
 const validation=model().validate(result.project);configValidation(result.project,source.backend);
 const artifact=services.RuntimeCompiler.compileDetached(result.project);
 validation.build='compiled-'+source.backend;validation.romSha256=window.FamiTone2Native.sha256(artifact.rom);validation.romBytes=artifact.rom.length;validation.notice='Detached '+(source.backend==='world'?'World':'single-room')+' ROM compiled and capacity checked after movement changes. Ordinary Save/build may serialize metadata differently. This is not browser, listening or hardware acceptance.';
 const warnings=['Movement settings apply globally to the active '+(source.backend==='world'?'World runtime':'single-room runtime')+', not just the selected editor Scene.','These are existing bounded NES movement settings; no level-solvability or playability guarantee is made.','Preset targets are absolute values, not multipliers. Locks can override part of a preset; review every resulting value.','Movement/jump/fall speeds are pixels per runtime tick; gravity is pixels per tick squared. Low gravity below 1, sliding, knockback, health/death and new mechanics are not added.'];
 const effective=result.recipe.resultSha256!==source.sha256;if(!effective)warnings.push('These settings produce no effective movement changes.');
 return freeze({status:effective?'ready':'no-change',effective,...result,warnings,validation});
}
function preview(source,options={}){
 sourceValue(source);if(!options||typeof options!=='object'||Array.isArray(options))fail('Options must be an object.');for(const key of Object.keys(options))if(!['seed','preset','intensity','locks','previousRecipe'].includes(key))fail('Unknown movement option '+key+'.');
 const current=origin({seed:options.seed===undefined?'forge-1':options.seed,preset:options.preset===undefined?'keep':options.preset,intensity:options.intensity===undefined?1:options.intensity}),locks=locksValue(options.locks),origins={};let previous=null;
 if(FIELDS.some(field=>locks[field])){if(!options.previousRecipe)fail('A movement lock requires a previous successful preview.');previous=verifyRecipe(source,options.previousRecipe);}
 for(const field of FIELDS)origins[field]=cp(locks[field]?previous.recipe.origins[field]:current);
 return complete(source,build(source,current,locks,origins));
}
function replay(source,recipe){sourceValue(source);return complete(source,verifyRecipe(source,recipe));}
services.MovementRules=Object.freeze({version:VERSION,format:FORMAT,algorithm:ALGORITHM,fields:FIELDS,limits:LIMITS,presets:PRESETS,createSource,preview,replay,stable,hash});
})();
