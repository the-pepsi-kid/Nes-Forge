import os
"""Wallet UI acceptance using test-only injected EIP-1193 providers and REAL ECDSA signatures.
Not a test against installed real wallet browser extensions.
"""
import sys, tempfile, subprocess, time, requests, hashlib, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
from cryptography.hazmat.primitives.asymmetric import ec,utils
from cryptography.hazmat.primitives import hashes
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'host'))
from eth_verify import keccak256, mul, G, N, address_from_point, recover_address
port='http://127.0.0.1:8765';checks={};errs=[]
world=json.loads((Path(os.environ.get('NES_FORGE_HOSTED_SNAPSHOT_JSON',str(root/'tests/synthetic_snapshot.json')))).read_text());admin='testing-only-no-production-secret'
with tempfile.TemporaryDirectory() as d:
 proc=subprocess.Popen([sys.executable,str(root/'host/server.py'),'--db',str(Path(d)/'world.sqlite3'),'--admin-token',admin],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 try:
  for _ in range(80):
   try:
    if requests.get(port+'/api/health',timeout=.5).ok:break
   except Exception:time.sleep(.1)
  else:raise RuntimeError('No host')
  requests.post(port+'/api/admin/world',json=world,headers={'X-Forge-Admin':admin}).raise_for_status()
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
   pages=[]
   for secret in (1,2):
    address=address_from_point(mul(secret,G))
    context=browser.new_context(viewport={'width':1320,'height':920})
    def make_sign(i,address):
     def sign(payload_hex):
      payload=bytes.fromhex(payload_hex[2:]);message=payload.decode('utf-8');digest=keccak256(b'\x19Ethereum Signed Message:\n'+str(len(payload)).encode()+payload)
      der=ec.derive_private_key(i,ec.SECP256K1()).sign(digest,ec.ECDSA(utils.Prehashed(hashes.SHA256())))
      r,s=utils.decode_dss_signature(der);s=min(s,N-s)
      for v in (27,28):
       sig='0x'+r.to_bytes(32,'big').hex()+s.to_bytes(32,'big').hex()+bytes([v]).hex()
       if recover_address(message,sig)==address:return sig
      raise RuntimeError('Cannot recover test signature')
     return sign
    context.expose_function('__forge_test_sign',make_sign(secret,address))
    context.add_init_script("""(address)=>{window.ethereum={request:async ({method,params})=>{if(method==='eth_requestAccounts')return [address];if(method==='eth_chainId')return '0x1';if(method==='personal_sign')return window.__forge_test_sign(params[0]);throw Error('Unsupported test wallet request')}}} """,arg=address) if False else None
    # Expose same test provider in each isolated browser profile.
    context.add_init_script("window.ethereum={request:async ({method,params})=>{if(method==='eth_requestAccounts')return ['"+address+"'];if(method==='eth_chainId')return '0x1';if(method==='personal_sign')return window.__forge_test_sign(params[0]);throw Error('Unsupported test wallet call')}};")
    page=context.new_page();page.on('pageerror',lambda e:errs.append(str(e)));page.goto(port,wait_until='load');page.locator('#connect').click();page.wait_for_function("document.querySelector('#authStatus').textContent.includes('Verified')",timeout=30000)
    checks[f'wallet_{secret}_browser_login']=page.locator('#authStatus').inner_text().startswith('Verified')
    pages.append((page,context))
   pages[0][0].wait_for_function("document.querySelector('#netStatus').textContent.includes('2 online')",timeout=20000)
   checks['browser_views_two_online']=pages[0][0].locator('#netStatus').inner_text().startswith('2 online')
   # grant test XP to first browser from server admin then player construction through UI
   state=requests.get(port+'/api/admin/state',headers={'X-Forge-Admin':admin}).json()
   own_id=state['players'][0]['id']
   me0=pages[0][0].locator('#me').inner_text()
   own_id=next(q['id'] for q in state['players'] if q['id'][:8] in me0)
   requests.post(port+'/api/admin/command',json={'action':'grant_test_xp','playerId':own_id,'amount':50},headers={'X-Forge-Admin':admin}).raise_for_status()
   start=next(q for q in state['players'] if q['id']==own_id)
   page=pages[0][0]
   # Click canvas coordinate mapped to own position; click target render then camp build.
   canvas=page.locator('#world');box=canvas.bounding_box();ptx=start['x'];pty=start['y']
   canvas.click(position={'x':box['width']*(ptx+.5)/world['width'],'y':box['height']*(pty+.5)/world['height']})
   page.locator('#buildCamp').click()
   page.wait_for_function("document.querySelector('#me').textContent.includes('Unspent XP: 30')",timeout=15000)
   checks['browser_build_camp_spends_xp']=page.locator('#me').inner_text().find('Unspent XP: 30')>=0
   state=requests.get(port+'/api/admin/state',headers={'X-Forge-Admin':admin}).json()
   checks['browser_action_persisted']=len(state['structures'])==1 and state['structures'][0]['kind']=='camp'
   path=root/'NES_Forge_3x_Hosted_Z2_Player_View.png';page.screenshot(path=str(path));checks['player_preview_created']=path.is_file()
   for page,context in pages:context.close()
   browser.close()
 finally:
  proc.terminate();proc.wait(timeout=8)
print(json.dumps({'checks':checks,'errors':errs},indent=2))
assert all(checks.values()) and not errs,(checks,errs)
