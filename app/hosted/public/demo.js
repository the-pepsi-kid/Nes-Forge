'use strict';
(()=>{
const $=id=>document.getElementById(id);let session=null,projection=null,last=null,busy=false;
try{session=JSON.parse(sessionStorage.getItem('forge-hosted-session'));last=JSON.parse(sessionStorage.getItem('forge-hosted-last'));}catch{}
function status(text){$('status').textContent=text;}
function remember(){sessionStorage.setItem('forge-hosted-session',JSON.stringify(session));sessionStorage.setItem('forge-hosted-last',JSON.stringify(last));}
async function api(route,method='GET',payload){const headers={};if(session?.token)headers.Authorization='Bearer '+session.token;if(payload)headers['Content-Type']='application/json';const response=await fetch(route,{method,headers,...(payload?{body:JSON.stringify(payload)}:{})});const value=await response.json();if(!response.ok&&value.accepted===undefined)throw Error(value.error?.message||'Server request failed.');return value;}
function options(id,items,label){const select=$(id),previous=select.value;select.replaceChildren();for(const value of items){const option=document.createElement('option');option.value=value.id;option.textContent=label(value);select.append(option);}if(items.some(value=>value.id===previous))select.value=previous;}
function render(){
 if(!projection){$('identity').textContent='No player connected.';$('grid').replaceChildren();return;}
 const p=projection.player;$('worldName').textContent=projection.world.name;$('identity').textContent=p.name+' · '+p.id+' · revision '+projection.world.revision+' · health '+p.health+'/'+p.maxHealth+' · coins '+p.coins+' · equipped '+(p.equipped||'none');
 const grid=$('grid');grid.replaceChildren();for(let y=0;y<projection.world.height;y++)for(let x=0;x<projection.world.width;x++){
   const cell=document.createElement('div');cell.className='cell';const actors=projection.actors.filter(a=>a.x===x&&a.y===y),self=actors.some(a=>a.id===p.id),player=actors.find(a=>a.kind==='player'),item=actors.find(a=>a.kind==='item');
   cell.textContent=self?'P':player?'P':item?'I':x===0&&y===1?'B':x===1&&y===1?'C':'·';cell.classList.add(self?'self':player?'other':item?'item':'resource');cell.title=x+', '+y+(actors.length?': '+actors.map(a=>a.name||a.id).join(', '):'');grid.append(cell);
 }
 options('ground',projection.actors.filter(a=>a.kind==='item'),i=>i.name+' · '+i.id+' at '+i.x+', '+i.y);
 options('inventory',projection.inventory,i=>projection.definitions[i.localDefinitionId].name+' ×'+i.quantity+' · '+i.id);
 options('chest',projection.chest,i=>projection.definitions[i.localDefinitionId].name+' ×'+i.quantity+' · '+i.id);
 options('recipient',projection.actors.filter(a=>a.kind==='player'&&a.id!==p.id),i=>i.name+' · '+i.id);
 $('budgets').textContent=projection.budgets.actorsUsed+'/'+projection.budgets.actorSlots+' projected actors · '+projection.budgets.actorsOmitted+' omitted by budget · '+projection.persistent.length+' persistent projection bytes. No bytes are applied to a ROM.';
}
async function refresh(){if(!session?.token){status('Create a player or paste a reconnect key.');return;}const value=await api('/v1/state');session={...value.session,token:session.token};projection=value.projection;remember();render();}
async function action(envelope){const result=await api('/v1/intents','POST',envelope);$('outcome').textContent=JSON.stringify(result,null,2);status(result.accepted?'Server accepted the action.':result.error.message);await refresh();}
async function run(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(button=>button.disabled=true);try{await fn();}catch(error){status(error.message+' If an action lost its response, retry the identical request.');}finally{busy=false;document.querySelectorAll('button').forEach(button=>button.disabled=false);}}
$('join').addEventListener('click',()=>run(async()=>{const value=await api('/v1/sessions','POST',{name:$('name').value});session=value.session;projection=value.projection;last=null;remember();render();status('Player created. Save the reconnect key, then open another tab to create a second player.');}));
$('resume').addEventListener('click',()=>run(async()=>{const token=$('key').value.trim();if(!/^[a-f0-9]{64}$/.test(token))throw Error('Paste the 64-character token from the saved reconnect key.');session={token};last=null;await refresh();$('key').value='';status('Reconnected to the same player and durable inventory.');}));
$('disconnect').addEventListener('click',()=>{session=null;projection=null;last=null;remember();render();status('This view is disconnected. Your server player remains stored.');});
$('save').addEventListener('click',()=>{if(!session?.token){status('Connect first.');return;}const blob=new Blob([JSON.stringify({format:'NESForgeHostedReconnectKey',version:1,server:location.origin,...session},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Forge_Reconnect_Key.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Reconnect key downloaded. It grants access to this local player; keep it private.');});
$('refresh').addEventListener('click',()=>run(refresh));$('retry').addEventListener('click',()=>run(async()=>{if(!last||last.sessionId!==session?.id)throw Error('No request recorded for this session.');await action(last.envelope);}));
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>run(async()=>{
 if(!projection||!session)throw Error('Connect a player first.');const type=button.dataset.action;let payload={};
 if(type==='move')payload={dx:Number(button.dataset.dx),dy:Number(button.dataset.dy)};
 else if(type==='gather')payload={resourceId:'berry-bush'};else if(type==='buy')payload={offerId:'berry-for-2'};else if(type==='craft')payload={recipeId:'two-berries-potion'};
 else{const source=type==='pickup'?'ground':type==='retrieve'?'chest':'inventory';if(!$(source).value)throw Error('Select an available item first.');payload={itemId:$(source).value};if(type==='transfer'){if(!$('recipient').value)throw Error('Select a nearby recipient.');payload.toPlayerId=$('recipient').value;}}
 const envelope={version:1,requestId:crypto.randomUUID(),baseRevision:projection.world.revision,intent:{type,payload}};last={sessionId:session.id,envelope};remember();await action(envelope);
})));
run(refresh);
})();
