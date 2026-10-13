#!/usr/bin/env node
'use strict';
// These examples use the bundled read-only analyzer and retained workspace
// serializer/archive owner. No imported source or build script is executed.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('../tests/harness.cjs'),{readDabgInput,dabgWorkspace,sha}=require('../tests/source-intake-fixture.cjs');
const root=path.resolve(__dirname,'..'),json=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
function record(out,file){const bytes=fs.readFileSync(path.join(out,file));return {file,byteLength:bytes.length,sha256:sha(bytes)};}
async function buildExamples(htmlInput,outInput){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),html=path.resolve(htmlInput||path.join(root,manifest.output)),out=path.resolve(outInput||path.join(root,'examples/Source_Intake'));
 fs.mkdirSync(out,{recursive:true});
 const h=loadForge(html,{environment:{crypto:crypto.webcrypto}});if(h.errors.length)throw Error(h.errors.join('\n'));
 const m=h.context.Forge.services.SourceWorkspace;if(typeof m.analyze!=='function')throw Error('The bundled SourceWorkspace analyzer is required.');
 const input=readDabgInput(),outputs=[],projectBefore=h.context.Forge.services.ProjectStore.serialize();
 const cases=[
  {name:'Forge_Multifile',doc:m.example(),options:{declaredDialect:'forge-6502-v1',engine:'NES Forge workspace example',engineVersion:''},description:'Original Forge multi-file example: existing include, binary insertion and macro source are preserved.'},
  {name:'DABG_ca65',doc:dabgWorkspace(m,input),options:{declaredDialect:'ca65',engine:'Double Action Blaster Guys',engineVersion:''},description:'All 44 exact upstream files with explicit dabg.s entry. ca65 source is preserved for diagnosis; no foreign translation or build.'}
 ];
 for(const item of cases){
  const before=JSON.stringify(item.doc),archiveBefore=Buffer.from(m.archive(item.doc)),report=await m.analyze(item.doc,item.options);
  if(JSON.stringify(item.doc)!==before||!Buffer.from(m.archive(item.doc)).equals(archiveBefore)||h.context.Forge.services.ProjectStore.serialize()!==projectBefore)throw Error('Source analysis changed the supplied workspace, archive or active project.');
  const workspaceFile=item.name+'.nesforge-source.json',reportFile=item.name+'.intake.json',archiveFile=item.name+'.source.zip';
  json(path.join(out,workspaceFile),item.doc);json(path.join(out,reportFile),report);fs.writeFileSync(path.join(out,archiveFile),archiveBefore);
  const reopened=m.validate(JSON.parse(fs.readFileSync(path.join(out,workspaceFile),'utf8'))),repeated=await m.analyze(reopened,item.options);
  if(JSON.stringify(repeated)!==JSON.stringify(report)||!Buffer.from(m.archive(reopened)).equals(archiveBefore))throw Error('Workspace reopen does not reproduce its report and source archive.');
  outputs.push({name:item.name,description:item.description,declared:item.options,entry:item.doc.entry,sourceFiles:item.doc.files.length,workspace:record(out,workspaceFile),report:record(out,reportFile),archive:record(out,archiveFile),assessment:report.assessment,sourceIdentity:report.sourceIdentity,generatedRom:false});
 }
 const companions=[];
 for(const [source,file]of [['licenses/GPL-3.0.txt','DABG_GPL-3.0.txt'],['licenses/Upstream-Notices.json','DABG_Upstream_Notices.json'],['licenses/DABG-zlib.txt','DABG_Root_License.txt'],['Intake_Provenance.json','DABG_Original_Intake_Provenance.json'],['metadata/Source_Files.json','DABG_Pinned_Source_Files.json']]){fs.writeFileSync(path.join(out,file),input.entries.get(source));companions.push(record(out,file));}
 const report={format:'NESForgeSourceIntakeExamples',version:1,release:manifest.release,candidate:'source-intake-1',html:path.relative(root,html).split(path.sep).join('/'),htmlSha256:sha(fs.readFileSync(html)),input:{file:'tests/fixtures/source-intake/DABG-pinned-input.zip',...input.receipt},outputs,companions,scope:'Shipped SourceWorkspace.analyze plus retained create/validate/archive. Source bytes and active project remain unchanged; paired reports reproduce after JSON reopening with the same explicit declarations. No assembly, imported build-script execution, source translation, foreign ROM generation or browser acceptance.'};
 json(path.join(out,'Manifest.json'),report);
 fs.writeFileSync(path.join(out,'README.txt'),[
  'NES Forge '+manifest.release+' — source-intake examples','',
  'Use Source Migration to open Forge_Multifile.nesforge-source.json or DABG_ca65.nesforge-source.json. These are source workspaces, not normal game projects.',
  'Set the declared dialect to Forge 6502 for Forge_Multifile, or ca65 for DABG_ca65, then Analyze Source. The report is a read-only inventory and syntactic dependency review.',
  'Declarations are report metadata. Workspace format/version/dialect remain the existing version-1 preservation envelope; it does not store your foreign-dialect declaration. Reselect ca65 after opening DABG_ca65. The paired .intake.json records the original explicit declaration and is an evidence report, not a file to open as a project or workspace.',
  'DABG uses dabg.s as its entry. Its unrelated file named main.s is not the upstream entry. Source files, binary assets, macros, conditionals, linker configuration and build scripts are preserved exactly. Listed literal references can be present while complete dependency resolution remains unknown.',
  'The analyzer does not run ca65, ld65, Python, batch scripts or Lua; it does not evaluate linker symbols, macro expansion, conditionals or build search paths. A diagnostic report never proves successful assembly or runtime compatibility.',
  'No ROM is generated by this example tool. The original Forge_Multifile workspace can still use the separate existing Build Source action. DABG remains foreign source requiring a later explicit adapter.',
  'Each .source.zip is the retained byte-preserving source archive: workspace JSON plus current/ and original/ files. Keep the DABG license and upstream-notice companions with redistributed DABG source. Original source has mixed notices, including GPL-3.0-or-later audio components; no original audio implementation is inserted into Forge.',
  'DABG source: NovaSquirrel/DABG, commit '+input.receipt.sourceCommit+'. All '+input.receipt.sourceFileCount+' source/assets/build-input files ('+input.receipt.sourceBytes+' bytes) match the pinned upstream inventory. Full source and notices are also in tests/fixtures/source-intake/DABG-pinned-input.zip.',
  '',
  'Regenerate with node tools/build_source_intake_examples.cjs. Manifest.json identifies the actual HTML, input, workspace, report and archive bytes.',''
 ].join('\n'));
 return report;
}
module.exports={buildExamples};
if(require.main===module)buildExamples(process.argv[2],process.argv[3]).then(report=>console.log(JSON.stringify(report,null,2))).catch(error=>{console.error(error.stack||error);process.exitCode=1;});
