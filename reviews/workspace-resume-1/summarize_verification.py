"""Bind completed workflow, compatibility and retained checks to both outputs."""
from pathlib import Path
import hashlib
import json

here=Path(__file__).resolve().parent;root=here.parents[1]
load=lambda name:json.loads((here/name).read_text())
native=hashlib.sha256((root/'nes-forge.html').read_bytes()).hexdigest()
hosted=hashlib.sha256((root/'experiments/hosted-worlds/v17.1/NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html').read_bytes()).hexdigest()
results={}
for filename,total,label in [('Resume_DOM_Verification.json',22,'resumeDom'),('Connected_Workflow_DOM.json',20,'connectedWorkflowDom'),('Capabilities_DOM_Verification.json',12,'capabilitiesDom')]:
    data=load(filename);assert data.get('status','passed')=='passed' and data['htmlSha256']==native
    assert len(data['checks'])==total and all(item['passed'] for item in data['checks'])
    results[label]={'passed':total,'total':total}
data=load('Resume_Browser_Verification.json');assert data['status']=='passed' and data['htmlSha256']==native
assert len(data['results'])==2 and sum(len(item['checks']) for item in data['results'])==36
assert all(all(item['checks'].values()) and not item['errors'] for item in data['results'])
results['resumeBrowser']={'passed':36,'total':36,'revisions':2}
for name,identity,directory in [('Native',native,'gate'),('Hosted',hosted,'gate-hosted')]:
    data=load('Startup_'+name+'.json');assert data['status']=='passed' and data['htmlSha256']==identity and data['passed']==10
    results['startup'+name]={'passed':10,'total':10}
    data=load(directory+'/Summary.json');assert data['status']=='passed' and data['htmlSha256']==identity and data['passed']==data['total']==104
    results['public'+name]={'passed':104,'total':104,'suites':len(data['suites'])}
data=load('Hosted_Acceptance.json');assert data['passed_boolean_checks']==data['total_boolean_checks']==114 and data['passed_suites']==data['total_suites']==10
results['hostedAcceptance']={'passed':114,'total':114,'suites':10}
data=load('Source_Convergence.json');assert data['status']=='passed' and data['nativeHtmlSha256']==native and data['hostedHtmlSha256']==hosted
docs=load('Documentation_Verification.json');assert docs['status']=='passed' and docs['htmlSha256']==native
for item in docs['files']:assert hashlib.sha256((root/'app/docs'/item['file']).read_bytes()).hexdigest()==item['sha256']
report={'status':'passed','nativeHtmlSha256':native,'hostedHtmlSha256':hosted,'checks':results,
    'sourceConvergence':'Source_Convergence.json','documentation':'Documentation_Verification.json',
    'scope':'Optional UI resume only; native code/encoder spans, AssetRegistry, BuildGraph, runtime/recipe algorithms and schemas unchanged. Fresh document, preceding reader, independent contexts, runtime start, actual project download/open, isolated browser storage and explicit recovery are covered.',
    'limits':['DOM canvas/layout/timers and Save As transport are stubbed in the DOM probe.',
        'Actual Chromium uses the explicit download fallback with native OS picker disabled. Initial ROM intake uses the existing factory.',
        'No full-fight, listening/controller/hardware or exhaustive native-use acceptance.',
        'Hosted gameplay fidelity and public deployment remain separate work.']}
(here/'Verification_Summary.json').write_text(json.dumps(report,indent=2)+'\n')
candidate=root/'CANDIDATE.json';data=json.loads(candidate.read_text());data['verification'].update(
    report='reviews/workspace-resume-1/Verification_Summary.json',publicChecks=104,publicSuites=9,hostedPublicChecks=104,
    strictDomStartupChecksPerBuild=10,resumeDomChecks=22,resumeBrowserChecks=36,connectedResourceDomChecks=20,
    capabilityDomChecks=12,hostedAcceptanceChecks=114,hostedAcceptanceSuites=10)
candidate.write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps(report,indent=2))
