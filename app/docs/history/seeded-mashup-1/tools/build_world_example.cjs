#!/usr/bin/env node
'use strict';
// Build the external editable example through the complete supplied application.
// No example or test helper is added to the production source manifest.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const {loadForge}=require('../tests/harness.cjs');
const {worldProject}=require('../tests/world-fixtures170.cjs');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'),'utf8'));
const h=loadForge(path.join(root,manifest.output));
h.context.example=worldProject();h.context.example.projectName='Scout World Traversal';
h.run('db_deserializeState(example)');
const source=h.json('Forge.services.ProjectStore.capture()');
const artifact=h.run('Forge.services.RuntimeCompiler.compile()',20000);
const base=path.join(root,'examples/Scout_World_Traversal_1.7');
fs.writeFileSync(base+'.nesforge.json',JSON.stringify(source,null,2)+'\n');
fs.writeFileSync(base+'.nes',artifact.rom);
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const report={release:'1.7',htmlSha256:hash(fs.readFileSync(path.join(root,manifest.output))),project:path.relative(root,base+'.nesforge.json'),rom:path.relative(root,base+'.nes'),romSha256:hash(artifact.rom),romBytes:artifact.rom.length,engineBytes:artifact.world.dataEnd-0x8000,sourceRecordBytes:artifact.metadata.sourceRecordBytes,worlds:artifact.world.spec.worlds.length,screens:artifact.world.spec.screens.length};
fs.writeFileSync(base+'.build.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
