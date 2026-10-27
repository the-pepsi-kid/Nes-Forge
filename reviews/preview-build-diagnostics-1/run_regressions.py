"""Run independent existing checks on frozen outputs; supply private ROM folder."""
from pathlib import Path
import subprocess,os,sys,json,hashlib,concurrent.futures
root=Path(__file__).resolve().parents[2];here=Path(__file__).resolve().parent
roms=Path(sys.argv[1]).resolve();z2=Path(sys.argv[2]).resolve()
native=root/'nes-forge.html';hosted=root/'experiments/hosted-worlds/v17.1/NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html'
identity=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
hashes={str(native):identity(native),str(hosted):identity(hosted)}
# A genuine preceding reader comes from public Git history, not a transformed
# current application. The temporary HTML stays outside the tracked checkout.
previous=root.parent/'preview-baseline.html';previous.write_bytes(subprocess.check_output(['git','show','cf08e22f3217d0e36624cf6d91a7a72494d35d71:nes-forge.html'],cwd=root))
env={**os.environ,'FORGE_PREVIOUS_HTML':str(previous),'FORGE_RESUME_REPORT':str(here/'Resume_DOM_Verification.json'),'FORGE_WORKFLOW_REPORT':str(here/'Connected_Workflow_DOM.json'),'FORGE_CAPABILITY_REPORT':'../preview-build-diagnostics-1/Capabilities_DOM_Verification.json','FORGE_RESUME_BROWSER_REPORT':str(here/'Resume_Browser_Verification.json')}
jobs=[('workflow-dom',['node','reviews/preview-build-diagnostics-1/verify_workflow.cjs',str(roms)]),
 ('workflow-browser',['python3','reviews/preview-build-diagnostics-1/verify_browser.py',str(roms)]),
 ('connected-dom',['node','reviews/connected-resource-workflow-1/verify_workflow.cjs',str(roms)]),
 ('resume-dom',['node','reviews/workspace-resume-1/verify_resume.cjs',str(roms)]),
 ('capability-dom',['node','reviews/hosted-integration-1/verify_capabilities_dom.cjs',str(roms),str(z2)]),
 ('startup-native',['node','app/tests/workstation-startup-dom.cjs',str(native),str(here/'Startup_Native.json')]),
 ('startup-hosted',['node','app/tests/workstation-startup-dom.cjs',str(hosted),str(here/'Startup_Hosted.json')]),
 ('public-checks',['python3','reviews/preview-build-diagnostics-1/run_public_checks.py']),
 ('hosted-acceptance',['python3','experiments/hosted-worlds/v17.1/tests/run_alpha_acceptance.py','--json-out',str(here/'Hosted_Acceptance.json')]),
 ('resume-browser',['python3','reviews/workspace-resume-1/verify_browser.py',str(roms)])]
def run(job):
 name,cmd=job
 with (here/(name+'.log')).open('w') as log:p=subprocess.run(cmd,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=1200)
 return {'name':name,'exitCode':p.returncode,'passed':p.returncode==0}
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for result in pool.map(run,jobs):
  results.append(result);print(json.dumps(result),flush=True)
for name,expected in hashes.items():assert identity(Path(name))==expected,'Output changed during verification'
(here/'Run_Status.json').write_text(json.dumps({'status':'passed' if all(r['passed'] for r in results) else 'failed','htmlHashes':hashes,'results':results},indent=2)+'\n')
assert all(r['passed'] for r in results),'Inspect individual logs'
