'use strict';
// Transport-independent ordinary-item reference profile. No emulator memory,
// cryptocurrency or client-reported combat outcome is authoritative here.
const crypto = require('node:crypto');
const PROFILE = Object.freeze({id:'forge-hosted-local-v1', width:16, height:15,
  maxPlayers:32, maxItems:256, inventorySlots:8, chestSlots:16,
  actorSlots:12, persistentBytes:64, maxReceipts:4096, maxEvents:256});
class WorldError extends Error {
  constructor(code, message, status=422) { super(message); this.code=code; this.status=status; }
}
const fail = (code,message,status) => { throw new WorldError(code,message,status); };
const clone = value => JSON.parse(JSON.stringify(value));
const has = (object,key) => Object.hasOwn(object,key);
function object(value,label) { if(!value||typeof value!=='object'||Array.isArray(value)) fail('invalid',label+' must be an object.'); return value; }
function fields(value, allowed, label='Object') { object(value,label); for(const key of Object.keys(value)) if(!allowed.includes(key)) fail('invalid',label+' has an unknown field: '+key); }
function identifier(value,label='ID') { if(typeof value!=='string'||!/^[-a-zA-Z0-9_:]{1,96}$/.test(value)||['__proto__','constructor','prototype'].includes(value)) fail('invalid',label+' is invalid.'); return value; }
function integer(value,min,max,label) { if(!Number.isSafeInteger(value)||value<min||value>max) fail('invalid',label+' must be an integer from '+min+' to '+max+'.'); return value; }
function definitions() { return {
  blade:{id:'blade',version:1,name:'Training blade',kind:'equipment',slot:'hand',power:1,consumable:false},
  berry:{id:'berry',version:1,name:'Berry',kind:'consumable',heal:2,consumable:true},
  potion:{id:'potion',version:1,name:'Potion',kind:'consumable',heal:5,consumable:true}
}; }
function createWorld({id='demo-world',name='Forge local item workshop',acceptedIssuers={}}={}) {
  identifier(id,'World ID'); if(typeof name!=='string'||!name.trim()||name.length>80) fail('invalid','World name is invalid.');
  object(acceptedIssuers,'Accepted issuers'); const accepted=clone(acceptedIssuers);
  for(const [issuer,policy] of Object.entries(accepted)) {
    identifier(issuer,'Issuer'); fields(policy,['publicKey','definitions'],'Issuer policy'); object(policy.definitions,'Definition mappings');
    try { if(crypto.createPublicKey(policy.publicKey).asymmetricKeyType!=='ed25519') throw Error(); } catch { fail('invalid','Issuer public key must be Ed25519.'); }
    for(const [remote,local] of Object.entries(policy.definitions)) { if(!/^[-a-zA-Z0-9_:]{1,96}@\d+$/.test(remote)||!has(definitions(),local)) fail('invalid','Issuer definition mapping is invalid.'); }
  }
  return {format:'NESForgeHostedWorld',version:1,profile:PROFILE.id,id,name,revision:0,
    definitions:definitions(),acceptedIssuers:accepted,players:{},items:{
      'welcome-blade':{id:'welcome-blade',issuerWorld:id,definitionId:'blade',definitionVersion:1,localDefinitionId:'blade',quantity:1,claimId:'world-start-blade',owner:{kind:'ground',x:1,y:0},origin:null}
    },claims:{'world-start-blade':'welcome-blade'},nextItem:1,events:[]};
}
function inventory(world,playerId,kind='inventory') { return Object.values(world.items).filter(item=>item.quantity>0&&item.owner.kind===kind&&item.owner.playerId===playerId); }
function player(world,id) { identifier(id,'Player ID'); if(!has(world.players,id)) fail('player_missing','Player does not exist.',404); return world.players[id]; }
function item(world,id) { identifier(id,'Item ID'); if(!has(world.items,id)||world.items[id].quantity===0) fail('item_missing','Item does not exist or has been consumed.',404); return world.items[id]; }
function adjacent(a,b) { return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<=1; }
function slots(world,playerId,kind='inventory') { if(inventory(world,playerId,kind).length>=(kind==='inventory'?PROFILE.inventorySlots:PROFILE.chestSlots)) fail('capacity',kind+' has no free slot.',409); }
function owned(world,playerId,itemId,kind='inventory') { const value=item(world,itemId); if(value.owner.kind!==kind||value.owner.playerId!==playerId) fail('not_owner','That item is not in your '+kind+'.',409); return value; }
function unequip(world,value) { if(value.owner.playerId&&has(world.players,value.owner.playerId)) { const p=world.players[value.owner.playerId]; if(p.equipped===value.id)p.equipped=null; } }
function issue(world,playerId,definitionId,quantity,claimId,origin=null) {
  if(has(world.claims,claimId)) fail('already_claimed','This issuance claim has already been accepted.',409);
  if(Object.keys(world.items).length>=PROFILE.maxItems) fail('capacity','This reference World has reached its item-record capacity.',409);
  slots(world,playerId); const local=world.definitions[definitionId], id='item-'+world.nextItem++;
  const value={id,issuerWorld:origin?origin.issuerWorld:world.id,definitionId:origin?origin.definitionId:definitionId,
    definitionVersion:origin?origin.definitionVersion:local.version,localDefinitionId:definitionId,quantity,claimId,
    owner:{kind:'inventory',playerId},origin}; world.items[id]=value; world.claims[claimId]=id; return value;
}
function consume(world,value,amount=1) { value.quantity-=amount; if(!value.quantity) { unequip(world,value); value.owner={kind:'consumed'}; } }
function addPlayer(world,{id,name}) {
  identifier(id,'Player ID'); if(has(world.players,id)) fail('exists','Player already exists.',409);
  if(Object.keys(world.players).length>=PROFILE.maxPlayers) fail('capacity','Player capacity reached.',409);
  if(typeof name!=='string'||!name.trim()||name.length>32||/[\x00-\x1f\x7f]/.test(name)) fail('invalid','Player name must be 1–32 printable characters.');
  const next=clone(world); next.players[id]={id,name:name.trim(),x:0,y:0,health:5,maxHealth:10,coins:10,equipped:null};
  next.revision++; return next;
}
function voucherMessage(voucher) {
  fields(voucher,['issuerWorld','destinationWorld','playerId','sourceItemId','claimId','definitionId','definitionVersion','quantity'],'Voucher');
  for(const key of ['issuerWorld','destinationWorld','playerId','sourceItemId','claimId','definitionId']) identifier(voucher[key],key);
  integer(voucher.definitionVersion,1,65535,'Definition version'); integer(voucher.quantity,1,99,'Quantity');
  return JSON.stringify(['NESForgeOrdinaryItemVoucher',1,voucher.issuerWorld,voucher.destinationWorld,voucher.playerId,voucher.sourceItemId,voucher.claimId,voucher.definitionId,voucher.definitionVersion,voucher.quantity]);
}
const ACTION_FIELDS={move:['dx','dy'],pickup:['itemId'],drop:['itemId'],store:['itemId'],retrieve:['itemId'],equip:['itemId'],use:['itemId'],transfer:['itemId','toPlayerId'],gather:['resourceId'],buy:['offerId'],craft:['recipeId'],importVoucher:['voucher','signature']};
function reduce(world,playerId,intent) {
  fields(intent,['type','payload'],'Intent'); if(!has(ACTION_FIELDS,intent.type)) fail('unsupported','Unsupported intent type.');
  fields(intent.payload,ACTION_FIELDS[intent.type],'Intent payload'); const next=clone(world), p=player(next,playerId), payload=intent.payload;
  let changedItem=null, event={type:'world.delta',action:intent.type,playerId};
  switch(intent.type) {
    case 'move': {
      integer(payload.dx,-1,1,'dx'); integer(payload.dy,-1,1,'dy'); if(Math.abs(payload.dx)+Math.abs(payload.dy)!==1) fail('movement','Move exactly one cardinal cell.');
      const x=p.x+payload.dx,y=p.y+payload.dy; if(x<0||x>=PROFILE.width||y<0||y>=PROFILE.height) fail('movement','Outside this World.');
      p.x=x;p.y=y; event.type='actor.state'; break;
    }
    case 'pickup': {
      const value=item(next,payload.itemId); if(value.owner.kind!=='ground') fail('unavailable','Item has already left the ground.',409);
      if(!adjacent(p,value.owner)) fail('range','Item is outside interaction range.',409); slots(next,playerId);
      value.owner={kind:'inventory',playerId};changedItem=value;event.type='inventory.update';break;
    }
    case 'drop': { const value=owned(next,playerId,payload.itemId);unequip(next,value);value.owner={kind:'ground',x:p.x,y:p.y};changedItem=value;break; }
    case 'store': case 'retrieve': {
      if(!adjacent(p,{x:1,y:1})) fail('range','Move next to the chest at (1, 1).',409);
      const from=intent.type==='store'?'inventory':'chest',to=intent.type==='store'?'chest':'inventory',value=owned(next,playerId,payload.itemId,from);
      slots(next,playerId,to);unequip(next,value);value.owner={kind:to,playerId};changedItem=value;event.type='inventory.update';break;
    }
    case 'equip': { const value=owned(next,playerId,payload.itemId);if(next.definitions[value.localDefinitionId].kind!=='equipment')fail('kind','Only equipment can be equipped.');p.equipped=value.id;changedItem=value;break; }
    case 'use': {
      const value=owned(next,playerId,payload.itemId),definition=next.definitions[value.localDefinitionId];if(!definition.consumable)fail('kind','This item cannot be consumed.');
      if(p.health===p.maxHealth)fail('health','Health is already full.',409);p.health=Math.min(p.maxHealth,p.health+definition.heal);consume(next,value);changedItem=value;break;
    }
    case 'transfer': {
      const value=owned(next,playerId,payload.itemId),target=player(next,payload.toPlayerId);if(target.id===playerId)fail('invalid','Choose a different recipient.');
      if(!adjacent(p,target))fail('range','Recipient is outside trade range.',409);slots(next,target.id);unequip(next,value);value.owner={kind:'inventory',playerId:target.id};changedItem=value;event.type='inventory.update';break;
    }
    case 'gather': {
      if(payload.resourceId!=='berry-bush')fail('resource','Unknown resource.');if(!adjacent(p,{x:0,y:1}))fail('range','Move next to the berry bush at (0, 1).',409);
      changedItem=issue(next,playerId,'berry',1,'gather:berry-bush:'+playerId);event.type='item.issued';break;
    }
    case 'buy': {
      if(payload.offerId!=='berry-for-2')fail('offer','Unknown vendor offer.');if(!adjacent(p,{x:1,y:1}))fail('range','Move next to the vendor at (1, 1).',409);
      if(p.coins<2)fail('funds','Insufficient ordinary game coins.',409);changedItem=issue(next,playerId,'berry',1,'vendor:'+next.nextItem);p.coins-=2;event.type='item.issued';break;
    }
    case 'craft': {
      if(payload.recipeId!=='two-berries-potion')fail('recipe','Unknown recipe.');
      const berries=inventory(next,playerId).filter(value=>value.localDefinitionId==='berry');if(berries.reduce((sum,value)=>sum+value.quantity,0)<2)fail('ingredients','Two berries are required.',409);
      let remaining=2;for(const value of berries){const amount=Math.min(remaining,value.quantity);consume(next,value,amount);remaining-=amount;if(!remaining)break;}
      changedItem=issue(next,playerId,'potion',1,'craft:'+next.nextItem);event.type='item.issued';break;
    }
    case 'importVoucher': {
      const message=voucherMessage(payload.voucher),voucher=payload.voucher,policy=next.acceptedIssuers[voucher.issuerWorld];
      if(!has(next.acceptedIssuers,voucher.issuerWorld))fail('issuer','This World has not opted in to that issuer.',403);
      if(voucher.destinationWorld!==next.id||voucher.playerId!==playerId)fail('destination','Voucher destination/player does not match.',403);
      const mapping=policy.definitions[voucher.definitionId+'@'+voucher.definitionVersion];if(!mapping)fail('definition','This item version is not accepted by this World.',403);
      if(typeof payload.signature!=='string'||! /^[A-Za-z0-9+/]{86}==$/.test(payload.signature)||!crypto.verify(null,Buffer.from(message),policy.publicKey,Buffer.from(payload.signature,'base64')))fail('signature','Issuer signature is invalid.',403);
      // IDs may themselves contain ':'. An encoded tuple keeps distinct
      // issuer/source and issuer/claim pairs distinct across namespaces.
      const sourceClaim=JSON.stringify(['import',voucher.issuerWorld,voucher.sourceItemId]),voucherClaim=JSON.stringify(['voucher',voucher.issuerWorld,voucher.claimId]);
      if(has(next.claims,voucherClaim))fail('already_claimed','Voucher claim was already used.',409);
      changedItem=issue(next,playerId,mapping,voucher.quantity,sourceClaim,clone(voucher));next.claims[voucherClaim]=changedItem.id;event.type='item.issued';break;
    }
  }
  next.revision++;event={...event,revision:next.revision,...(changedItem?{itemId:changedItem.id}:{} )};next.events.push(event);if(next.events.length>PROFILE.maxEvents)next.events.shift();
  return {world:next,event};
}
function project(world,playerId) {
  const p=player(world,playerId),inv=inventory(world,playerId),chest=inventory(world,playerId,'chest');
  const visible=[...Object.values(world.players).filter(value=>value.id!==playerId&&Math.abs(value.x-p.x)<=4&&Math.abs(value.y-p.y)<=4).map(value=>({kind:'player',id:value.id,name:value.name,x:value.x,y:value.y})),
    ...Object.values(world.items).filter(value=>value.quantity&&value.owner.kind==='ground'&&Math.abs(value.owner.x-p.x)<=4&&Math.abs(value.owner.y-p.y)<=4).map(value=>({kind:'item',id:value.id,name:world.definitions[value.localDefinitionId].name,x:value.owner.x,y:value.owner.y}))].sort((a,b)=>a.id.localeCompare(b.id));
  const actors=[{kind:'player',id:p.id,name:p.name,x:p.x,y:p.y},...visible.slice(0,PROFILE.actorSlots-1)];
  // Explicit 64-byte host projection. These bytes are NOT written to any ROM.
  const persistent=new Array(PROFILE.persistentBytes).fill(0);persistent[0]=1;persistent[1]=p.x;persistent[2]=p.y;persistent[3]=p.health;persistent[4]=p.coins;persistent[5]=inv.length;
  const tags={blade:1,berry:2,potion:3};inv.forEach((value,index)=>{persistent[8+index*4]=tags[value.localDefinitionId];persistent[9+index*4]=value.quantity;persistent[10+index*4]=p.equipped===value.id?1:0;});
  return {format:'NESForgeHostedProjection',version:1,profile:PROFILE.id,world:{id:world.id,name:world.name,revision:world.revision,width:PROFILE.width,height:PROFILE.height},player:clone(p),
    inventory:clone(inv),chest:clone(chest),actors,persistent,
    resources:[{id:'berry-bush',x:0,y:1,available:!has(world.claims,'gather:berry-bush:'+playerId)}],chestLocation:{x:1,y:1},
    budgets:{actorSlots:PROFILE.actorSlots,actorsUsed:actors.length,actorsOmitted:Math.max(0,visible.length-(PROFILE.actorSlots-1)),persistentBytes:PROFILE.persistentBytes,inventorySlots:PROFILE.inventorySlots},
    definitions:clone(world.definitions),capability:'host-service-only; no ROM RAM mapping or cartridge network runtime'};
}
function validateWorld(world) {
  if(!world||world.format!=='NESForgeHostedWorld'||world.version!==1||world.profile!==PROFILE.id)fail('storage','Unsupported World storage format.',500);
  identifier(world.id);integer(world.revision,0,Number.MAX_SAFE_INTEGER,'Revision');integer(world.nextItem,1,Number.MAX_SAFE_INTEGER,'Next item');
  for(const key of ['players','items','claims','definitions','acceptedIssuers'])object(world[key],key);
  if(Object.keys(world.players).length>PROFILE.maxPlayers||Object.keys(world.items).length>PROFILE.maxItems)fail('storage','Stored World exceeds profile capacity.',500);
  if(JSON.stringify(world.definitions)!==JSON.stringify(definitions()))fail('storage','Unexpected item definitions.',500);
  for(const [id,p] of Object.entries(world.players)) {
    identifier(id);if(p.id!==id)fail('storage','Player key mismatch.',500);integer(p.x,0,PROFILE.width-1,'x');integer(p.y,0,PROFILE.height-1,'y');integer(p.health,0,10,'Health');integer(p.coins,0,255,'Coins');
    if(p.maxHealth!==10||inventory(world,id).length>PROFILE.inventorySlots||inventory(world,id,'chest').length>PROFILE.chestSlots)fail('storage','Stored player budget is invalid.',500);
    if(p.equipped!==null) { const v=owned(world,id,p.equipped);if(world.definitions[v.localDefinitionId].kind!=='equipment')fail('storage','Equipped item is invalid.',500); }
  }
  for(const [id,value] of Object.entries(world.items)) {
    identifier(id);if(value.id!==id||!has(world.definitions,value.localDefinitionId))fail('storage','Stored item is invalid.',500);integer(value.quantity,0,99,'Quantity');identifier(value.issuerWorld);identifier(value.definitionId);integer(value.definitionVersion,1,65535,'Item version');
    object(value.owner,'Owner');const o=value.owner;if(!['ground','inventory','chest','consumed'].includes(o.kind))fail('storage','Unknown item owner kind.',500);
    if(o.kind==='inventory'||o.kind==='chest')player(world,o.playerId);if(o.kind==='ground'){integer(o.x,0,PROFILE.width-1,'Item x');integer(o.y,0,PROFILE.height-1,'Item y');}
    if((o.kind==='consumed')!==(value.quantity===0))fail('storage','Consumed item quantity mismatch.',500);
    if(world.claims[value.claimId]!==id)fail('storage','Item issuance claim mismatch.',500);
  }
  return world;
}
module.exports={PROFILE,WorldError,fail,clone,fields,identifier,integer,createWorld,addPlayer,reduce,project,validateWorld,voucherMessage};
