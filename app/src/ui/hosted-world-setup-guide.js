/* NES Forge 3.x localhost guided setup. Pure presentation/client inspection;
 * no secrets persisted, no automatic hosting, wallet requests, or ROM mutation.
 */
(()=>{'use strict';
const overlay=document.getElementById('nf-host-overlay'),dialog=document.getElementById('nf-host-dialog');
if(!overlay||!dialog||document.getElementById('nf-host-guide'))return;
const $=id=>document.getElementById(id);
const css=document.createElement('style');css.textContent=`
#nf-host-guide{margin-bottom:13px;border:1px solid #466e76;background:linear-gradient(120deg,#102b39,#172e40);border-radius:6px;padding:12px}
#nf-host-guide .nf-g-top{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
#nf-host-guide .nf-g-kicker{font:bold 10px monospace;color:#a2dbb6;letter-spacing:.05em}
#nf-host-guide .nf-g-steps{display:flex;flex-wrap:wrap;gap:5px;margin:9px 0}
#nf-host-guide button.nf-g-step{font:700 11px monospace;padding:7px 10px;min-width:36px;border:1px solid #426271;background:#173345;color:#bed7de;border-radius:4px}
#nf-host-guide button.nf-g-step[aria-current=step]{border-color:#e9d28b;background:#345065;color:#fff0bc}
#nf-host-guide button.nf-g-step.visited{color:#b7dfcd;border-color:#557b6a}
#nf-host-guide .nf-g-body{border:1px solid #345469;background:#0a202f;border-radius:5px;padding:12px;min-height:112px}
#nf-host-guide .nf-g-body h3{font:700 14px monospace;color:#e4eccd;margin:0 0 7px}
#nf-host-guide .nf-g-body p{margin:5px 0 8px;color:#c6dce2}
#nf-host-guide .nf-g-body ol{margin:4px 0 10px;padding-left:20px;color:#d5e5e8}
#nf-host-guide .nf-g-body li{margin:3px 0}
#nf-host-guide .nf-g-body code{font:11px monospace;color:#a9e7c2;background:#071722;padding:2px 5px;border-radius:2px}
#nf-host-guide pre.nf-g-command{white-space:pre-wrap;overflow:auto;background:#061722;padding:9px;border-left:3px solid #849b84;color:#d0ead8;font:11px/1.6 monospace}
#nf-host-guide .nf-g-controls{display:flex;gap:6px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-top:10px}
#nf-host-guide .nf-g-checks{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}
#nf-host-guide .nf-g-check{font:10px monospace;color:#9fb5c0;border:1px solid #345669;border-radius:20px;padding:4px 8px}
#nf-host-guide .nf-g-check.yes{color:#93dfba;border-color:#438065}
#nf-host-guide .nf-g-check.no{color:#d8ab90;border-color:#7b5b4d}
#nf-host-guide .nf-g-note{color:#97afbc;font:11px/1.5 system-ui}
@media(max-width:560px){#nf-host-guide{padding:8px}#nf-host-guide .nf-g-body{padding:9px}#nf-host-guide .nf-g-controls{justify-content:flex-start}}
`;document.head.appendChild(css);
const guide=document.createElement('section');guide.id='nf-host-guide';guide.setAttribute('aria-label','Localhost hosting setup walkthrough');
guide.innerHTML=`<div class="nf-g-top"><div><span class="nf-g-kicker">GUIDED SETUP · Z2 HOSTED WORLD PROOF OF CONCEPT</span><div id="nf-g-progress" class="nfhost-muted">Step 1 of 7</div></div><button type="button" id="nf-g-toggle" aria-expanded="true">Hide guide</button></div>
<div id="nf-g-main"><div id="nf-g-steps" class="nf-g-steps" aria-label="Setup steps"></div><div id="nf-g-body" class="nf-g-body" aria-live="polite"></div>
<div class="nf-g-controls"><div class="nfhost-actions"><button type="button" id="nf-g-prev">← Previous</button><button type="button" id="nf-g-next">Next →</button></div><button type="button" id="nf-g-verify">Recheck prerequisites</button></div>
<div id="nf-g-checks" class="nf-g-checks" aria-label="Evidence checks"></div><p id="nf-g-info" class="nf-g-note" role="status">This guide assists setup. It does not start servers, install packages, authorize wallet signatures, or publish a world automatically.</p></div>`;
dialog.querySelector('.nfhost-head').after(guide);
const visited=[false,false,false,false,false,false,false];
let index=0,health=false,authorized=false,hostState=null,everOnline=0,hostError='';
const API='http://127.0.0.1:8765';
const steps=[
 {title:'Prepare local hosting',text:`<p>This experiment stays on <code>127.0.0.1</code>. You'll need Python 3.11+, a Chromium-compatible browser and a wallet extension for each test player.</p><ol><li>Unzip the review kit on your computer.</li><li>In a terminal inside its folder, install the Python dependency.</li><li>Run the included host command or launcher; leave that terminal running.</li></ol><pre class="nf-g-command">Windows:\npy -m pip install aiohttp\npy host\\server.py\n\nmacOS / Linux:\npython3 -m pip install aiohttp\npython3 host/server.py</pre><p class="nf-g-note">The server prints an administrator token; it stays only in your terminal and Forge's open session. If the wallet crypto check fails, install <code>pycryptodome</code> and run <code>python host/diagnose.py</code> again.</p>`,cta:'Test localhost',target:'nf-host-health'},
 {title:'Verify host and administrator access',text:`<p>Click <b>Test localhost</b> and check that the host responds. Copy the administrator token printed by the server into the <b>Admin token</b> field below.</p><ol><li>The token authorizes admin operations; a player wallet does not.</li><li>Click <b>Refresh Live</b> to verify admin access.</li><li>Never publish the token or expose the localhost service to your network.</li></ol>`,cta:'Refresh Live / Verify Token',target:'nf-host-refresh'},
 {title:'Load Zelda II into NES Forge',text:`<p>Use your own legally obtained Zelda II ROM. In Forge choose <b>Open native World</b>, select the Zelda II ROM, and then select the intended native overworld (start with West Hyrule).</p><ol><li>Confirm the map is decoded, not just generic ROM inspection.</li><li>Return to this window after the World editor displays the terrain.</li><li>The host receives a terrain snapshot and locally generated PNG atlas from your native Z2 source artwork. No raw ROM or playable engine is uploaded. Keep published artwork private and local.</li></ol>`,cta:'Go to WORLD editor',target:'editor'},
 {title:'Load the selected World into localhost',text:`<p>When the host is running and your Zelda II World is selected, click <b>Load selected World on host</b> below, then approve the confirmation.</p><p>A host revision hash will appear and the World map will become visible. Full snapshot replacement requires all players to disconnect and resets hosted structures on revision changes. For small terrain-only edits after publication, return to WORLD Live and use Publish safe terrain edits; it validates affected cells and preserves connected players.</p><p><b>No automatic publication</b>: this explicit action is required, and it does not modify the original ROM or Forge project.</p>`,cta:'Load selected World',target:'nf-host-publish'},
 {title:'Connect two wallet-backed players',text:`<p>Click <b>Open player client</b>. In two separate browser profiles (or two wallet-enabled browsers), open <code>http://127.0.0.1:8765/</code>.</p><ol><li>Connect each player's EVM wallet; select Ethereum mainnet identity (<em>no transaction</em>).</li><li>Approve the local text-message signature challenge.</li><li>Check for two online players in the Live view.</li></ol><p class="nf-g-note">Use test-only wallets without valuable assets. The server verifies EOA signatures, retains only the public wallet address with a player ID, and never requests private keys. Contract wallets are not supported in this pilot.</p>`,cta:'Open player client',target:'nf-host-player'},
 {title:'Test shared state and XP construction',text:`<p>Move both players using WASD/arrow keys; their positions should update in both browsers and WORLD Live. For the source-derived multiplayer Link actions, enter the SAME town or cave side-view in both clients after publishing original Link display poses. Use <b>Space</b> to jump, <b>X</b> for Upward Stab (original pose 8), <b>C</b> for Downward Stab (pose 9; airborne only), and <b>Z</b> for Forward Sword. Both clients should see the same server-owned poses and the pilot hit events. The jump arc, sword collisions and damage are still intentionally unverified and test-only.</p><ol><li>Select a player below and click <b>Grant +50 Test XP</b>.</li><li>In that player's browser, choose a nearby allowed tile and buy a camp (20 XP).</li><li>Use another +50 XP for defenses (15 XP), a boss (30 XP), or a boss HP upgrade (10 XP).</li><li>Watch structures and XP update for both clients.</li></ol><p class="nf-g-note">Movement and construction costs are provisional hosted rules—not verified Zelda II combat, cave, raft, or boss mechanics.</p>`,cta:'Grant +50 Test XP',target:'nf-host-grant'},
 {title:'Verify persistence and review scope',text:`<p>Disconnect both clients, stop the terminal host, and start it again with <b>the same database path</b>.</p><ol><li>Reconnect and sign in with the same wallet addresses.</li><li>Confirm player IDs, XP balances, camp and boss placements survived.</li><li>Inspect the WORLD Live audit records and compare the host revision.</li><li>Record any issues before expanding beyond localhost.</li></ol><p><b>Not implemented yet:</b> native Zelda II multiplayer, native combat/raft/cave logic, palace raids/crystal capture, secure internet hosting, deploy/rollback, and production authentication infrastructure.</p><p class="nf-g-note">This final restart check is manual in the first pilot. Reconnect after a restart cannot be inferred merely from an online status indicator.</p>`,cta:'Refresh hosted state',target:'nf-host-refresh'}
];
function check(label,value,help){const el=document.createElement('span');el.className='nf-g-check '+(value?'yes':'no');el.textContent=(value?'✓ ':'○ ')+label;el.title=help||'';return el}
function checkSelected(){try{window.Forge?.services?.HostedWorldPOC?.selected?.();return true}catch(_){return false}}
function render(){const s=steps[index];$('nf-g-progress').textContent=`Step ${index+1} of ${steps.length} · ${s.title}`;const menu=$('nf-g-steps');menu.replaceChildren();steps.forEach((item,i)=>{const b=document.createElement('button');b.type='button';b.className='nf-g-step'+(visited[i]?' visited':'');b.textContent=(visited[i]?'• '+String(i+1)+' · ':String(i+1)+' · ')+item.title.replace('Zelda II into NES Forge','Z2 source').replace(' into localhost','').replace(' and administrator access','').replace(' and XP construction',' + XP').replace(' and review scope','');b.title=item.title;if(i===index)b.setAttribute('aria-current','step');b.onclick=()=>{index=i;render()};menu.appendChild(b)});
 $('nf-g-body').innerHTML=`<h3>${s.title}</h3>${s.text}<div class="nfhost-actions"><button type="button" id="nf-g-action">${s.cta}</button></div>`;
 $('nf-g-action').onclick=()=>{if(s.target==='editor'){const world=document.querySelector('.tab[data-view="world"]');document.getElementById('nf-host-close')?.click();world?.click();return}$(s.target)?.click()};
 $('nf-g-prev').disabled=index===0;$('nf-g-next').textContent=index===steps.length-1?'Back to first step ↺':'Next →';
 const checks=$('nf-g-checks');checks.replaceChildren(check('Host online',health,'HTTP health endpoint'),check('Admin token verified',authorized,'Administrator state endpoint'),check('Native Z2 World selected',checkSelected(),'Explicit native World binding'),check('World loaded',!!hostState?.world,'Server-authoritative hosted snapshot'),check('Two players online',(hostState?.online||0)>=2,'Live websocket sessions'),check('Camp placed',!!hostState?.structures?.some(x=>x.kind==='camp'),'Persisted build structure'));
}
$('nf-g-next').onclick=()=>{visited[index]=true;index=(index+1)%steps.length;render()};$('nf-g-prev').onclick=()=>{index=Math.max(0,index-1);render()};
$('nf-g-toggle').onclick=()=>{const m=$('nf-g-main'),show=m.hidden;m.hidden=!show;$('nf-g-toggle').setAttribute('aria-expanded',String(show));$('nf-g-toggle').textContent=show?'Hide guide':'Show guide'};
async function verify(){try{const res=await fetch(API+'/api/health');if(!res.ok)throw Error('Health probe failed');const body=await res.json();health=body.ok===true&&body.protocol===13&&body.maxRoomWidthPx===2048;if(!health)throw Error('Incompatible host protocol '+(body.protocol??'unknown')+' (requires protocol 13, 2048px rooms)');}catch(e){health=false;authorized=false;hostState=null;hostError=String(e.message||e);$('nf-g-info').textContent='Host verification failed: '+hostError+'. Start the matching host from this review kit, then recheck.';render();return}hostError='';
const token=$('nf-host-token').value.trim();authorized=false;hostState=null;
if(token){try{const res=await fetch(API+'/api/admin/state',{headers:{'X-Forge-Admin':token}});if(res.ok){authorized=true;hostState=await res.json();everOnline=Math.max(everOnline,hostState.online||0)}}catch(_){}}
$('nf-g-info').textContent=authorized?'Host reachable and administrator token verified. Step checks reflect current server evidence.':health?'Host reachable. Enter the admin token printed in the localhost terminal to unlock live state.':'Host unavailable.';render()}
$('nf-g-verify').onclick=verify;
$('nf-host-token').addEventListener('change',verify);
const opener=$('nf-host-open');opener?.addEventListener('click',()=>{verify()});
// Keep walkthrough checks fresh as the existing WORLD Live panel refreshes.
let last=0;const watch=new MutationObserver(()=>{if(overlay.classList.contains('open')&&Date.now()-last>1500){last=Date.now();verify()}});
const summary=$('nf-host-summary');if(summary)watch.observe(summary,{childList:true,characterData:true,subtree:true});
render();
window.Forge=window.Forge||{};window.Forge.services=window.Forge.services||{};window.Forge.services.HostedWorldSetupGuide=Object.freeze({open(){opener.click()},step(n){if(Number.isInteger(n)&&n>=0&&n<steps.length){index=n;render()}},verify});
})();
