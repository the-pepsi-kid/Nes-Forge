#!/usr/bin/env node
'use strict';
// Offline, exclusive backup/restore. Never silently overwrites an existing World.
const fs=require('node:fs/promises'),path=require('node:path');
const {Store,encode,decode,atomicWrite}=require('./store.cjs');
async function manage(args) {
  const [command,directory,filename]=args;
  if(!['backup','restore','check'].includes(command)||!directory||(command!=='check'&&!filename)||args.length>(command==='check'?2:3))throw Error('Usage: node hosted/manage.cjs backup DATA_DIRECTORY BACKUP.json | restore NEW_DATA_DIRECTORY BACKUP.json | check BACKUP.json');
  if(command==='check'){const state=decode(await fs.readFile(directory,'utf8'));return {valid:true,worldId:state.world.id,revision:state.world.revision};}
  if(command==='backup'){
    await fs.access(path.join(directory,'world.json'));const store=await Store.open(directory);
    try{const handle=await fs.open(filename,'wx',0o600);try{await handle.writeFile(encode(store.state));await handle.sync();}finally{await handle.close();}return {backup:path.resolve(filename),revision:store.state.world.revision};}finally{await store.close();}
  }
  const state=decode(await fs.readFile(filename,'utf8'));await fs.mkdir(directory,{mode:0o700});
  try{await atomicWrite(path.join(directory,'world.json'),encode(state));}catch(error){await fs.rmdir(directory).catch(()=>{});throw error;}
  return {restored:path.resolve(directory),revision:state.world.revision};
}
if(require.main===module)manage(process.argv.slice(2)).then(value=>process.stdout.write(JSON.stringify(value)+'\n'),error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
module.exports={manage};
