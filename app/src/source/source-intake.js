/* Read-only, bounded source inventory. This scanner does not assemble, expand
 * macros, run scripts, resolve linker configuration, or translate a dialect. */
(()=>{
'use strict';
const services=window.Forge.services,E=new TextEncoder();
const DIALECTS=Object.freeze(['unknown','forge-6502-v1','ca65','ophis','nesasm','asm6','lua','other']);
const LIMITS=Object.freeze({lines:65536,lineCharacters:8192,dependencies:4096,diagnostics:1024,graphSteps:16384});
const DIRECTIVES=new Set(['org','rsset','enum','ende','rs','byte','db','word','dw','define','macro','endm','endmacro','include','incbin']);
const CONDITIONS=new Set(['if','ifdef','ifndef','ifblank','ifnblank','ifconst','ifnconst','ifref','ifnref','ifp02','ifpc02','ifpsc02','ifp816']);
const REPEATS=new Set(['repeat','rept','for','while']),REPEAT_ENDS=new Set(['endrepeat','endrep','endrept','endr','next','endfor','endwhile']);
const HOST=/\.(?:lua|js|mjs|cjs|py|sh|bash|bat|cmd|ps1|c|cpp|cc|hpp)$/i;
const BINARY=/\.(?:bin|chr|nes|rom|o|obj|a|lib|png|jpe?g|gif|bmp|wav|mp3|ogg|zip|gz|pb53|pkb|nam|pal)$/i;
const TEXT=/\.(?:txt|md|json|cfg|x|h|hpp|xml|yml|yaml)$/i;
const ASM=/\.(?:asm|s|inc|mac|a65|6502)$/i;
function fail(code,message){const error=Error(message);error.code=code;throw error;}
function options(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['declaredDialect','engine','engineVersion'].includes(k)))fail('intake-options','Use only declaredDialect, engine and engineVersion intake metadata.');const dialect=input.declaredDialect??'unknown';if(!DIALECTS.includes(dialect))fail('intake-dialect','Choose a supported declaration value; use other for an unlisted dialect.');const out={dialect};for(const key of ['engine','engineVersion']){const value=input[key]??'';if(typeof value!=='string'||value.length>128||/[\x00-\x1f\x7f]/.test(value))fail('intake-metadata','Engine and version declarations must be plain text of at most 128 characters.');out[key]=value;}return out;}
async function sha(bytes){if(!window.crypto?.subtle?.digest)fail('intake-hash','SHA-256 is unavailable in this browser context.');const result=await window.crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(result),v=>v.toString(16).padStart(2,'0')).join('');}
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
async function analyze(input,opt={}){
  const ws=services.SourceWorkspace,doc=ws.validate(input),declared=options(opt);
  // The existing reader remains the byte owner. A one-file validated view avoids
  // repeatedly decoding the entire inventory for each individual read.
  const snapshots=doc.files.map(file=>{const view={...doc,files:[file]};return{path:file.path,current:ws.read(view,file.path),original:ws.read(view,file.path,true)};});
  const workspace={format:doc.format,version:doc.version,dialect:doc.dialect,entry:doc.entry,build:{...doc.build}};
  const files=[],dependencies=[],diagnostics=[],rows=[],parsed=new Set(),macroNames=new Set(),fileMap=new Map();let lineCount=0,truncated=false,graphSteps=0;
  function diagnostic(severity,code,message,path=null,line=null){if(diagnostics.length>=LIMITS.diagnostics){truncated=true;return;}diagnostics.push({severity,code,message,path,line});}
  function limited(code,message,path=null,line=null){truncated=true;diagnostic('warning',code,message,path,line);}
  if(declared.dialect==='unknown')diagnostic('warning','declaration-unknown','Source dialect is not declared. Filename and familiar instructions do not establish compatibility.');
  else if(declared.dialect!=='forge-6502-v1')diagnostic('error','declaration-foreign','Declared '+declared.dialect+' source is preserved for inspection. The existing Forge assembler does not implement that dialect or its toolchain.');
  for(const item of snapshots){const record={path:item.path,currentBytes:item.current.length,originalBytes:item.original.length,currentSha256:await sha(item.current),originalSha256:await sha(item.original),kind:ASM.test(item.path)?'assembly':HOST.test(item.path)?'host-source':BINARY.test(item.path)?'binary':TEXT.test(item.path)?'text':'unclassified',kindBasis:'filename-hint',scanned:false,scanComplete:false,reachability:'unreferenced'};files.push(record);fileMap.set(item.path,{record,bytes:item.current});}
  const identity=original=>({workspace,files:files.map(file=>({path:file.path,sha256:original?file.originalSha256:file.currentSha256}))});
  const sourceIdentity={algorithm:'SHA-256',encoding:'UTF-8 JSON.stringify({workspace,files:[{path,sha256}]}); files sorted by normalized case-sensitive path; workspace is the report workspace object',currentSha256:await sha(E.encode(JSON.stringify(identity(false)))),originalSha256:await sha(E.encode(JSON.stringify(identity(true))))};
  const queue=files.filter(f=>f.kind==='assembly').map(f=>f.path);
  const entryRecord=fileMap.get(doc.entry);
  if(!doc.entry)diagnostic('error','entry-required','Select an entry assembly file to inspect entry reachability.');
  else if(!entryRecord)diagnostic('error','entry-missing','The configured entry is not present in this workspace.',doc.entry);
  else if(/\.lua$/i.test(doc.entry))diagnostic('error','entry-not-assembly','Lua entry files are preserved host source and cannot be assembled by the existing Forge source profile.',doc.entry);
  else if(!queue.includes(doc.entry))queue.push(doc.entry);
  function addDependency(row,kind,args,prefix){
    if(dependencies.length>=LIMITS.dependencies){limited('dependency-limit','Dependency inventory reached its bounded edge limit.',row.path,row.line);return;}
    const match=args.match(/^"([^"\r\n]+)"\s*(.*)$/),literal=match?match[1]:null,exact=!!match&&!match[2],context={conditional:row.conditional,macro:row.macro,repetition:row.repetition},dep={from:row.path,line:row.line,kind,literal:literal===null?null:literal.slice(0,241),path:null,status:'dynamic',uncertain:!!(row.conditional||row.macro||row.repetition||!exact||prefix),context,reachability:'unreferenced'};
    if(literal!==null){try{dep.path=ws.pathName(literal,row.path);dep.status=fileMap.has(dep.path)?'present':'missing';}catch(error){dep.status='unsafe';diagnostic('error','dependency-unsafe-path','Dependency path must remain inside the workspace and use a bounded relative forward-slash path.',row.path,row.line);}}
    if(!exact){diagnostic('warning','dependency-expression','Dependency requires expressions, offsets or generated text. Only a single literal quoted path can be expanded by the Forge source profile.',row.path,row.line);if(declared.dialect==='forge-6502-v1')diagnostic('error','dependency-syntax','The Forge preprocessor requires exactly one literal quoted path.',row.path,row.line);}
    if(prefix){diagnostic('error','dependency-prefix','The Forge preprocessor recognizes .include and .incbin only at the start of a statement, without a label prefix or foreign directive spelling.',row.path,row.line);}
    if(dep.status==='missing')diagnostic(dep.uncertain||declared.dialect!=='forge-6502-v1'?'warning':'error','dependency-missing','No workspace file exists at the resolved relative path '+dep.path+'. Foreign search paths and generated files are not resolved.',row.path,row.line);
    if(dep.uncertain)diagnostic('warning','dependency-uncertain','Dependency is lexical evidence inside conditional, macro or repetition syntax or outside the literal Forge preprocessing subset; execution and expansion are not evaluated.',row.path,row.line);
    if(kind==='incbin'&&dep.status==='present'&&fileMap.get(dep.path).bytes.length>32768)diagnostic('error','incbin-limit','Binary insertion exceeds the existing Forge 32 KiB PRG insertion limit.',row.path,row.line);
    dependencies.push(dep);
    if(kind==='include'&&dep.status==='present'){
      // An explicit source include supplies the role; a filename extension is
      // not a compatibility rule. Invalid UTF-8/control bytes still stop parsing.
      if(!parsed.has(dep.path)&&!queue.includes(dep.path))queue.push(dep.path);
    }
  }
  for(let qi=0;qi<queue.length;qi++){
    const name=queue[qi];if(parsed.has(name))continue;parsed.add(name);const item=fileMap.get(name);let text;
    try{text=new TextDecoder('utf-8',{fatal:true}).decode(item.bytes);}catch(error){diagnostic('error','source-encoding','Assembly text must be valid UTF-8; original and current bytes remain preserved.',name);continue;}
    if(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text)){diagnostic('error','source-binary-content','Assembly candidate contains binary control bytes and is not parsed as source.',name);continue;}
    item.record.kind='assembly';item.record.kindBasis='assembly-role-valid-text';item.record.scanComplete=true;let conditionDepth=0,macroDepth=0,repeatDepth=0;
    const lines=text.split(/\r\n|\n|\r/);
    for(let i=0;i<lines.length;i++){
      if(lineCount>=LIMITS.lines){item.record.scanComplete=false;limited('line-limit','Assembly inventory reached the bounded total line limit.',name,i+1);break;}lineCount++;item.record.scanned=true;
      const raw=lines[i];if(raw.length>LIMITS.lineCharacters){item.record.scanComplete=false;limited('line-length-limit','Source line exceeds the bounded scan length; this line was not interpreted.',name,i+1);continue;}
      const clean=asm_stripComment(raw).trim();if(!clean)continue;
      const label=clean.match(/^([\w.]+)\s*:\s*(.*)$/),statement=(label?label[2]:clean).trim(),word=statement.match(/^(\.?[\w]+|[!#]\w+)\b\s*(.*)$/),token=word?word[1].toLowerCase():'',dir=token.startsWith('.')?token.slice(1):token;
      const directive=token.startsWith('.')||!['unknown','forge-6502-v1'].includes(declared.dialect);
      if(directive&&['endif','endc'].includes(dir))conditionDepth=Math.max(0,conditionDepth-1);
      if(directive&&['endm','endmacro'].includes(dir))macroDepth=Math.max(0,macroDepth-1);
      if(directive&&REPEAT_ENDS.has(dir))repeatDepth=Math.max(0,repeatDepth-1);
      const symbolSyntax=/^[\w.]+::|^:(?:[+-]|\s|$)/.test(clean)||[clean,statement].some(value=>{const instruction=value.match(/^(\w+)\s+(.+)$/);return instruction&&asm_MNEMONICS.has(instruction[1].toUpperCase())&&/::|(^|[\s,(])[:][+-]+/.test(instruction[2]);});
      const row={path:name,line:i+1,statement,token,args:word?word[2]:'',label:!!label,conditional:conditionDepth>0,macro:macroDepth>0,repetition:repeatDepth>0,symbolSyntax};rows.push(row);
      if(directive&&dir==='macro'){const m=row.args.match(/^([\w.]+)/);if(m)macroNames.add(m[1].toLowerCase());macroDepth++;}
      if(directive&&CONDITIONS.has(dir))conditionDepth++;
      if(directive&&REPEATS.has(dir))repeatDepth++;
      if((/^[.!#]/.test(token)||!['unknown','forge-6502-v1'].includes(declared.dialect))&&['include','incbin','incsrc','binary','!source','!bin','#include'].includes(token.replace(/^\./,''))){const kind=['incbin','binary','!bin'].includes(dir)?'incbin':'include';addDependency(row,kind,row.args,!!label||!['.include','.incbin'].includes(token));}
    }
    if(conditionDepth)diagnostic('warning','conditional-unclosed','Conditional nesting was not closed in this file; cross-file and dialect semantics are not interpreted.',name);
    if(repeatDepth)diagnostic('warning','repetition-unclosed','Repetition nesting was not closed in this file; iteration and dialect semantics are not interpreted.',name);
    if(macroDepth)diagnostic('warning','macro-unclosed','Macro nesting was not closed in this file; macro expansion is not evaluated.',name);
  }
  for(const row of rows){
    const s=row.statement;if(macroNames.has(row.token))continue;if(row.symbolSyntax){diagnostic('error','unsupported-symbol-syntax','Scoped or anonymous symbol syntax is not implemented by the Forge assembler.',row.path,row.line);continue;}if(!s)continue;
    if(row.token==='.'||!row.token){diagnostic('warning','syntax-unclassified','Statement is outside the recognized lexical subset and needs manual dialect review.',row.path,row.line);continue;}
    if(row.token.startsWith('.')){const dir=row.token.slice(1);if(!DIRECTIVES.has(dir))diagnostic('error','unsupported-directive','.'+dir+' is not implemented by the existing Forge source profile.',row.path,row.line);continue;}
    if(/^[\w.]+\s*=/.test(s)||/^[\w.]+\s+\.rs\s+/i.test(s))continue;
    if(asm_MNEMONICS.has(row.token.toUpperCase()))continue;
    diagnostic('warning',row.macro?'macro-generated-syntax':'statement-unclassified',row.macro?'Macro body contains a generated or unclassified statement; expansion is not evaluated.':'Statement may be a foreign directive or macro invocation; it is not established as supported syntax.',row.path,row.line);
  }
  if(doc.build.chrPath){const present=fileMap.has(doc.build.chrPath);if(dependencies.length<LIMITS.dependencies)dependencies.push({from:null,line:null,kind:'chr',literal:doc.build.chrPath,path:doc.build.chrPath,status:present?'present':'missing',uncertain:false,context:{conditional:false,macro:false,repetition:false},reachability:'reachable'});else limited('dependency-limit','Dependency inventory reached its bounded edge limit.');if(!present)diagnostic('error','chr-missing','The selected CHR file is not present in the workspace.',doc.build.chrPath);else if(fileMap.get(doc.build.chrPath).bytes.length!==8192)diagnostic('error','chr-size','The existing Forge NROM source profile requires a selected CHR file to contain exactly 8192 bytes.',doc.build.chrPath);}
  const outgoing=new Map();for(const d of dependencies){if(!outgoing.has(d.from))outgoing.set(d.from,[]);outgoing.get(d.from).push(d);}
  // Finite fixed-point traversal propagates possible/conditional reachability.
  // A separate certain path can promote a previously uncertain file.
  const reach=new Map(),sourceReach=new Map(),pending=[];function mark(path,level,source){if(!fileMap.has(path))return;if((reach.get(path)||0)<level)reach.set(path,level);if(source&&(sourceReach.get(path)||0)<level){sourceReach.set(path,level);pending.push({path,level});}}
  if(entryRecord)mark(doc.entry,2,!/\.lua$/i.test(doc.entry));if(doc.build.chrPath)mark(doc.build.chrPath,2,false);
  for(let at=0;at<pending.length;at++){const node=pending[at];for(const dep of outgoing.get(node.path)||[]){if(++graphSteps>LIMITS.graphSteps){limited('graph-limit','Dependency graph traversal reached its bounded work limit.');pending.length=at+1;break;}if(dep.status==='present')mark(dep.path,node.level===2&&!dep.uncertain?2:1,dep.kind==='include');}}
  for(const f of files)f.reachability=f.path===doc.entry?'entry':reach.get(f.path)===2?'reachable':reach.get(f.path)===1?'uncertain':'unreferenced';
  for(const d of dependencies){if(d.from===null)continue;const level=sourceReach.get(d.from)||0;d.reachability=level?(level===2&&!d.uncertain?'reachable':'uncertain'):'unreferenced';if(level===1)d.uncertain=true;}
  // DFS over each file is bounded by inventory + edge caps, never expansion.
  const color=new Map(),stack=[];function visit(name){if(color.get(name)||graphSteps>LIMITS.graphSteps)return;color.set(name,1);stack.push(name);for(const dep of outgoing.get(name)||[]){if(dep.kind!=='include'||dep.status!=='present')continue;if(++graphSteps>LIMITS.graphSteps){limited('graph-limit','Cycle inspection reached its bounded work limit.',dep.from,dep.line);break;}if(color.get(dep.path)===1){const cycle=stack.slice(stack.indexOf(dep.path)).concat(dep.path),display=cycle.slice(0,8).join(' → ')+(cycle.length>8?' → … ('+(cycle.length-8)+' more paths)':'');diagnostic(dep.uncertain||declared.dialect!=='forge-6502-v1'?'warning':'error','include-cycle','Lexical include cycle: '+display+'. Conditional and macro expansion are not evaluated.',dep.from,dep.line);}else visit(dep.path);}stack.pop();color.set(name,2);}
  for(const file of files)visit(file.path);
  if(truncated&&diagnostics.length>=LIMITS.diagnostics)diagnostics[LIMITS.diagnostics-1]={severity:'warning',code:'diagnostic-limit',message:'Additional findings were omitted after the diagnostic cap; this report is incomplete.',path:null,line:null};
  const status=truncated?'incomplete':diagnostics.some(d=>d.severity==='error')?'blocked':diagnostics.some(d=>d.severity==='warning')?'needs-review':'no-known-blockers';
  return freeze({format:'NESForgeSourceIntakeReport',version:1,method:'source-intake-1',declared,workspace,sourceIdentity,files,dependencies,diagnostics,assessment:{scope:'syntactic-only',status,buildVerified:false,sourceExecuted:false,sourceTranslated:false},coverage:{inventoryFiles:files.length,assemblyFiles:files.filter(f=>f.scanned).length,scannedLines:lineCount,dependencyEdges:dependencies.length,entry:doc.entry,complete:!truncated},resolution:{profile:'workspace-relative-case-sensitive',base:'Each literal path resolves relative to its containing file within this workspace.',foreignSearchPathsEvaluated:false,conditionalExpansionEvaluated:false,macroExpansionEvaluated:false,repetitionExpansionEvaluated:false,linkerConfigurationEvaluated:false},limits:{...ws.limits,...LIMITS},truncated,limitations:['File inventory and lexical dependencies do not establish a complete build graph. The selected entry is declared, not inferred from build scripts.','Conditional branches, macro and repetition expansion, external search paths, generated files, linker configuration and host scripts are not executed or interpreted.','Symbol resolution, addressing modes, expression ranges, layout, vectors and output correctness require a separate existing Forge source build; this report does not verify them.','Foreign dialect declarations are metadata and are not translated into Forge syntax. No generated-gameplay or Audio Runtime integration is performed.']});
}
services.SourceIntake=Object.freeze({format:'NESForgeSourceIntakeReport',version:1,dialects:DIALECTS,limits:LIMITS,analyze});
})();
