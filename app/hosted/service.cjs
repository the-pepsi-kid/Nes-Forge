'use strict';
const crypto=require('node:crypto');
const {PROFILE,WorldError,clone,fields,identifier,integer,addPlayer,reduce,project}=require('./domain.cjs');
const {hash}=require('./store.cjs');
function canonical(value) {if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';}
function authenticate(state,token) {
  if(typeof token!=='string'||! /^[a-f0-9]{64}$/.test(token))throw new WorldError('auth','A valid session bearer token is required.',401);
  const digest=Buffer.from(hash(token),'hex');for(const session of Object.values(state.sessions))if(crypto.timingSafeEqual(Buffer.from(session.tokenHash,'hex'),digest))return session;
  throw new WorldError('auth','Session is unknown.',401);
}
class WorldService {
  constructor(store){this.store=store;}
  async join(request) {
    fields(request,['name'],'Join request');const token=crypto.randomBytes(32).toString('hex'),id='session-'+crypto.randomUUID(),playerId='player-'+crypto.randomUUID();
    return this.store.transact(state=>{state.world=addPlayer(state.world,{id:playerId,name:request.name});state.sessions[id]={id,playerId,tokenHash:hash(token)};
      return {session:{id,playerId,token},projection:project(state.world,playerId)};});
  }
  snapshot(token) {return this.store.read(state=>{const session=authenticate(state,token);return {session:{id:session.id,playerId:session.playerId},projection:project(state.world,session.playerId)};});}
  async intent(token,envelope) {
    fields(envelope,['version','requestId','baseRevision','intent'],'Intent envelope');if(envelope.version!==1)throw new WorldError('version','Intent envelope version must be 1.');
    identifier(envelope.requestId,'Request ID');integer(envelope.baseRevision,0,Number.MAX_SAFE_INTEGER,'Base revision');const digest=hash(canonical(envelope));
    return this.store.transact(state=>{
      const session=authenticate(state,token),key=session.id+':'+envelope.requestId;
      if(Object.hasOwn(state.receipts,key)) {
        const previous=state.receipts[key];if(previous.digest!==digest)throw new WorldError('idempotency','Request ID was already used with different content.',409);
        return {readOnly:true,value:clone(previous.result)};
      }
      if(Object.keys(state.receipts).length>=PROFILE.maxReceipts)throw new WorldError('capacity','Receipt capacity reached; no old receipt is evicted. Archive this reference World.',409);
      let result;
      try {
        if(envelope.baseRevision!==state.world.revision)throw new WorldError('stale','World revision changed. Refresh and use a new request ID.',409);
        const changed=reduce(state.world,session.playerId,envelope.intent);state.world=changed.world;
        result={accepted:true,requestId:envelope.requestId,revision:state.world.revision,event:changed.event};
      } catch(error) {if(!(error instanceof WorldError))throw error;result={accepted:false,requestId:envelope.requestId,revision:state.world.revision,error:{code:error.code,message:error.message,status:error.status}};}
      // Receipt and mutation are one fsync/rename transaction. A retry after a
      // lost HTTP response returns the same outcome, including across restart.
      state.receipts[key]={digest,result};return clone(result);
    });
  }
}
module.exports={WorldService,authenticate,canonical};
