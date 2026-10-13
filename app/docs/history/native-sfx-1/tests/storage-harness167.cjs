'use strict';
// Storage scheduling adapter only. The release application is executed unchanged
// by harness.cjs. This models controlled completion order, not browser IndexedDB
// durability, quota, transaction scheduling, native file pickers, or DOM layout.
const {loadForge}=require('./harness.cjs');
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
async function settle(){for(let i=0;i<16;i++)await Promise.resolve();}
function storageEnvironment({local={},recovery=null,holdReads=false,holdWrites=false,holdOpens=false,failOpen=false}={}){
  const values=new Map(Object.entries(local)),records=new Map(),pending=[],operations=[],intervals=new Map();
  const control={holdReads,holdWrites,holdOpens,failOpen,failDeletes:false,nextId:100};
  let intervalId=0,opened=0,closed=0;
  function store(name){if(!records.has(name))records.set(name,new Map());return records.get(name);}
  if(recovery)store('recovery').set('autosave',clone(recovery));
  function schedule(kind,detail,complete){const op={kind,...detail,complete,done:false};operations.push(op);const run=()=>{if(op.done)return;op.done=true;complete();};op.run=run;if((kind==='open'&&control.holdOpens)||(kind==='get'&&control.holdReads)||(['put','delete'].includes(kind)&&control.holdWrites))pending.push(op);else queueMicrotask(run);return op;}
  const database={objectStoreNames:{contains:()=>true},createObjectStore(){},close(){closed++;},transaction(name,mode){
    const tx={error:null,objectStore(){return {
      get(key){const req={};schedule('get',{store:name,key,mode},()=>{req.result=clone(store(name).get(key));req.onsuccess?.({target:req});tx.oncomplete?.();});return req;},
      put(value){const record=clone(value),key=record.key??record.id??control.nextId++;if(record.key==null)record.id=key;const req={};schedule('put',{store:name,key,record,mode},()=>{store(name).set(key,record);req.result=key;req.onsuccess?.({target:req});tx.oncomplete?.();});return req;},
      delete(key){const req={};schedule('delete',{store:name,key,mode},()=>{if(control.failDeletes){tx.error=new Error('Recovery delete denied by test adapter');tx.onerror?.({target:tx});return;}store(name).delete(key);req.onsuccess?.({target:req});tx.oncomplete?.();});return req;},
    };}};return tx;
  }};
  const environment={
    indexedDB:{open(){const req={};schedule('open',{},()=>{if(control.failOpen){req.error=new Error('Storage denied by test adapter');req.onerror?.({target:req});}else{opened++;req.result=database;req.onsuccess?.({target:req});}});return req;}},
    localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)},
    setInterval(fn,delay){const id=++intervalId;intervals.set(id,{fn,delay});return id;},clearInterval(id){intervals.delete(id);},
  };
  return {environment,control,values,records,operations,intervals,database,
    count:kind=>operations.filter(op=>op.kind===kind).length,
    waiting:kind=>pending.filter(op=>!op.done&&(!kind||op.kind===kind)),
    release(kind,count=Infinity){let n=0;for(const op of pending)if(!op.done&&op.kind===kind&&n++<count)op.run();},
    seedRecovery(record){store('recovery').set('autosave',clone(record));},
    recovery:()=>clone(store('recovery').get('autosave')),
    connections:()=>({opened,closed}),
  };
}
function loadStoredForge(html,options={}){const storage=storageEnvironment(options);const h=loadForge(html,{environment:storage.environment});return Object.assign(h,{storage});}
module.exports={settle,storageEnvironment,loadStoredForge};
