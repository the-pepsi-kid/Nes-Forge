/* Replay leaves canonical assets unchanged and loads CURRENT native output.
 * Recovery Apply delegates typed recipes to NativeResourceProject;
 * ProjectStore plus the existing snapshot/Undo owner commit the user edit. */
(() => {
  'use strict';
  const services=Forge.services,api = services.PunchOutReplay;
  const make = (tag, id, text) => { const e = document.createElement(tag); if (id) e.id = id; if (text !== undefined) e.textContent = text; return e; };
  const root = make('details', 'punchOutReplayPanel'), choice = make('select', 'punchOutReplayKind');
  const run = make('button', 'punchOutReplayRun', 'Load current build and replay');
  const stop = make('button', 'punchOutReplayStop', 'Stop replay'), restore = make('button', 'punchOutReplayRestore', 'Restore fight start');
  const status = make('p', 'punchOutReplayStatus'), evidence = make('pre', 'punchOutReplayEvidence');
  for (const [id, label] of [['sequence', 'Reset → opening → punch → dodge → stance'],
    ['natural-opponent-down','Controller input → Glass Joe knockdown → native count / get-up'],
    ['natural-opponent-late','Controller input → later knockdown → native recovery decision'],
    ['natural-mac-down','Controller input → Mac knockdown → native ten-count'],
    ['natural-round','Controller input → round break → active round two'],['opponent-down', 'Seeded opponent knockdown → count → get-up'],
    ['opponent-fifth','Seeded fifth-attempt row → native exit / get-up'],
    ['mac-down', 'Seeded Mac knockdown → count-out'], ['round', 'Seeded round end → round two']]) { const e = make('option', null, label); e.value = id; choice.appendChild(e); }
  choice.value = 'sequence'; status.setAttribute('role', 'status');
  root.append(make('summary', null, 'Glass Joe · native replay and event source'),
    make('p', null, 'Run loads your current native build and pauses at the result. Controller-input cases use the original clock, damage, knockdown, get-up and round code without RAM patches. Seeded cases remain separate, labeled experiments. Restore fight start returns to the pre-experiment checkpoint. Replays leave project assets unchanged. The separate recovery entry controls edit bounded live counts and health targets; other event fields remain inspectable. MMC2 timing remains approximate.'), choice, run, stop, restore, status, evidence);
  const writer=make('section','punchOutRecoveryWriter'),entryChoice=make('select','punchOutRecoveryEntry'),
    countChoice=make('select','punchOutRecoveryCount'),healthChoice=make('select','punchOutRecoveryHealth'),
    applyCount=make('button','punchOutRecoveryApply','Apply native recovery entry'),resetCount=make('button','punchOutRecoveryReset','Reset entry to source'),
    writerLesson=make('button','punchOutRecoveryWriterLesson','Native get-up editing lesson'),entryLesson=make('button','punchOutRecoveryEntryLesson','Recovery entry and health lesson'),
    entrySource=make('button','punchOutRecoveryReadSource','Read preserved entry'),entryWitness=make('button','punchOutRecoveryFollowEvent','Follow entry in replay'),
    groupHealth=make('input','punchOutRecoveryGroup'),groupLabel=make('label'),writerStatus=make('p','punchOutRecoveryWriterStatus');
  groupHealth.type='checkbox';groupLabel.append(groupHealth,document.createTextNode(' Apply health to all live alternative slots in this attempt'));
  writer.setAttribute('aria-label','Native Glass Joe recovery entry');writerStatus.setAttribute('role','status');
  const labeled=(text,node)=>{const label=make('label',null,text+' ');label.setAttribute('for',node.id);label.append(node);return label;};
  writer.append(make('h3',null,'Native recovery entries · Glass Joe'),
    make('p',null,'Edit five live preferred direct counts (1–9) and health targets (8–96, steps of eight) for 32 live entries. Preferred conditions, fallback counts and three original fifth-attempt exit slots have separate controls below. The sixth row stays protected. Direct counts 1, 7 and 9 also set original reaction tags and can change later hit behavior. A selected entry still needs its native condition/slot to run. Apply is one Undo step; Save Project As preserves the recipes.'),
    labeled('Recovery entry',entryChoice),labeled('Current build · direct count',countChoice),labeled('Current build · health target',healthChoice),
    groupLabel,applyCount,resetCount,entrySource,entryWitness,writerLesson,entryLesson,writerStatus);root.append(writer);
  for(const b of [applyCount,resetCount,entrySource,entryWitness,writerLesson,entryLesson])b.type='button';
  writerLesson.onclick=()=>services.ProjectLessons.open({chapter:'punch-out',anchor:'punch-out-25-edit-a-native-get-up-count-and-verify-its-output'});
  entryLesson.onclick=()=>services.ProjectLessons.open({chapter:'punch-out',anchor:'punch-out-26-edit-recovery-entry-health-and-follow-the-selected-branch'});
  const store=services.ProjectStore;
  let fieldKey='',selectionKey='',fieldSource='',fieldState=null,fieldList=[],fieldError='';
  const modeTag=value=>[1,7,9].includes(value)?value:0;
  const entryFields=()=>fieldList.filter(field=>field.recoveryField==='health');
  const entryName=field=>'Attempt '+field.entry.attempt+' · '+(field.entry.role==='preferred'?'preferred':'fallback slot '+field.entry.slot+' · weight '+field.entry.multiplicity);
  function witnessIndex(){return lastReport?.sourceSha256===S.nativeGame?.sourceSha256&&lastReport?.projectEpoch===store.state.epoch&&fieldState?
    lastReport.sourceEvents.findIndex(event=>event.kind==='opponent-recovery-entry'&&event.related?.fileOffset===fieldState.health.offset):-1;}
  function refreshWriter(){
    const eligible=S.nativeGame?.adapter?.startsWith('punch-out-');writer.hidden=!eligible;
    if(!eligible){fieldKey='';selectionKey='';fieldState=null;fieldList=[];fieldSource='';refreshPolicies(true);refreshFifth(true);return;}
    if(!busy){const key=store.state.epoch+':'+S.nativeGame.sourceSha256;
      if(key!==fieldKey){fieldState=null;fieldError='';try{
        const previous=fieldSource===S.nativeGame.sourceSha256?entryChoice.value:'';
        fieldList=services.NativeResourceProject.nativeFields(store.capture());entryChoice.replaceChildren();
        for(const field of entryFields()){const option=make('option',null,entryName(field));option.value=field.id;entryChoice.append(option);}
        entryChoice.value=entryFields().some(field=>field.id===previous)?previous:entryFields()[0]?.id||'';
        fieldSource=S.nativeGame.sourceSha256;
      }catch(error){fieldList=[];fieldError=error.message;}fieldKey=key;selectionKey='';}
      const selectedKey=fieldKey+':'+entryChoice.value;
      if(selectedKey!==selectionKey){const health=entryFields().find(field=>field.id===entryChoice.value),count=health&&fieldList.find(field=>field.offset===health.offset&&field.recoveryField==='count');
        fieldState=health?{health,count}:null;countChoice.replaceChildren();healthChoice.replaceChildren();groupHealth.checked=false;
        for(const value of count?.values||[0]){const option=make('option',null,count?'Count '+value+' · native tag '+modeTag(value):'Fallback pool · edit below');option.value=String(value);countChoice.append(option);}
        if(count)countChoice.value=String(count.value);
        for(const value of health?.values||[]){const option=make('option',null,String(value));option.value=String(value);healthChoice.append(option);}
        if(health)healthChoice.value=String(health.value);selectionKey=selectedKey;
      }
    }
    const unavailable=busy||!fieldState;
    entryChoice.disabled=healthChoice.disabled=applyCount.disabled=resetCount.disabled=entrySource.disabled=unavailable;
    countChoice.disabled=unavailable||!fieldState?.count;groupHealth.disabled=unavailable||fieldState?.health.entry.role!=='alternative';groupLabel.hidden=!fieldState||fieldState.health.entry.role!=='alternative';
    writerLesson.disabled=entryLesson.disabled=busy;entryWitness.disabled=busy||witnessIndex()<0;
    applyCount.textContent=fieldState?.count?'Apply native recovery entry':'Apply native health target';
    refreshPolicies(unavailable);
    refreshFifth(unavailable);
    const h=fieldState?.health,c=fieldState?.count;
    writerStatus.textContent=fieldError||(h?entryName(h)+'. Preserved source: '+(c?'count '+c.sourceValue:'fallback pool')+' ('+hex(h.sourceByte,2)+'), health target '+h.sourceValue+'. Current native build: '+(c?'count '+c.value:'fallback pool')+' ('+hex(h.outputByte,2)+'), health target '+h.value+'. Source links retain the preserved ROM. Follow entry in replay selects its observed health-entry witness; an unobserved entry has no runtime witness.':'Open a supported native Punch-Out source to edit recovery entries.');
  }
  function applyNativeEntry(reset=false){try{
    if(!fieldState)throw Error('Choose a live native recovery entry.');
    const h=fieldState.health,c=fieldState.count,healthFields=groupHealth.checked&&h.entry.role==='alternative'?
      entryFields().filter(field=>field.entry.attempt===h.entry.attempt&&field.entry.role==='alternative'):[h];
    const changes=healthFields.map(field=>({field:field.id,value:reset?field.sourceValue:Number(healthChoice.value)}));
    if(c)changes.push({field:c.id,value:reset?c.sourceValue:Number(countChoice.value)});
    commitChanges(changes,'native recovery entry');
  }catch(error){status.textContent=error.message;}}
  // Every recovery form shares this one existing project/history transaction.
  function commitChanges(changes,label){
    const expected=store.serialize(),ownEpoch=store.state.epoch,result=services.NativeResourceProject.prepareNativeFields(store.capture(),changes);
    if(expected!==store.serialize()||ownEpoch!==store.state.epoch)throw Error('Project changed. Choose the native values again.');
    if(result.changed){const prepared=store.prepareLoad(result.project);
      if(snapshot()===false)throw Error('History could not preserve the project. Save before editing.');
      store.commit(prepared,{sync:true,intent:'nativeRecoveryFields'});notify('nativeRecoveryFields');}
    fieldKey='';refresh();status.textContent=result.changed?'Applied '+label+'. Save, build or replay current output.':'The current native values already match.';
  }
  applyCount.onclick=()=>applyNativeEntry();resetCount.onclick=()=>applyNativeEntry(true);
  entryChoice.onchange=()=>{selectionKey='';refresh();};
  entrySource.onclick=()=>{if(fieldState)void read(fieldState.health.source,S.nativeGame.sourceSha256);};
  entryWitness.onclick=()=>{const index=witnessIndex();if(index>=0){events.value=String(index);showEvent();detail.scrollIntoView?.({block:'nearest'});}};
  function selectEntry(offset){refresh();const field=entryFields().find(field=>field.offset===offset);if(!field)throw Error('This source entry has no native writer.');entryChoice.value=field.id;selectionKey='';refresh();writer.scrollIntoView?.({block:'center'});entryChoice.focus();}
  const policies=make('section','punchOutRecoveryPolicies'),conditionRow=make('select','punchOutConditionRow'),
    conditionMode=make('select','punchOutConditionMode'),conditionMinimum=make('select','punchOutConditionMinimum'),
    conditionApply=make('button','punchOutConditionApply','Apply preferred condition'),conditionReset=make('button','punchOutConditionReset','Reset condition to source'),
    conditionSource=make('button','punchOutConditionSource','Read preserved condition'),conditionOutput=make('button','punchOutConditionOutput','Read replay condition'),
    conditionStatus=make('p','punchOutConditionStatus'),poolSlot=make('select','punchOutPoolSlot'),poolCount=make('select','punchOutPoolCount'),
    poolGroup=make('input','punchOutPoolGroup'),poolApply=make('button','punchOutPoolApply','Apply fallback count'),poolReset=make('button','punchOutPoolReset','Reset fallback count to source'),
    poolSource=make('button','punchOutPoolSource','Read preserved fallback slot'),poolFollow=make('button','punchOutPoolFollow','Follow fallback slot in replay'),poolStatus=make('p','punchOutPoolStatus'),
    policyLesson=make('button','punchOutPolicyLesson','Conditions and fallback counts lesson');
  for(const [value,text] of [['state','Mac state equals $0D'],['health','Mac health at least the minimum'],['first-minute','Round 1 before 1:00 and Mac health at least the minimum']]){const option=make('option',null,text);option.value=value;conditionMode.append(option);}
  poolGroup.type='checkbox';const poolGroupLabel=make('label');poolGroupLabel.append(poolGroup,document.createTextNode(' Apply to all eight fallback pool slots'));
  policies.append(make('h3',null,'Preferred conditions and fallback count pool'),
    make('p',null,'A row condition chooses its preferred entry; otherwise the original alternative-slot rule runs. A zero CONDITION means Mac state $0D. A zero ENTRY exits recovery selection and stays protected. Fallback counts use a separate eight-slot pool; a fallback nine does not set the direct-count nine reaction tag. The three original fifth-attempt exit slots have controls below. The sixth row and all instructions stay protected.'),
    labeled('Condition for attempt',conditionRow),labeled('Preferred branch requires',conditionMode),labeled('Mac health minimum (raw byte)',conditionMinimum),
    conditionApply,conditionReset,conditionSource,conditionOutput,conditionStatus,
    labeled('Fallback count pool slot',poolSlot),labeled('Count supplied by that pool slot',poolCount),poolGroupLabel,poolApply,poolReset,poolSource,poolFollow,poolStatus,policyLesson);
  root.append(policies);conditionStatus.setAttribute('role','status');poolStatus.setAttribute('role','status');
  for(const button of [conditionApply,conditionReset,conditionSource,conditionOutput,poolApply,poolReset,poolSource,poolFollow,policyLesson])button.type='button';
  let policyKey='',conditionKey='',poolKey='',conditionField=null,poolField=null;
  const conditionFields=()=>fieldList.filter(field=>field.recoveryField==='condition'),poolFields=()=>fieldList.filter(field=>field.recoveryField==='fallback-count');
  const conditionName=value=>value===0?'Mac state $0D':((value&128)?'Round 1 before 1:00; ':'')+'Mac HP byte ≥ '+(value&127);
  function conditionWitness(){return conditionField&&lastReport?.sourceSha256===S.nativeGame?.sourceSha256&&lastReport.projectEpoch===store.state.epoch?
    lastReport.sourceEvents.find(event=>event.kind==='opponent-recovery-entry'&&event.decision?.attempt===conditionField.conditionAttempt):null;}
  function poolWitness(){return poolField&&lastReport?.sourceSha256===S.nativeGame?.sourceSha256&&lastReport.projectEpoch===store.state.epoch?
    lastReport.sourceEvents.findIndex(event=>event.recovery?.route==='fallback-pool'&&event.recovery.fallbackSlot===poolField.poolSlot):-1;}
  function renderMinimum(value=Number(conditionMinimum.value)){
    const mode=conditionMode.value,first=mode==='first-minute';conditionMinimum.replaceChildren();
    for(let n=first?0:1;n<=96;n++){const option=make('option',null,String(n));option.value=String(n);conditionMinimum.append(option);}
    conditionMinimum.value=String(Math.max(first?0:1,Math.min(96,Number.isFinite(value)?value:96)));conditionMinimum.disabled=busy||!conditionField||mode==='state';
  }
  function refreshPolicies(unavailable){
    policies.hidden=writer.hidden;
    if(!busy){
      if(policyKey!==fieldKey){const c=conditionRow.value,p=poolSlot.value;conditionRow.replaceChildren();poolSlot.replaceChildren();
        for(const f of conditionFields()){const o=make('option',null,'Attempt '+f.conditionAttempt);o.value=f.id;conditionRow.append(o);}
        for(const f of poolFields()){const o=make('option',null,'Pool slot '+(f.poolSlot+1));o.value=f.id;poolSlot.append(o);}
        conditionRow.value=conditionFields().some(f=>f.id===c)?c:conditionFields()[0]?.id||'';poolSlot.value=poolFields().some(f=>f.id===p)?p:poolFields()[0]?.id||'';
        policyKey=fieldKey;conditionKey=poolKey='';}
      if(conditionKey!==fieldKey+conditionRow.value){conditionField=conditionFields().find(f=>f.id===conditionRow.value)||null;
        const value=conditionField?.value||0;conditionMode.value=value===0?'state':value&128?'first-minute':'health';renderMinimum(value&127);conditionKey=fieldKey+conditionRow.value;}
      if(poolKey!==fieldKey+poolSlot.value){poolField=poolFields().find(f=>f.id===poolSlot.value)||null;poolCount.replaceChildren();
        for(const value of poolField?.values||[]){const o=make('option',null,'Count '+value);o.value=String(value);poolCount.append(o);}
        if(poolField)poolCount.value=String(poolField.value);poolGroup.checked=false;poolKey=fieldKey+poolSlot.value;}
    }
    for(const b of [conditionRow,conditionMode,conditionApply,conditionReset,conditionSource])b.disabled=unavailable||!conditionField;
    conditionMinimum.disabled=unavailable||!conditionField||conditionMode.value==='state';conditionOutput.disabled=unavailable||!conditionWitness();
    for(const b of [poolSlot,poolCount,poolGroup,poolApply,poolReset,poolSource])b.disabled=unavailable||!poolField;
    poolFollow.disabled=unavailable||poolWitness()<0;policyLesson.disabled=busy;
    conditionStatus.textContent=conditionField?'Preserved source: '+conditionName(conditionField.sourceValue)+' ('+hex(conditionField.sourceByte,2)+'). Current native build: '+conditionName(conditionField.value)+' ('+hex(conditionField.outputByte,2)+'). The chosen condition has a replay link only after this row is observed.':'Open a supported source to edit preferred conditions.';
    poolStatus.textContent=poolField?'Preserved pool counts: '+poolFields().map(f=>f.sourceValue).join(', ')+'. Current native build: '+poolFields().map(f=>f.value).join(', ')+'. Selected slot '+(poolField.poolSlot+1)+': source '+hex(poolField.sourceByte,2)+', current '+hex(poolField.outputByte,2)+'. Slot selection is native; no uniform-RNG probability is assumed.':'Open a supported source to edit fallback count slots.';
  }
  conditionRow.onchange=()=>{conditionKey='';refresh();};poolSlot.onchange=()=>{poolKey='';refresh();};conditionMode.onchange=()=>renderMinimum();
  function applyCondition(reset){try{if(!conditionField)throw Error('Choose a condition.');const value=reset?conditionField.sourceValue:conditionMode.value==='state'?0:Number(conditionMinimum.value)+(conditionMode.value==='first-minute'?128:0);
    commitChanges([{field:conditionField.id,value}],'preferred condition');}catch(error){status.textContent=error.message;}}
  conditionApply.onclick=()=>applyCondition(false);conditionReset.onclick=()=>applyCondition(true);
  conditionSource.onclick=()=>{if(conditionField)void read(conditionField.source,S.nativeGame.sourceSha256);};
  conditionOutput.onclick=async()=>{try{if(!conditionWitness())throw Error('This condition has no matching current replay witness.');await api.inspectOutput(conditionField.source,lastReport.sourceSha256,lastReport.nativeOutputSha256);}catch(error){status.textContent=error.message;}};
  function applyPool(reset){try{if(!poolField)throw Error('Choose a fallback pool slot.');const fields=poolGroup.checked?poolFields():[poolField];
    commitChanges(fields.map(f=>({field:f.id,value:reset?f.sourceValue:Number(poolCount.value)})),'fallback count pool');}catch(error){status.textContent=error.message;}}
  poolApply.onclick=()=>applyPool(false);poolReset.onclick=()=>applyPool(true);poolSource.onclick=()=>{if(poolField)void read(poolField.source,S.nativeGame.sourceSha256);};
  poolFollow.onclick=()=>{const index=poolWitness();if(index>=0){events.value=String(index);showEvent();detail.scrollIntoView?.({block:'nearest'});}};
  policyLesson.onclick=()=>services.ProjectLessons.open({chapter:'punch-out',anchor:'punch-out-27-edit-preferred-conditions-and-fallback-counts'});
  const fifth=make('section','punchOutFifthExits'),fifthChoice=make('select','punchOutFifthSlot'),fifthMode=make('select','punchOutFifthMode'),fifthHealth=make('select','punchOutFifthHealth'),
    fifthGroup=make('input','punchOutFifthGroup'),fifthApply=make('button','punchOutFifthApply','Apply fifth-attempt result'),fifthReset=make('button','punchOutFifthReset','Reset fifth-attempt result to source'),
    fifthSource=make('button','punchOutFifthSource','Read preserved fifth-attempt slot'),fifthFollow=make('button','punchOutFifthFollow','Follow activated slot in replay'),
    fifthLesson=make('button','punchOutFifthLesson','Fifth-attempt exit lesson'),fifthStatus=make('p','punchOutFifthStatus');
  for(const [value,label] of [['exit','Exit without a get-up target'],['fallback','Use fallback count with a health target']]){const option=make('option',null,label);option.value=value;fifthMode.append(option);}
  for(let n=8;n<=96;n+=8){const option=make('option',null,String(n));option.value=String(n);fifthHealth.append(option);}
  fifthGroup.type='checkbox';const fifthGroupLabel=make('label');fifthGroupLabel.append(fifthGroup,document.createTextNode(' Apply to all three original fifth-attempt exit slots'));
  fifth.append(make('h3',null,'Fifth-attempt exit / fallback slots'),make('p',null,'Alternative slots 2, 4 and 6 originally contain zero. Keep the native exit or activate a fallback get-up with health 8–96. Zero skips the health store; it is not a health-zero target. Counts still come from the separate pool. The sixth row stays protected as the verified table boundary. A ten-count alone cannot identify which zero slot was read.'),
    labeled('Original fifth-attempt exit slot',fifthChoice),labeled('Recovery result',fifthMode),labeled('Fallback health target',fifthHealth),fifthGroupLabel,
    fifthApply,fifthReset,fifthSource,fifthFollow,fifthLesson,fifthStatus);root.append(fifth);fifthStatus.setAttribute('role','status');
  for(const b of [fifthApply,fifthReset,fifthSource,fifthFollow,fifthLesson])b.type='button';
  let fifthListKey='',fifthKey='',fifthField=null;
  const fifthFields=()=>fieldList.filter(f=>f.recoveryField==='fifth-exit-health');
  const fifthValue=value=>value===0?'Exit (no health write)':'Fallback get-up · health '+value;
  function fifthWitnessIndex(){return fifthField&&lastReport?.sourceSha256===S.nativeGame?.sourceSha256&&lastReport.projectEpoch===store.state.epoch?
    lastReport.sourceEvents.findIndex(e=>e.kind==='opponent-recovery-entry'&&e.related?.fileOffset===fifthField.offset):-1;}
  function refreshFifth(unavailable){
    fifth.hidden=writer.hidden;
    if(!busy){
      if(fifthListKey!==fieldKey){const previous=fifthChoice.value;fifthChoice.replaceChildren();for(const f of fifthFields()){const o=make('option',null,'Attempt 5 · alternative '+f.entry.slot);o.value=f.id;fifthChoice.append(o);}
        fifthChoice.value=fifthFields().some(f=>f.id===previous)?previous:fifthFields()[0]?.id||'';fifthListKey=fieldKey;fifthKey='';}
      if(fifthKey!==fieldKey+fifthChoice.value){fifthField=fifthFields().find(f=>f.id===fifthChoice.value)||null;fifthMode.value=fifthField?.value?'fallback':'exit';fifthHealth.value=String(fifthField?.value||48);fifthGroup.checked=false;fifthKey=fieldKey+fifthChoice.value;}
    }
    for(const b of [fifthChoice,fifthMode,fifthGroup,fifthApply,fifthReset,fifthSource])b.disabled=unavailable||!fifthField;
    fifthHealth.disabled=unavailable||!fifthField||fifthMode.value==='exit';fifthFollow.disabled=unavailable||fifthWitnessIndex()<0;fifthLesson.disabled=busy;
    fifthStatus.textContent=fifthField?'Preserved source: '+fifthValue(fifthField.sourceValue)+' ('+hex(fifthField.sourceByte,2)+'). Current native build: '+fifthValue(fifthField.value)+' ('+hex(fifthField.outputByte,2)+'). Activated slots have links only after an observed health write. Zero exits have no per-slot write witness.':'Open a supported source to inspect fifth-attempt exit slots.';
  }
  fifthChoice.onchange=()=>{fifthKey='';refresh();};fifthMode.onchange=()=>{fifthHealth.disabled=busy||!fifthField||fifthMode.value==='exit';};
  function applyFifth(reset){try{if(!fifthField)throw Error('Choose a fifth-attempt slot.');const fields=fifthGroup.checked?fifthFields():[fifthField];
    commitChanges(fields.map(f=>({field:f.id,value:reset?f.sourceValue:fifthMode.value==='exit'?0:Number(fifthHealth.value)})),'fifth-attempt exit / fallback result');}catch(error){status.textContent=error.message;}}
  fifthApply.onclick=()=>applyFifth(false);fifthReset.onclick=()=>applyFifth(true);fifthSource.onclick=()=>{if(fifthField)void read(fifthField.source,S.nativeGame.sourceSha256);};
  fifthFollow.onclick=()=>{const index=fifthWitnessIndex();if(index>=0){events.value=String(index);showEvent();detail.scrollIntoView?.({block:'nearest'});}};
  fifthLesson.onclick=()=>services.ProjectLessons.open({chapter:'punch-out',anchor:'punch-out-28-edit-fifth-attempt-exit-slots'});
  const sourceContext=make('p','punchOutEventSourceContext'),tables=make('button','punchOutEventTables','Inspect native event tables');tables.type='button';
  const catalogText=make('p','punchOutEventCatalog'),catalogActions=make('div'),events=make('select','punchOutEventSelect'),detail=make('pre','punchOutEventDetail');
  events.setAttribute('aria-label','Observed native fight event');
  const actions=make('div'),readCode=make('button','punchOutEventCode','Read writer instruction'),readData=make('button','punchOutEventData','Read preserved script / data'),readOutput=make('button','punchOutEventOutput','Read replay output'),glyph=make('button','punchOutEventGlyph','Preview count glyph'),exportEvidence=make('button','punchOutEventExport','Export replay evidence');
  for(const b of [readCode,readData,readOutput,glyph,exportEvidence]){b.type='button';actions.append(b);}
  const lesson=make('button','punchOutEventLesson','Fight event lesson');lesson.type='button';lesson.onclick=()=>services.ProjectLessons.open({chapter:'punch-out',anchor:'punch-out-23-native-knockdown-count-and-round-evidence'});
  const recoveryLesson=make('button','punchOutRecoveryLesson','Get-up decision lesson');recoveryLesson.type='button';recoveryLesson.onclick=()=>services.ProjectLessons.open({chapter:'punch-out',anchor:'punch-out-24-follow-glass-joes-conditional-get-up-decision'});
  root.append(make('h3',null,'Native event evidence'),sourceContext,tables,lesson,recoveryLesson,catalogText,catalogActions,events,actions,detail);
  let lastReport=null,tableContext=null,lastRun=null,seen=0,busy=false,lastCanRestore=false;
  const hex=(n,width=4)=>'$'+Number(n).toString(16).toUpperCase().padStart(width,'0');
  const selected=()=>lastReport?.sourceEvents?.[Number(events.value)]||null;
  const matches=sha=>!!sha&&S.nativeGame?.sourceSha256===sha;
  const read=async(target,sha)=>{try{await api.inspectSource(target,sha);}catch(error){status.textContent=error.message;}};
  function refresh(){
    refreshWriter();
    const event=selected(),eventCurrent=matches(lastReport?.sourceSha256),tableCurrent=matches(tableContext?.sourceSha256);
    readCode.disabled=busy||!eventCurrent||!event?.instruction;readData.disabled=busy||!eventCurrent||!(event?.script||event?.related);
    glyph.disabled=busy||!eventCurrent||event?.kind!=='referee-count';exportEvidence.disabled=busy||!lastReport;
    readOutput.disabled=busy||!eventCurrent||!event||lastReport?.projectEpoch!==store.state.epoch;
    restore.disabled=busy||!lastCanRestore||lastReport?.projectEpoch!==store.state.epoch;
    tables.disabled=busy||!S.nativeGame?.adapter?.startsWith('punch-out-');lesson.disabled=recoveryLesson.disabled=busy;
    for(const b of catalogActions.querySelectorAll('button'))b.disabled=busy||!tableCurrent;
    sourceContext.textContent=[lastReport?'Event evidence: '+services.SourceContext.describe({sha256:lastReport.sourceSha256},{valid:eventCurrent}).label+' · SHA-256 '+lastReport.sourceSha256:'',
      lastReport?'Replay native-output SHA-256 '+lastReport.nativeOutputSha256:'',
      lastReport?(lastReport.projectEpoch===store.state.epoch?'Replay output: hash verified when opened. Preserved source and native output can differ.':'Detached replay output: run the current project again. Preserved source links can still match.'):'',
      tableContext?'Source tables: '+services.SourceContext.describe({sha256:tableContext.sourceSha256},{valid:tableCurrent}).label+' · preserved source SHA-256 '+tableContext.sourceSha256:''].filter(Boolean).join('\n')||'Inspect source tables or run a replay to collect event evidence.';
  }
  function showEvent(){
    const event=selected();
    detail.textContent=event?event.label+' · frame '+event.frame+' · '+(event.ramSeedsApplied?'RAM-seeded context':'Controller-input context')+'\n'+
      'Writer: PRG bank '+event.instruction.bank8KiB+' · CPU '+hex(event.instruction.cpuAddress)+' · file '+hex(event.instruction.fileOffset,5)+'\n'+
      (event.script?'Script/data: PRG bank '+event.script.bank8KiB+' · CPU '+hex(event.script.cpuAddress)+' · file '+hex(event.script.fileOffset,5)+'\n':'')+
      (event.script||event.related?.kind==='table-data'?'Script/table bytes are data; the general RE pane also shows candidate 6502 decoding.\n':'')+'RAM '+hex(event.address)+': '+hex(event.before,2)+' → '+hex(event.value,2)+'\n'+event.scope:'Native instructions and script/table operands appear here when their observed write is proven.';
    const d=event?.recovery||event?.decision;
    if(d)detail.textContent+='\nRecovery attempt '+d.attempt+' · '+d.branch+' · row byte +'+d.column+' · packed '+hex(d.packedByte,2)+
      '\nHealth target '+d.hpTarget+' · '+(d.route==='direct-count'?'direct count '+d.count:d.route==='fallback-pool'?'fallback pool':'exit selector')+
      '\nEntry: fighter bank '+d.source.bank8KiB+' · CPU '+hex(d.source.cpuAddress)+' · file '+hex(d.source.fileOffset,5)+
      (d.fallbackSlot!==undefined&&d.fallbackSlot!==null?'\nObserved fallback slot '+d.fallbackSlot+' → count '+event.count:'');
    if(d)detail.textContent+='\nCondition '+conditionName(d.condition.kind==='mac-state'?0:d.condition.minimum+(d.condition.kind==='first-minute-health'?128:0))+' · observed Mac HP '+d.macHealth+', Mac state '+hex(d.macState,2)+', round '+d.round+', minute byte '+d.minutes;
    if(event?.recovery)detail.textContent+='\nObserved shared native reaction tag $03CB: '+event.recovery.modeTag;
    refresh();
  }
  function showCatalog(value){
    tableContext=value;const c=value.catalog;catalogActions.replaceChildren();
    catalogText.textContent='Shared round clock: '+c.roundLimit.value+' '+c.roundLimit.unit+'. Glass Joe fallback count selectors: '+c.fallbackGetUpPool.counts.join(', ')+'. Conditional recovery rules can choose another path. The referee count script is shared by the observed Mac and Glass Joe paths.';
    for(const [label,target] of [['Inspect clock check',c.roundLimit.source],['Inspect count script',c.countProgram.source],['Inspect Glass Joe fallback pool',c.fallbackGetUpPool.source]]){
      const b=make('button',null,label);b.type='button';b.onclick=()=>void read(target,value.sourceSha256);catalogActions.append(b);
    }
    const editPool=make('button',null,'Edit fallback counts');editPool.type='button';editPool.onclick=()=>{policies.scrollIntoView?.({block:'center'});poolSlot.focus();};catalogActions.append(editPool);
    const recovery=c.recovery;
    catalogActions.append(make('h4',null,'Glass Joe recovery decisions · inspection'));
    catalogActions.append(make('p',null,'Preserved source rows. Shared fixed-bank code selects an entry in Glass Joe’s fighter bank. High nibble: direct count, or fallback when zero. Low nibble × 8: health target. A zero byte exits the selector. The separate writer above edits five live preferred counts and the 32 live health targets; row links inspect preserved source bytes. The sixth row and instructions stay protected; separate controls edit five conditions, eight pool counts and the three original fifth-attempt exit slots.'));
    for(const [label,target] of [['Inspect recovery pointer',recovery.pointer],['Inspect condition / slot code',recovery.selector],['Inspect packed health code',recovery.hpWriter],['Inspect count-nibble code',recovery.countReader],['Inspect TKO / bypass gates',recovery.gates]]){
      const b=make('button',null,label);b.type='button';b.onclick=()=>void read(target,value.sourceSha256);catalogActions.append(b);
    }
    for(const target of recovery.modeSources){const b=make('button',null,target.label);b.type='button';b.onclick=()=>void read(target,value.sourceSha256);catalogActions.append(b);}
    const table=make('table','punchOutRecoveryRows'),head=make('tr');
    for(const title of ['Attempt','Preferred condition','Preferred entry','Other slots','Source'])head.append(make('th',null,title));
    const thead=make('thead');thead.append(head);table.append(thead);const body=make('tbody');
    const showEntry=e=>e.route==='exit-selector'?'Exit selector':(e.route==='fallback-pool'?'Pool':'Count '+e.count)+' / HP '+e.hpTarget;
    for(const row of recovery.rows){
      const tr=make('tr'),condition=row.condition.kind==='mac-state'?'Mac state '+hex(row.condition.value,2):
        (row.condition.kind==='first-minute-health'?'Round 1 before 1:00; ':'')+'Mac HP byte ≥ '+row.condition.minimum;
      for(const text of [String(row.attempt),condition,showEntry(row.preferred),row.alternatives.map(e=>showEntry(e)+' ×'+e.multiplicity).join('; ')])tr.append(make('td',null,text));
      const td=make('td'),b=make('button',null,'Read attempt '+row.attempt+' row');b.type='button';b.onclick=()=>void read(row.source,value.sourceSha256);td.append(b);
      for(const [label,entry] of [['Edit preferred entry',row.preferred],['Edit live alternative health',row.alternatives.find(entry=>entry.raw!==0)]])if(entry&&entry.raw!==0){
        const edit=make('button',null,label);edit.type='button';edit.onclick=()=>{try{if(!matches(value.sourceSha256))throw Error('Open this source project first.');selectEntry(entry.source.fileOffset);}catch(error){status.textContent=error.message;}};td.append(edit);
      }if(row.attempt<=5){const edit=make('button',null,'Edit preferred condition');edit.type='button';edit.onclick=()=>{const field=conditionFields().find(f=>f.conditionAttempt===row.attempt);if(field){conditionRow.value=field.id;conditionKey='';refresh();policies.scrollIntoView?.({block:'center'});conditionMode.focus();}};td.append(edit);}
      if(row.attempt===5){const edit=make('button',null,'Edit fifth-attempt exit slots');edit.type='button';edit.onclick=()=>{refresh();fifth.scrollIntoView?.({block:'center'});fifthChoice.focus();};td.append(edit);}
      tr.append(td);body.append(tr);
    }
    table.append(body);const wrapper=make('div','punchOutRecoveryTableWrap');wrapper.append(table);catalogActions.append(wrapper,
      make('p',null,'Other-slot multiplicities are 2,2,1,1,1,1 over the native low three input bits; this is not a uniform-RNG claim. Known fight-pointer uses of this row range: '+recovery.knownFightPointerUses.map(f=>f.label).join(', ')+'. Arbitrary other consumers remain unverified.'));
    refresh();
  }
  tables.onclick=()=>{try{showCatalog(api.inventory());}catch(error){status.textContent=error.message;}};
  events.onchange=showEvent;
  readCode.onclick=()=>void read(selected()?.instruction,lastReport?.sourceSha256);
  readData.onclick=()=>void read(selected()?.script||selected()?.related,lastReport?.sourceSha256);
  readOutput.onclick=async()=>{try{const event=selected();await api.inspectOutput(event?.script||event?.related||event?.instruction,lastReport?.sourceSha256,lastReport?.nativeOutputSha256);}catch(error){status.textContent=error.message;}};
  glyph.onclick=()=>{try{if(!matches(lastReport?.sourceSha256))throw Error('Open this evidence’s source project first.');services.PunchOutFightUI.showRefereeCommand(0x99+selected().count);}catch(error){status.textContent=error.message;}};
  exportEvidence.onclick=()=>{if(lastReport&&!busy)download(new TextEncoder().encode(JSON.stringify(lastReport,null,2)),'Punch_Out_Native_Replay_Evidence.json','application/json');};
  // Play view owns the canvas and moves it into its controls wrapper during
  // startup. Insert before the view's direct child containing that canvas;
  // passing the nested canvas to view.insertBefore throws and aborts the
  // remaining application bootstrap, including Resources and appearance.
  const view = document.getElementById('emuView');
  let anchor = document.getElementById('emuCanvas');
  while (anchor && anchor.parentNode !== view) anchor = anchor.parentNode;
  view.insertBefore(root, anchor);
  const launch = make('button', 'punchOutReplayOpen', 'Open Glass Joe native replay'); launch.type = 'button';
  document.getElementById('punchOutContentPanel').appendChild(launch);
  launch.onclick = () => { switchTab('emu'); root.open = true; root.scrollIntoView?.({block: 'nearest'}); };
  run.onclick = async () => { try { await api.run(choice.value); } catch (e) { status.textContent = e.message; } };
  stop.onclick = () => api.cancel(); restore.onclick = () => { try { api.restore(); } catch (e) { status.textContent = e.message; } };
  for (const b of [run, stop, restore]) b.type = 'button';
  evidence.style.cssText = 'white-space:pre-wrap;max-height:180px;overflow:auto;font-size:10px';
  root.style.cssText = 'font-size:11px;border:1px solid var(--bdr);padding:8px;max-width:900px;width:100%;min-width:0;box-sizing:border-box';
  api.subscribe(s => { busy=s.busy;lastCanRestore=s.canRestore;run.disabled = s.busy; stop.disabled = !s.busy; restore.disabled = !s.canRestore;
    status.textContent = s.report ? s.report.status + ' · ' + s.report.observedFrames + ' native frames · ' + (s.report.stop || 'original-engine playback') : 'Choose a recovered Punch-Out project, then run the declared sequence.';
    evidence.textContent = s.report ? JSON.stringify({kind: s.report.kind,experimentType:s.report.experimentType, last: s.report.last,
      milestones: s.report.milestones.map(m => ({name: m.name, frame: m.frame})), seeds: s.report.seeds, audio: s.report.audio}, null, 2) : '';
    lastReport=s.report;
    if(s.report){
      if(lastRun!==s.report.runId){lastRun=s.report.runId;seen=0;events.replaceChildren();showCatalog({sourceSha256:s.report.sourceSha256,catalog:s.report.sourceCatalog});}
      for(;seen<s.report.sourceEvents.length;seen++){const event=s.report.sourceEvents[seen],option=make('option',null,'Frame '+event.frame+' · '+event.label);option.value=String(seen);events.append(option);}
      if(events.value==='')events.value='0';
    }
    showEvent();
  });
  const style=make('style');style.textContent='#punchOutReplayPanel button,#punchOutReplayKind,#punchOutEventSelect{min-height:40px;max-width:100%;box-sizing:border-box;white-space:normal}#punchOutReplayPanel button{max-width:calc(100% - 6px);margin:3px}#punchOutReplayKind,#punchOutEventSelect{width:100%;min-width:0;margin:3px 0}#punchOutEventSourceContext,#punchOutEventCatalog{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6}#punchOutEventDetail{white-space:pre-wrap;overflow-wrap:anywhere;max-height:220px;overflow:auto}#punchOutRecoveryWriter{border:1px solid var(--bdr);padding:8px;margin:8px 0;max-width:100%;box-sizing:border-box}#punchOutRecoveryWriter label,#punchOutRecoveryPolicies label,#punchOutFifthExits label{display:block;margin:6px 0}#punchOutFifthExits select,#punchOutRecoveryPolicies select,#punchOutRecoveryCount,#punchOutRecoveryHealth,#punchOutRecoveryEntry{min-height:40px;max-width:100%;min-width:0;box-sizing:border-box}#punchOutRecoveryEntry,#punchOutConditionMode{width:100%}#punchOutRecoveryPolicies,#punchOutFifthExits{border:1px solid var(--bdr);padding:8px;max-width:100%;box-sizing:border-box}#punchOutFifthStatus,#punchOutConditionStatus,#punchOutPoolStatus{overflow-wrap:anywhere;line-height:1.6}#punchOutRecoveryTableWrap{max-width:100%;overflow:auto}#punchOutRecoveryRows{border-collapse:collapse;width:100%;min-width:600px;font-size:10px}#punchOutRecoveryRows td,#punchOutRecoveryRows th{border:1px solid var(--bdr);padding:5px;vertical-align:top;text-align:left}';document.head.append(style);
  services.PunchOutReplayUI=Object.freeze({refresh,openRecoveryWriter(){switchTab('emu');root.open=true;refresh();writer.scrollIntoView?.({block:'center'});entryChoice.focus();}});
  for (const type of ['keydown', 'keyup']) root.addEventListener(type, e => e.stopPropagation?.());
})();
