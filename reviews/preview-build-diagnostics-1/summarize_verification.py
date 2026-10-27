"""Bind all current evidence to the frozen native and hosted outputs."""
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[2];here=Path(__file__).resolve().parent
load=lambda name:json.loads((here/name).read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
native=sha(root/'nes-forge.html');hosted=sha(root/'experiments/hosted-worlds/v17.1/NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html')
run=load('Run_Status.json');assert run['status']=='passed' and all(v['passed'] for v in run['results'])
results={}
for name,total,label in [('Workflow_DOM.json',29,'previewDiagnosticsDom'),('Workflow_Browser.json',32,'previewDiagnosticsBrowser'),('Resume_DOM_Verification.json',22,'resumeDom'),('Connected_Workflow_DOM.json',20,'connectedResourceDom'),('Capabilities_DOM_Verification.json',12,'capabilityLifecycleDom')]:
 d=load(name);assert d['htmlSha256']==native and d.get('status','passed')=='passed',name
 assert len(d['checks'])==total and all(c['passed'] for c in d['checks']),name
 results[label]={'passed':total,'total':total}
d=load('Resume_Browser_Verification.json');assert d['status']=='passed' and d['htmlSha256']==native
assert sum(len(r['checks']) for r in d['results'])==36 and all(all(r['checks'].values()) and not r['errors'] for r in d['results']);results['resumeBrowser']={'passed':36,'total':36}
for label,identity,directory in [('Native',native,'gate'),('Hosted',hosted,'gate-hosted')]:
 d=load('Startup_'+label+'.json');assert d['status']=='passed' and d['htmlSha256']==identity and d['passed']==10
 results['startup'+label]={'passed':10,'total':10}
 d=load(directory+'/Summary.json');assert d['status']=='passed' and d['htmlSha256']==identity and d['passed']==d['total']==104
 results['public'+label]={'passed':104,'total':104,'suites':9}
d=load('Hosted_Acceptance.json');assert d['passed_suites']==d['total_suites']==10 and d['passed_boolean_checks']==d['total_boolean_checks']==114
results['hostedAcceptance']={'passed':114,'total':114,'suites':10}
s=load('Source_Convergence.json');assert s['status']=='passed' and s['nativeHtmlSha256']==native and s['hostedHtmlSha256']==hosted
assert s['nativeInputs']==190 and s['hostedInputs']==201
d=load('Documentation_Verification.json');assert d['status']=='passed' and d['htmlSha256']==native
for item in d['files']:assert sha(root/'app/docs'/item['file'])==item['sha256']
report={'status':'passed','nativeHtmlSha256':native,'hostedHtmlSha256':hosted,'checks':results,
 'sourceConvergence':'Source_Convergence.json','documentation':'Documentation_Verification.json',
 'scope':'Shared authoritative preview renderers, explicit current native pose output and actual compiler diagnostics with proven native context. Existing canonical lifecycle, schema, signature/projection algorithms and byte codecs/spans retained.',
 'limits':['DOM canvas/layout/timers are stubbed; Chromium canvas pixel comparisons and UI actions are separate.',
 'Native browser intake uses existing factories. Resume browser tests use explicit download fallback with native OS picker disabled; storage/recovery are isolated.',
 'Current native output preview is limited to supported Glass Joe position views and declared incremental state paths.',
 'Unknown historical snapshot/hash differences stay explicitly unlocalized.',
 'No full-fight, listening/controller/hardware, independent emulator, exhaustive native-use or public hosting acceptance. Historical full gate remains unavailable.']}
(here/'Verification_Summary.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
