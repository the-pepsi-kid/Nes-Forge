/* AL-EXP-02: the discovery lifecycle. A state is never stored on a definition and never set by hand, a score or an
 * agent: it is assessed from evidence every time, and each step names the evidence it requires. Falsified, ambiguous
 * and inconclusive results are kept as findings, not discarded. UMD, pure.
 *
 *   uninvestigated -> observed -> hypothesis -> experimentally supported -> same-engine repeatable
 *     -> independently verified -> promotion eligible -> user-approved resource
 *   side states: falsified, ambiguous, inconclusive, verification blocked, verification failed */
(function(root,factory){const node=typeof module!=='undefined'&&module.exports;const api=factory(node?require('./experiment-contract.js'):root.ForgeExperimentContract);if(node)module.exports=api;else root.ForgeExperimentLifecycle=api;})(typeof globalThis!=='undefined'?globalThis:this,function(contract){
'use strict';
const VERSION=1;
const STATES=Object.freeze(['uninvestigated','observed','hypothesis','experimentally-supported','same-engine-repeatable','independently-verified','promotion-eligible','user-approved']);
const SIDE=Object.freeze(['falsified','ambiguous','inconclusive','verification-blocked','verification-failed']);
// The documented evidence requirement of each state (shown in the panel and in packages).
const REQUIREMENTS=Object.freeze({
  'uninvestigated':'Nothing has run yet: no plan, receipt or capture exists for this cartridge.',
  'observed':'A baseline run of the training input reached its target (background enabled at every capture) and produced sealed receipts.',
  'hypothesis':'At least one ranked candidate table explains at least three distinct observed records; geometry is not yet tested.',
  'experimentally-supported':'A frozen candidate whose single-byte interventions changed exactly the predicted cells to the predicted values at two record positions (when the table has a second record that appears once), without changing the program\'s path; same-value, unrelated-byte and restoration controls showed no effect; every other tested hypothesis was falsified; record 0 established by instruction operands.',
  'same-engine-repeatable':'Two cold and two checkpoint-restored baselines identical (state, frames, ordered bus events), and the supporting intervention repeated with identical captures. This is determinism on one engine, not correctness.',
  'independently-verified':'A sealed receipt from an emulator that is not NES Forge, bound to this definition and cartridge, whose raw captures NES Forge re-compares itself: the engines agree on every compared channel at every checkpoint (timing-classified stack bytes reported), and on the independent engine every supporting intervention shows its predicted effect, every control and decoy shows none, and every claim about the withheld screen holds.',
  'promotion-eligible':'Independently verified; frozen before the withheld input ran; record numbering from operand evidence; a decoder version and destination the promotion contract supports; no blocking unsupported case. Eligibility allows a preview only.',
  'user-approved':'A person approved the promotion preview of this exact definition (an approval record naming the definition and preview hashes). Not available in this phase: nothing is promoted.',
  'falsified':'Every tested hypothesis was falsified by a clean intervention (not read, read with no observed effect, or an unpredicted effect).',
  'ambiguous':'Several hypotheses survived their interventions and describe different tables, or the table is supported but record 0 is not established, so exact record identity is not claimed.',
  'inconclusive':'The evidence cannot decide: a control showed an effect, an intervention changed the program\'s path (confounded), a run did not reach its target, or the observations are insufficient to fix a table\'s geometry.',
  'verification-blocked':'The independent emulator could not run (not installed, no display, refused the cartridge); nothing was verified.',
  'verification-failed':'The independent engine disagreed with NES Forge on a compared channel, or a prediction did not hold on it.',
});

function assess({discovery,independent=null,approval=null,priorEvaluations=[]}={}){
  const steps=[],note=[];let state='uninvestigated',side=null,sideReason=null;
  const reach=(s,evidence)=>{state=s;steps.push({state:s,evidence});};
  if(!discovery)return finish();
  const d=discovery,stages=d.stages||{},cls=d.result?.classification;
  if(stages.observe&&stages.observe.trace!==undefined&&d.plans?.length)reach('observed',d.plans[0].receipts.filter(r=>r.trial.startsWith('baseline')).map(r=>r.receiptHash));
  else return finish();
  if(stages.propose?.ranked?.length)reach('hypothesis',stages.propose.ranked.slice(0,5).map(w=>w.id));
  if(cls==='insufficient-evidence'){side='inconclusive';sideReason='insufficient evidence: '+d.result.reason;return finish();}
  if(cls==='inconclusive'){const t=stages.test?.interventions||[];const allFalsified=t.length&&t.every(i=>String(i.interpretation?.classification).startsWith('falsified'));
    side=allFalsified?'falsified':'inconclusive';sideReason=d.result.reason;return finish();}
  if(!d.definition)return finish();
  const ver=contract.verifyCandidate(d.definition);if(!ver.ok){side='inconclusive';sideReason='the definition does not verify: '+ver.problems.join('; ');return finish();}
  const confirm=stages.test?.confirm,controls=stages.test?.controls||[];
  // support must be this definition's own sealed evidence: a revision starts with none and does not inherit its predecessor's
  const own=(d.definition.evidence?.interventions||[]).filter(i=>i.result==='supported').map(i=>i.receipt);
  if(d.definition.revision&&d.definition.revision.number>1&&!own.length){note.push('revision '+d.definition.revision.number+' starts untested: it needs its own interventions and a withheld evaluation dataset not used for revision '+(d.definition.revision.number-1));
    const reusedInput=priorEvaluations.find(e=>e.inputHash===d.holdout?.inputHash&&e.definitionHash!==d.definition.definitionHash);if(reusedInput)note.push('the withheld input recorded here already evaluated '+reusedInput.definitionHash.slice(0,12)+'…; it cannot evaluate this revision');return finish();}
  const support=(stages.test?.interventions||[]).filter(i=>i.candidate===stages.freeze?.candidate&&i.interpretation?.classification==='supported'&&own.includes(i.receiptHash));
  if(support.length&&controls.every(c=>c.passed)&&(confirm?.secondPosition?.classification==='supported'||confirm?.secondPosition?.classification==='not available'))
    reach('experimentally-supported',[...support.map(i=>i.receiptHash),...(confirm?.secondPosition?.receiptHash?[confirm.secondPosition.receiptHash]:[]),...controls.map(c=>c.receiptHash)]);
  else return finish();
  if(cls==='ambiguous'){side='ambiguous';sideReason=d.result.reason;}
  if(stages.observe.repeatability==='passed'&&confirm?.repeat?.identicalToFirst&&confirm.repeat.classification==='supported')reach('same-engine-repeatable',[...d.plans[0].receipts.map(r=>r.receiptHash),confirm.repeat.receiptHash]);
  else return finish();
  // withheld evaluation hygiene: one withheld input evaluates one revision
  const reused=priorEvaluations.find(e=>e.inputHash===d.holdout?.inputHash&&e.definitionHash!==d.definition.definitionHash);
  if(reused){side='inconclusive';sideReason='the withheld input was already used to evaluate another revision ('+reused.definitionHash.slice(0,12)+'…); a revised definition needs a new withheld evaluation dataset';return finish();}
  if(!independent){note.push('independent verification not performed: run the verification jobs in an independent emulator and attach its receipt');return finish();}
  if(independent.subject?.definitionHash!==d.definition.definitionHash){note.push('the attached independent receipt is about another definition ('+String(independent.subject?.definitionHash).slice(0,12)+'…)');return finish();}
  if(independent.verdict.result==='blocked'){side='verification-blocked';sideReason=independent.verdict.reason;return finish();}
  if(independent.verdict.result!=='verified'){side='verification-failed';sideReason=independent.verdict.reason;return finish();}
  if(side)return finish(); // an ambiguous candidate can be independently verified for what it claims, but is not promoted
  reach('independently-verified',[independent.receiptHash]);
  const numbering=d.definition.table.numbering||'operand-evidence';
  const eligible=d.stages.freeze?.frozenBeforeHoldout&&numbering==='operand-evidence'&&d.definition.decoder?.name==='metatile-2x2'&&d.definition.decoder.version===1;
  if(eligible)reach('promotion-eligible',[d.definition.definitionHash]);else return finish();
  if(approval&&approval.definitionHash===d.definition.definitionHash&&approval.previewHash)reach('user-approved',[approval.previewHash]);
  return finish();
  function finish(){const i=STATES.indexOf(state),next=STATES[i+1]||null;
    return {format:'NESForgeLifecycleAssessment',version:VERSION,state,side,sideReason,steps,next,nextRequires:next&&!side?REQUIREMENTS[next]:null,notes:note,
      definitionHash:discovery?.definition?.definitionHash||null,independentReceipt:independent?.receiptHash||null};}
}
return Object.freeze({version:VERSION,STATES,SIDE,REQUIREMENTS,assess});
});
