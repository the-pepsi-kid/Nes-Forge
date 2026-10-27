/* In-app lessons are the offline handbook's generated chapters and anchors.
 * Context selects a reading destination only: no editor asset, binding, native
 * recipe, history or saved project changes. Existing Tech Docs stay underneath.
 */
(() => {
  'use strict';
  const services=Forge.services,data=services.ProjectLessonData;
  const chapters=new Map(data.chapters.map(chapter=>[chapter.id,chapter]));
  const kindChapters={'punch-out':'punch-out',metroid:'metroid',lolo:'lolo','river-city':'river-city',shadowgate:'shadowgate',contra:'native-pages',ff:'native-pages',megaman:'native-pages'};
  let chosen=null,anchor='',returnTab='scene',context=null;
  const el=(tag,id,text)=>{const node=document.createElement(tag);if(id)node.id=id;if(text!==undefined)node.textContent=text;return node;};
  function headings(id) {
    const holder=el('div');holder.innerHTML=chapters.get(id)?.html||'';
    return [...holder.querySelectorAll('h1[id],h2[id],h3[id]')].map(node=>({id:node.id,text:node.textContent}));
  }
  function section(id,text){return headings(id).find(item=>item.text.toLowerCase().includes(text.toLowerCase()))?.id||'';}
  function recommend(input={}) {
    const editor=input.editor||({pose:'metasprites',tile:'chr',chr:'chr',world:'world',audio:'audio',animation:'anim'}[input.kind])||S.tab,selection=services.ResourceContext.selection();
    // Independent RE/Audio and the multi-file workspace have their own inputs.
    // Reading help must not silently substitute the active native project's ROM.
    const nativeAudio=editor==='audio'?services.NativeAudioLibraryUI.getState():null;
    if(!input.profile&&!input.sceneId&&nativeAudio?.opened&&nativeAudio.sourceSha256)
      input={...input,profile:nativeAudio.profile,sourceSha256:nativeAudio.sourceSha256,sourceValid:nativeAudio.isCurrent,
        name:services.NativeAudioLibraryUI.catalog()?.profile?.title};
    const inspected=editor==='disasm'&&!input.profile&&!input.sceneId&&!input.poseId?services.REAnalysisUI.currentAnalysis()?.report?.identity:null;
    const independentCode=editor==='code'&&!input.profile&&!input.sceneId&&!document.getElementById('sourceWorkspace').hidden;
    const selected=editor==='metasprites'?Forge163.metasprites.current:editor==='chr'?services.ResourceContext.chrUsage()?.frame:null;
    const pose=S.metasprites.find(p=>p.id===(input.poseId||selected?.id||selection.poseId));
    const scene=S.scenes.find(sc=>sc.id===(input.sceneId||pose?.sceneId||selection.sceneId))||S.scenes[S.activeScene];
    const receipt=services.ResourceContext.source(scene),active=services.SourceContext.project();
    const sha=input.sourceSha256||inspected?.sha256||receipt?.sha256||active?.sha256;
    const owned=!!sha&&sha===active?.sha256;
    const profile=input.profile||(owned?S.nativeGame?.adapter:null)||(!inspected?receipt?.profile:null)||(!inspected&&owned?S.investigation?.source?.profile:null);
    const adapter=NativePRGResources.profiles.find(p=>p.id===profile||p.sha256===sha);
    const game=GameRENative.profiles.find(p=>p.id===profile||p.sha256===sha);
    const audio=services.NativeAudioCatalog.profiles.find(p=>p.id===profile||p.sha256===sha);
    const audioGame=audio&&GameRENative.profiles.find(p=>p.sha256===audio.sha256);
    const audioAdapter=audio&&NativePRGResources.profiles.find(p=>p.sha256===audio.sha256);
    const capability=services.ProjectCapabilities.describe(S);
    let chapter=kindChapters[adapter?.kind||audioAdapter?.kind]||'general',topic='';
    const gameId=game?.id||audioGame?.id;
    if(gameId==='zelda2-us'||owned&&capability.nativeWorld||owned&&S.nativeGame?.profile===NativeEngineFormat.id)chapter='zelda2';
    if(gameId==='ninja-gaiden-us'||owned&&S.nativeGame?.profile==='ninja-gaiden-preserved-v1')chapter='ninja';
    if(owned&&services.NativeLayoutProject.matches(S))chapter='native-pages';
    if(chapter==='metroid'&&editor==='audio')chapter='metroid-audio';
    if(chapter==='lolo'&&editor==='audio')chapter='lolo-audio';
    if(chapter==='punch-out'){
      if(editor==='audio')topic='7. Audio';
      else if(editor==='code')topic='9. Independent RE';
      else if(editor==='metasprites'&&(scene.captureMeta?.punchOutPose||scene.captureMeta?.punchOutIncrementalPose))
        topic=scene.captureMeta.punchOutIncrementalPose?'17. Edit native idle':'16. Move a native';
      else if(editor==='chr'||input.kind==='chr'||input.kind==='tile')topic='19. Follow a pose';
      else if(scene.captureMeta?.punchOutArena)topic='2. First lesson';
      else topic='18. Find the supported';
    }
    if(inspected&&chapter==='general')topic='5. Manual RE';
    if(independentCode){chapter='general';topic='8. Writing 6502';}
    if(!S.nativeGame&&!profile&&!sha&&!independentCode&&!inspected)topic=editor==='code'?'8. Writing 6502':editor==='audio'?'audio':'';
    return {chapter,anchor:topic?section(chapter,topic):'',editor,resourceId:input.resourceKey||pose?.id||scene?.id||null,
      title:independentCode?'6502 Source Workspace':input.name||inspected?.name||adapter?.label||game?.name||audio?.title||capability.title,
      scope:capability.scope,source:independentCode?{role:'independent',label:'Independent multi-file source workspace'}:
        services.SourceContext.describe({sha256:sha},{valid:input.sourceValid??(inspected?!services.REAnalysisUI.getState().pendingSelection:true),kind:input.sourceKind||'rom'}),reason:topic||'Project method and supported scope'};
  }
  function render(host) {
    let root=host.querySelector('#projectLessons');
    if(!root){root=el('section','projectLessons');host.prepend(root);}
    if(!chosen){context=recommend();chosen=context.chapter;anchor=context.anchor;}
    if(!chapters.has(chosen))chosen='general';
    root.replaceChildren();
    root.append(el('h2','projectLessonsTitle','Project lessons'),el('p','projectLessonContext',context?
      context.title+' · '+context.source.label+' · '+context.reason:'Choose a lesson.'));
    const scope=el('p','projectLessonScope',context?'Active project output: '+context.scope:'');root.append(scope);
    const controls=el('div','projectLessonControls'),chapter=el('select','projectLessonChapter'),topics=el('select','projectLessonSection');
    chapter.setAttribute('aria-label','Project lesson');topics.setAttribute('aria-label','Lesson section');
    for(const item of data.chapters){const option=el('option',null,item.title);option.value=item.id;chapter.append(option);}chapter.value=chosen;
    const first=el('option',null,'Start of lesson');first.value='';topics.append(first);
    for(const item of headings(chosen)){const option=el('option',null,item.text);option.value=item.id;topics.append(option);}topics.value=anchor;
    const current=el('button','projectLessonCurrent','Lesson for current editor'),back=el('button','projectLessonReturn','Return to editor');current.type=back.type='button';
    current.onclick=()=>{context=recommend({editor:returnTab});chosen=context.chapter;anchor=context.anchor;render(host);jump();};
    back.onclick=()=>switchTab(returnTab==='docs'?'scene':returnTab);
    chapter.onchange=()=>{chosen=chapter.value;anchor='';render(host);jump();};topics.onchange=()=>{anchor=topics.value;jump();};
    controls.append(chapter,topics,current,back);root.append(controls);
    root.append(el('p',null,'Read-only lessons. The current capability strip describes available writers; historical acceptance notes retain their own scope. The developer guide covers independent RE, assembly, hex, JSON and application HTML changes.'));
    const article=el('article','projectLessonBody');article.innerHTML='<section id="'+chosen+'">'+chapters.get(chosen).html+'</section>';root.append(article);
    article.addEventListener('click',event=>{const link=event.target.closest?.('a[href^="#"]');if(!link)return;event.preventDefault();
      const destination=link.getAttribute('href').slice(1),target=data.chapters.slice().sort((a,b)=>b.id.length-a.id.length).find(c=>destination===c.id||destination.startsWith(c.id+'-'));
      if(target){chosen=target.id;anchor=destination===target.id?'':destination;render(host);jump();}});
    for(const link of article.querySelectorAll('a[href^="https://"]')){link.target='_blank';link.rel='noopener';}
    return root;
  }
  function jump(){const root=document.getElementById('projectLessons');if(!root)return;
    const target=anchor?[...root.querySelectorAll('[id]')].find(node=>node.id===anchor):root;
    if(target)target.style.scrollMarginTop=((document.getElementById('projectLessonControls')?.offsetHeight||0)+16)+'px';
    target?.scrollIntoView?.({block:'start'});}
  function open(input={}) {
    if(S.tab!=='docs')returnTab=S.tab;
    context=recommend(input);chosen=input.chapter&&chapters.has(input.chapter)?input.chapter:context.chapter;
    anchor=input.anchor||context.anchor;
    services.ResourceRelationshipPreview?.close();services.ConnectedWorkspacePreview?.close();services.AreaLibrary.close(false);
    switchTab('docs');render(document.getElementById('sideDocs'));jump();return {chapter:chosen,anchor,context};
  }
  function shortcut(host,input) {
    const button=el('button',null,'Lesson for this resource');button.type='button';button.className='frx-context-shortcut';button.onclick=()=>open(input);host.append(button);
  }
  const style=el('style');style.textContent='#projectLessons{max-width:1100px;margin:auto;padding:18px;font:15px/1.7 system-ui;color:var(--txt)}#projectLessons h1,#projectLessons h2,#projectLessons h3{line-height:1.3;scroll-margin-top:16px}#projectLessonControls{position:sticky;top:0;z-index:2;background:var(--bg3);padding:8px 0;border-bottom:1px solid var(--bdr);display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}#projectLessonControls select,#projectLessonControls button{min-width:0;font:inherit;min-height:44px;max-width:100%;background:var(--bg3);color:var(--txt);border:1px solid var(--bdr);padding:7px}#projectLessonContext,#projectLessonScope{padding:8px;border-left:3px solid var(--acc);overflow-wrap:anywhere}#projectLessonBody{border-top:1px solid var(--bdr);padding-top:12px}#projectLessonBody table{display:block;overflow:auto;border-collapse:collapse;max-width:100%;font-size:13px}#projectLessonBody th,#projectLessonBody td{border:1px solid var(--bdr);padding:8px;vertical-align:top;text-align:left}#projectLessonBody pre{white-space:pre;overflow:auto;background:var(--bg3);padding:12px;font:12px/1.6 monospace}#projectLessonBody a{color:var(--acc)}#projectLessonBody img{max-width:100%}#projectLessonsOpen{min-height:38px;white-space:normal}@media(max-width:600px){#projectLessons{padding:10px;font-size:14px}#projectLessonControls>*{width:100%}}';document.head.append(style);
  const button=el('button','projectLessonsOpen','Project lessons');button.type='button';button.onclick=()=>open();document.getElementById('projectGatewayOpen').before(button);
  const audio=el('button','nativeAudioLesson','Lesson for this Audio source');audio.type='button';audio.onclick=()=>{const state=services.NativeAudioLibraryUI.getState();open({editor:'audio',profile:state.profile,sourceSha256:state.sourceSha256,sourceValid:state.isCurrent,name:services.NativeAudioLibraryUI.catalog()?.profile?.title});};document.getElementById('nativeAudioSourceContext').after(audio);
  const intake=el('button','projectGatewayLesson','Lesson for inspected input');intake.type='button';intake.onclick=()=>{const report=services.ProjectGatewayUI.report(),state=services.ProjectGatewayUI.getState();open(report?{profile:report.profile,sourceSha256:report.source.sha256,sourceValid:state.ready,sourceKind:report.kind==='project'?'project-file':'rom',name:report.source.name}:{});};document.getElementById('projectGatewayNotes').after(intake);
  services.ProjectLessons=Object.freeze({open,mount:render,recommend,shortcut,chapters:()=>data.chapters.map(({id,title,source,sourceSha256})=>({id,title,source,sourceSha256})),getState:()=>({chapter:chosen,anchor,returnTab,context})});
})();
