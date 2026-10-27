"""Bind fresh reports to the exact native/hosted outputs before packaging."""
from pathlib import Path
import hashlib
import json

here=Path(__file__).resolve().parent
root=here.parents[1]
load=lambda name:json.loads((here/name).read_text())
native=hashlib.sha256((root/'nes-forge.html').read_bytes()).hexdigest()
hosted=hashlib.sha256((root/'experiments/hosted-worlds/v17.1/NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html').read_bytes()).hexdigest()
dom=load('DOM_Verification.json');assert dom['status']=='passed' and dom['htmlSha256']==native
assert len(dom['checks'])==20 and all(c['passed'] for c in dom['checks'])
browser=load('Browser_Verification.json');assert browser['status']=='passed' and browser['htmlSha256']==native
assert len(browser['results'])==2 and sum(len(r['checks']) for r in browser['results'])==28
assert all(all(r['checks'].values()) and not r['errors'] for r in browser['results'])
checks={}
for output,identity in [('Native',native),('Hosted',hosted)]:
    data=load('Startup_'+output+'.json');assert data['status']=='passed' and data['htmlSha256']==identity and data['passed']==10
    checks['startup'+output]={'passed':10,'total':10}
    data=load(('gate' if output=='Native' else 'gate-hosted')+'/Summary.json')
    assert data['status']=='passed' and data['htmlSha256']==identity and data['passed']==data['total']==104
    checks['public'+output]={'passed':104,'total':104,'suites':len(data['suites'])}
cap=load('Capabilities_DOM_Verification.json');assert cap['htmlSha256']==native
assert len(cap['checks'])==12 and all(c['passed'] for c in cap['checks'])
accept=load('Hosted_Acceptance.json');assert accept['passed_boolean_checks']==accept['total_boolean_checks']==114
assert accept['passed_suites']==accept['total_suites']==10
source=load('Source_Convergence.json');assert source['status']=='passed' and source['nativeHtmlSha256']==native and source['hostedHtmlSha256']==hosted
docs=load('Documentation_Verification.json');assert docs['status']=='passed' and docs['htmlSha256']==native
assert all(hashlib.sha256((root/'app/docs'/f['file']).read_bytes()).hexdigest()==f['sha256'] for f in docs['files'])
checks.update(workflowDom={'passed':20,'total':20,'privatePunchOutRevisions':2},
    workflowBrowser={'passed':28,'total':28,'privatePunchOutRevisions':2},
    capabilitiesDom={'passed':12,'total':12,'zeldaTerrainContinuity':True},
    hostedAcceptance={'passed':114,'total':114,'suites':10})
report={'status':'passed','nativeHtmlSha256':native,'hostedHtmlSha256':hosted,'checks':checks,
    'sourceConvergence':'Source_Convergence.json','documentation':'Documentation_Verification.json',
    'scope':'Actual Chromium file-page and parsed-DOM workflow checks are separate. Factory project intake. Both supplied Punch-Out revisions. Native codecs/owners/spans unchanged.',
    'limits':['No full-fight, listening, controller, independent-emulator or hardware acceptance.',
        'Known native consumer coverage is partial, not an exhaustive runtime graph.',
        'Hosted gameplay fidelity and public network deployment remain experimental.',
        'The missing historical full release gate is not replaced by these bounded checks.']}
(here/'Verification_Summary.json').write_text(json.dumps(report,indent=2)+'\n')
candidate=root/'CANDIDATE.json';data=json.loads(candidate.read_text());data['verification'].update(
    publicChecks=104,publicSuites=9,hostedPublicChecks=104,strictDomStartupChecksPerBuild=10,
    resourceWorkflowDomChecks=20,resourceWorkflowBrowserChecks=28,capabilityDomChecks=12,
    hostedAcceptanceChecks=114,hostedAcceptanceSuites=10)
candidate.write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps(report,indent=2))
