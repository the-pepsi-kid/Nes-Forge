'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const {WorldError,validateWorld,createWorld}=require('./domain.cjs');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function encode(state) { const payload=JSON.stringify(state);return JSON.stringify({format:'NESForgeHostedSnapshot',version:1,sha256:hash(payload),payload})+'\n'; }
function decode(bytes) {
  let envelope,state;try {envelope=JSON.parse(bytes);if(envelope.format!=='NESForgeHostedSnapshot'||envelope.version!==1||typeof envelope.payload!=='string'||envelope.sha256!==hash(envelope.payload))throw Error();state=JSON.parse(envelope.payload);}catch {throw new WorldError('storage','Snapshot is malformed or its checksum does not match. Refusing to reset the World.',500);}
  validateWorld(state.world);if(state.format!=='NESForgeHostedState'||state.version!==1||!state.sessions||!state.receipts||typeof state.sessions!=='object'||typeof state.receipts!=='object'||Array.isArray(state.sessions)||Array.isArray(state.receipts))throw new WorldError('storage','Unsupported service state.',500);
  for(const [id,session] of Object.entries(state.sessions))if(id!==session.id||!Object.hasOwn(state.world.players,session.playerId)||! /^[a-f0-9]{64}$/.test(session.tokenHash))throw new WorldError('storage','Invalid stored session.',500);
  return state;
}
async function atomicWrite(filename,bytes) {
  const temporary=filename+'.tmp-'+crypto.randomBytes(8).toString('hex');let file;
  try {file=await fs.open(temporary,'wx',0o600);await file.writeFile(bytes);await file.sync();await file.close();file=null;await fs.rename(temporary,filename);
    // fsync directory where the platform supports it; a failed sync blocks the
    // caller rather than acknowledging an outcome of uncertain durability.
    const directory=await fs.open(path.dirname(filename),'r');try{await directory.sync();}finally{await directory.close();}
  } finally {if(file)await file.close().catch(()=>{});await fs.unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
}
class Store {
  static async open(directory,options={}) {
    const store=new Store();store.directory=path.resolve(directory);store.filename=path.join(store.directory,'world.json');store.lockPath=path.join(store.directory,'world.lock');store.queue=Promise.resolve();store.closed=false;store.poisoned=false;
    await fs.mkdir(store.directory,{recursive:true,mode:0o700});
    // An exclusive lock prevents separate local server processes from issuing
    // conflicting snapshots. A same-host dead PID may be reclaimed after crash.
    try {store.lock=await fs.open(store.lockPath,'wx',0o600);} catch(error) {
        if(error.code!=='EEXIST')throw error;let old;
        // Serialize stale-lock recovery. Re-read only after acquiring this
        // guard, so two restart processes cannot unlink one another's lock.
        const recoveryPath=store.lockPath+'.recovery';let recovery;
        try{recovery=await fs.open(recoveryPath,'wx',0o600);}catch{throw new WorldError('locked','Another restart is recovering this World lock.',409);}
        try {
          try{old=JSON.parse(await fs.readFile(store.lockPath,'utf8'));}catch{throw new WorldError('locked','World lock cannot be verified. Stop the other server and inspect world.lock.',409);}
          if(old.host!==os.hostname()||!Number.isSafeInteger(old.pid)||old.pid<1)throw new WorldError('locked','World is locked by another or unverifiable host.',409);
          let alive=true;try{process.kill(old.pid,0);}catch(e){if(e.code==='ESRCH')alive=false;}
          if(alive)throw new WorldError('locked','World is already open by a running process.',409);
          await fs.unlink(store.lockPath);store.lock=await fs.open(store.lockPath,'wx',0o600);
        } finally {await recovery.close();await fs.unlink(recoveryPath);}
    }
    try {await store.lock.writeFile(JSON.stringify({pid:process.pid,host:os.hostname()}));await store.lock.sync();
      try{const stat=await fs.stat(store.filename);if(stat.size>16*1024*1024)throw new WorldError('storage','Snapshot exceeds the reference storage budget.',500);store.state=decode(await fs.readFile(store.filename,'utf8'));}
      catch(error){if(error.code!=='ENOENT')throw error;store.state={format:'NESForgeHostedState',version:1,world:createWorld(options),sessions:{},receipts:{}};await atomicWrite(store.filename,encode(store.state));}
      return store;
    } catch(error) {await store.close();throw error;}
  }
  transact(fn) {
    if(this.closed||this.poisoned)return Promise.reject(new WorldError('storage','Store is closed or requires restart after a write failure.',503));
    const job=this.queue.then(async()=>{
      if(this.closed||this.poisoned)throw new WorldError('storage','Store is unavailable.',503);
      const draft=JSON.parse(JSON.stringify(this.state)),result=await fn(draft);
      if(result&&result.readOnly)return result.value;
      validateWorld(draft.world);const bytes=encode(draft);if(Buffer.byteLength(bytes)>16*1024*1024)throw new WorldError('capacity','Snapshot capacity reached.',409);
      try{await atomicWrite(this.filename,bytes);}catch(error){this.poisoned=true;throw error;}
      this.state=draft;return result;
    });this.queue=job.catch(()=>{});return job;
  }
  async read(fn) {await this.queue;if(this.closed||this.poisoned)throw new WorldError('storage','Store is unavailable.',503);return fn(this.state);}
  async close() {await this.queue;this.closed=true;if(this.lock){await this.lock.close();this.lock=null;await fs.unlink(this.lockPath).catch(error=>{if(error.code!=='ENOENT')throw error;});}}
}
module.exports={Store,encode,decode,atomicWrite,hash};
