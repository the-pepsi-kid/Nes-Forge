'use strict';
// Node-only loader for the fixed, stored ZIP corpus. Browser ZIP intake is not
// involved: its historical junk-file filtering intentionally omits two tracked
// upstream files, while this source-preservation fixture retains every byte.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function storedEntries(bytes){
 const out=new Map();let at=0;
 while(at+30<=bytes.length&&bytes.readUInt32LE(at)===0x04034b50){
  const flags=bytes.readUInt16LE(at+6),method=bytes.readUInt16LE(at+8),length=bytes.readUInt32LE(at+18),size=bytes.readUInt32LE(at+22),names=bytes.readUInt16LE(at+26),extra=bytes.readUInt16LE(at+28),start=at+30+names+extra;
  if(flags&9||method!==0||length!==size||start+size>bytes.length)throw Error('Corpus requires a complete unencrypted stored ZIP.');
  const name=bytes.subarray(at+30,at+30+names).toString('utf8');
  if(out.has(name)||name.startsWith('/')||name.split('/').includes('..'))throw Error('Unsafe or duplicate corpus entry.');
  out.set(name,bytes.subarray(start,start+size));at=start+size;
 }
 if(!out.size||bytes.readUInt32LE(at)!==0x02014b50)throw Error('Corpus central directory is missing.');
 return out;
}
function readDabgInput(){
 const folder=path.join(root,'tests/fixtures/source-intake'),receipt=JSON.parse(fs.readFileSync(path.join(folder,'DABG-pinned-input.json'))),bytes=fs.readFileSync(path.join(folder,receipt.archive));
 if(bytes.length!==receipt.byteLength||sha(bytes)!==receipt.sha256)throw Error('Pinned corpus ZIP identity changed.');
 const entries=storedEntries(bytes),manifestBytes=entries.get('Fixture_Manifest.json');
 if(sha(manifestBytes)!==receipt.manifestSha256)throw Error('Pinned corpus manifest identity changed.');
 const manifest=JSON.parse(manifestBytes),pinned=JSON.parse(entries.get('metadata/Source_Files.json'));
 if(entries.size!==manifest.files.length+1)throw Error('Corpus has missing or undeclared members.');
 for(const item of manifest.files){const data=entries.get(item.path);if(!data||data.length!==item.byteLength||sha(data)!==item.sha256)throw Error('Corpus member mismatch: '+item.path);}
 const files=pinned.files.map(item=>{const data=entries.get('source/DABG/'+item.path);if(!data||data.length!==item.byteLength||sha(data)!==item.sha256)throw Error('Upstream source mismatch: '+item.path);return {path:item.path,bytes:new Uint8Array(data)};});
 if(files.length!==receipt.sourceFileCount||files.reduce((n,file)=>n+file.bytes.length,0)!==receipt.sourceBytes)throw Error('Pinned source inventory mismatch.');
 return {receipt,manifest,pinned,entries,files};
}
function dabgWorkspace(m,input=readDabgInput()){return m.create(input.files,{entry:'dabg.s',build:{prgBytes:32768,mirroring:'horizontal'}});}
module.exports={readDabgInput,dabgWorkspace,storedEntries,sha};
