/*
 * NES FORGE MODULE: src/services/recovery-journal.js
 * Entry: Forge.services.RecoveryJournal
 * Purpose: durable storage for crash recovery of the open project. It replaces the single whole-project recovery
 *   record that was written every 30 s (and that could not finish when a large project's tab closed).
 *   - Each browser tab is a session. A session's recovery point is a head record listing the project's sections
 *     (top-level fields and one section per scene) by content hash; the section texts are blobs keyed by session and
 *     hash. Writing a new point stores only the sections that changed, and the head and its new blobs are written in
 *     one IndexedDB transaction: a point is either complete or absent, never partial. The head keeps the previous
 *     point too, so a damaged section can fall back to it.
 *   - A synchronous localStorage tail covers the moment the tab closes while a write is still in flight: the changed
 *     sections, with their hashes, written during pagehide/beforeunload/visibilitychange.
 *   - A synchronous localStorage marker records every edit's sequence number, so a restore can tell whether changes
 *     made after the recovered point existed (and how many), instead of claiming success.
 *   - Web Locks mark live sessions, so one tab never offers another open tab's work as "recovery".
 *   Project-specific orchestration (what a section is, when to write, restore and messages) lives in ProjectStore.
 * Bundle order: before src/services/project-store.js.
 */
(()=>{
'use strict';
const F=window.Forge=window.Forge||{};F.services=F.services||{};
const DB='nes-forge-recovery-journal',VERSION=1,HEADS='heads',BLOBS='blobs',LS='forge.recovery.',LOCK='nes-forge-session:';
// 2 x 53-bit hashes plus the length: change detection and integrity checks for the user's own data (not a security hash).
function cyrb53(text,seed){let h1=0xdeadbeef^seed,h2=0x41c6ce57^seed;for(let i=0,ch;i<text.length;i++){ch=text.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677);}
  h1=Math.imul(h1^(h1>>>16),2246822507);h1^=Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507);h2^=Math.imul(h1^(h1>>>13),3266489909);return 4294967296*(2097151&h2)+(h1>>>0);}
const hash=text=>text.length.toString(36)+'-'+cyrb53(text,1).toString(36)+'-'+cyrb53(text,7).toString(36);
const session=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
let dbPromise=null;
function open(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined')return reject(Error('IndexedDB is not available in this browser'));
    const req=indexedDB.open(DB,VERSION);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(HEADS))db.createObjectStore(HEADS,{keyPath:'session'});if(!db.objectStoreNames.contains(BLOBS))db.createObjectStore(BLOBS,{keyPath:'id'});};
    req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();dbPromise=null;};db.onclose=()=>{dbPromise=null;};resolve(db);};
    req.onerror=()=>{dbPromise=null;reject(req.error||Error('Recovery storage could not be opened'));};
    req.onblocked=()=>{};
  });
  return dbPromise;
}
const txDone=tx=>new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error||Error('Recovery write failed'));tx.onabort=()=>reject(tx.error||Error('Recovery write aborted'));});
const req=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const blobId=(s,h)=>s+'|'+h,range=s=>IDBKeyRange.bound(s+'|',s+'|￿');
// One atomic recovery point: new blobs, removed blobs and the head in a single transaction.
async function write(head,blobs=[],drop=[]){
  const db=await open(),tx=db.transaction([HEADS,BLOBS],'readwrite'),b=tx.objectStore(BLOBS);
  for(const {hash:h,text} of blobs)b.put({id:blobId(head.session,h),session:head.session,hash:h,text});
  for(const h of drop)b.delete(blobId(head.session,h));
  tx.objectStore(HEADS).put(head);
  return txDone(tx);
}
async function heads(){const db=await open(),tx=db.transaction(HEADS,'readonly');return req(tx.objectStore(HEADS).getAll());}
async function blobs(sessionId,hashes){
  const db=await open(),tx=db.transaction(BLOBS,'readonly'),store=tx.objectStore(BLOBS),out=new Map();
  await Promise.all([...new Set(hashes)].map(h=>req(store.get(blobId(sessionId,h))).then(r=>{if(r&&typeof r.text==='string')out.set(h,r.text);})));
  return out;
}
async function storedHashes(sessionId){const db=await open(),tx=db.transaction(BLOBS,'readonly');return new Set((await req(tx.objectStore(BLOBS).getAllKeys(range(sessionId)))).map(k=>String(k).slice(sessionId.length+1)));}
async function deleteSession(sessionId){
  const db=await open(),tx=db.transaction([HEADS,BLOBS],'readwrite');
  tx.objectStore(HEADS).delete(sessionId);tx.objectStore(BLOBS).delete(range(sessionId));
  await txDone(tx);local.clear(sessionId);return true;
}
// localStorage: synchronous, so it survives a tab closing mid-write; small records only.
const local={
  key:(kind,s)=>LS+kind+'.'+s,
  get(kind,s){try{const v=localStorage.getItem(this.key(kind,s));return v?JSON.parse(v):null;}catch(_){return null;}},
  set(kind,s,value){try{localStorage.setItem(this.key(kind,s),JSON.stringify(value));return true;}catch(_){return false;}},
  remove(kind,s){try{localStorage.removeItem(this.key(kind,s));}catch(_){/* storage unavailable */}},
  clear(s){this.remove('marker',s);this.remove('tail',s);this.remove('end',s);},
  sessions(){const out=new Set();try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(LS)){const m=/^forge\.recovery\.(?:marker|tail|end)\.(.+)$/.exec(k);if(m)out.add(m[1]);}}}catch(_){}return out;}
};
const marker={write:(s,value)=>local.set('marker',s,value),read:s=>local.get('marker',s)};
// Written only when the page is really going away (pagehide): evidence that the session ended normally, with its last
// change count. Without it (browser killed, crash) a restore cannot confirm that nothing was lost in the last moments.
const end={write:(s,value)=>local.set('end',s,value),read:s=>local.get('end',s),clear:s=>local.remove('end',s)};
const tail={write:(s,value)=>local.set('tail',s,value),read:s=>{try{const v=localStorage.getItem(local.key('tail',s));if(!v)return {value:null};return {value:JSON.parse(v)};}catch(e){return {value:null,problem:'the close-time record was unreadable ('+e.message+')'};}},
  clearIfCovered(s,editSeq){const t=local.get('tail',s);if(t&&t.editSeq<=editSeq)local.remove('tail',s);}};
// Live sessions: each tab holds a Web Lock for its lifetime. Without Web Locks, a head written in the last 20 s counts as live.
const locks=typeof navigator!=='undefined'&&navigator.locks&&typeof navigator.locks.request==='function'?navigator.locks:null;
function hold(){if(!locks)return false;try{locks.request(LOCK+session,{mode:'exclusive'},()=>new Promise(()=>{})).catch(()=>{});return true;}catch(_){return false;}}
async function liveSessions(allHeads){
  if(locks){try{const q=await locks.query();return new Set([...(q.held||[]),...(q.pending||[])].map(l=>l.name).filter(n=>n?.startsWith(LOCK)).map(n=>n.slice(LOCK.length)));}catch(_){/* fall through */}}
  const now=Date.now();return new Set((allHeads||[]).filter(h=>now-(h.aliveAt||h.at||0)<20000).map(h=>h.session));
}
F.services.RecoveryJournal=Object.freeze({database:DB,session,hash,open,write,heads,blobs,storedHashes,deleteSession,local,marker,tail,end,hold,liveSessions,usesLocks:!!locks});
})();
