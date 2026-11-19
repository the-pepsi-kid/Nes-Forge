/*
 * NES FORGE MODULE: src/ui/spatial-viewer.js
 * Entry: Forge.services.Spatial, commands spatial.*
 * Purpose: The spatial (VR/AR) adapter of the command core. Forge output is shown as floating game
 *   screens: the running game in front, the project's scenes in an arc around it. The same view runs
 *   in a desktop preview window (mouse orbit) and in WebXR immersive-vr / immersive-ar sessions.
 *   Controllers and tracked hands press NES buttons through the shared input.set command and grab
 *   screens to move them. No external libraries: WebGL + WebXR only, so the editor stays offline.
 * Contract: Read-only view of the project and emulator; it never edits assets. Layout is view state.
 * Bundle order: after src/ui/studio-shell.js.
 */
(()=>{
'use strict';
const F=window.Forge,C=F.commands,services=F.services;
if(!C||typeof document==='undefined'||!document.body||typeof document.createTextNode!=='function'||typeof window.Element!=='function')return;
const xr=navigator.xr||null;

// ---------- tiny matrix library (column-major 4x4) ----------
const M={
  ident:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
  mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;},
  persp(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);},
  trs(x,y,z,yaw,sx,sy){const c=Math.cos(yaw),s=Math.sin(yaw);return new Float32Array([c*sx,0,-s*sx,0,0,sy,0,0,s,0,c,0,x,y,z,1]);},
};

// ---------- state ----------
const ASPECT=256/240;
const state={open:false,mode:null,session:null,canvas:null,gl:null,prog:null,buf:null,screens:[],selected:0,grab:null,
  cam:{yaw:0,pitch:-0.05,dist:0,eye:[0,1.5,0.6]},raf:null,lastEmuDrive:0,buttons:{},pending:null};
function defaultScreens(){
  // The running game in front; around it one screen per World (stage) when the project has Worlds, else per Scene.
  const worlds=(typeof S!=='undefined'?S.worlds:[])||[],scenes=(typeof S!=='undefined'?S.scenes:[])||[];
  const items=(worlds.length?worlds.map(w=>({id:'world:'+w.id,kind:'world',worldId:w.id,label:w.name})):scenes.map(sc=>({id:'scene:'+sc.id,kind:'scene',sceneId:sc.id,label:sc.name}))).slice(0,12);
  const out=[{id:'emulator',kind:'emulator',label:'Game',x:0,y:1.5,z:-1.6,yaw:0,w:1.2}],n=items.length,r=2.4;
  // Two rows on a 200-degree arc behind the game screen, every screen turned to face the viewer.
  items.forEach((it,i)=>{const row=i%2,col=Math.floor(i/2),cols=Math.ceil(n/2),a=(cols===1?0:-1.75+3.5*(col/(cols-1)))+(row?0.12:0);
    const x=Math.sin(a)*r,z=-Math.cos(a)*r;out.push({...it,x,y:row?0.95:1.95,z,yaw:Math.atan2(-x,-z),w:0.8});});
  return out;
}

// ---------- WebGL ----------
const VS=`attribute vec2 p;attribute vec2 uv;uniform mat4 mvp;varying vec2 v;void main(){v=uv;gl_Position=mvp*vec4(p,0.0,1.0);}`;
const FS=`precision mediump float;varying vec2 v;uniform sampler2D tex;uniform vec4 tint;uniform float frame;void main(){
  float e=frame*0.03;if(v.x<e||v.y<e||v.x>1.0-e||v.y>1.0-e){gl_FragColor=tint;return;}gl_FragColor=texture2D(tex,v);}`;
function initGL(canvas,xrCompatible){
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,xrCompatible:!!xrCompatible,preserveDrawingBuffer:true});
  if(!gl)throw Error('WebGL is unavailable in this browser.');
  const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  // unit quad centred on the origin, 1 wide x 1 tall, uv flipped so row 0 is the top of the picture
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-0.5,-0.5,0,1, 0.5,-0.5,1,1, -0.5,0.5,0,0, 0.5,0.5,1,0]),gl.STATIC_DRAW);
  state.gl=gl;state.prog=prog;state.buf=buf;state.loc={p:gl.getAttribLocation(prog,'p'),uv:gl.getAttribLocation(prog,'uv'),mvp:gl.getUniformLocation(prog,'mvp'),
    tint:gl.getUniformLocation(prog,'tint'),frame:gl.getUniformLocation(prog,'frame'),tex:gl.getUniformLocation(prog,'tex')};
  for(const s of state.screens)s.tex=null;
}
function texture(screen){
  const gl=state.gl;if(!screen.tex){screen.tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,screen.tex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);screen.dirty=true;}
  gl.bindTexture(gl.TEXTURE_2D,screen.tex);
  if(screen.kind==='emulator'){
    const fb=typeof emu!=='undefined'&&emu.frameBuffer;
    if(fb){const px=new Uint8Array(fb.buffer||fb,fb.byteOffset||0,256*240*4);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,256,240,0,gl.RGBA,gl.UNSIGNED_BYTE,px);}
    else if(screen.dirty){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([20,20,30,255]));}
    screen.dirty=false;
  }else if(screen.dirty){
    const c=document.createElement('canvas');let ok=false;try{ok=screen.kind==='world'?services.StudioShell?.drawWorld?.(screen.worldId,c):services.StudioShell?.drawScene?.(screen.sceneId,c);}catch(_){ok=false;}
    if(ok)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([30,30,40,255]));
    screen.dirty=false;
  }
}
function model(s){return M.trs(s.x,s.y,s.z,s.yaw,s.w,s.w/ASPECT);}
function draw(proj,view,viewport){
  const gl=state.gl,L=state.loc;gl.viewport(viewport.x,viewport.y,viewport.width,viewport.height);
  gl.useProgram(state.prog);gl.bindBuffer(gl.ARRAY_BUFFER,state.buf);
  gl.enableVertexAttribArray(L.p);gl.vertexAttribPointer(L.p,2,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(L.uv);gl.vertexAttribPointer(L.uv,2,gl.FLOAT,false,16,8);
  gl.uniform1i(L.tex,0);gl.activeTexture(gl.TEXTURE0);const pv=M.mul(proj,view);
  state.screens.forEach((s,i)=>{texture(s);gl.uniformMatrix4fv(L.mvp,false,M.mul(pv,model(s)));
    const sel=i===state.selected,grabbed=state.grab&&state.grab.index===i;
    gl.uniform4f(L.tint,grabbed?1:sel?0.35:0.15,grabbed?0.7:sel?0.83:0.15,grabbed?0.2:1,1);gl.uniform1f(L.frame,sel||grabbed?1:0.4);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);});
}

// ---------- picking (ray against each screen plane) ----------
function hit(origin,dir){
  // A screen is a rectangle in the plane through (x,y,z) facing its normal (sin yaw, 0, cos yaw).
  let best=null;
  state.screens.forEach((s,i)=>{
    const normal=[Math.sin(s.yaw),0,Math.cos(s.yaw)],denom=normal[0]*dir[0]+normal[2]*dir[2];
    if(Math.abs(denom)<1e-6)return;
    const t=((s.x-origin[0])*normal[0]+(s.z-origin[2])*normal[2])/denom;if(t<=0)return;
    const p=[origin[0]+dir[0]*t,origin[1]+dir[1]*t,origin[2]+dir[2]*t];
    const right=[Math.cos(s.yaw),0,-Math.sin(s.yaw)],u=(p[0]-s.x)*right[0]+(p[2]-s.z)*right[2],v=p[1]-s.y;
    if(Math.abs(u)<=s.w/2&&Math.abs(v)<=s.w/ASPECT/2&&(!best||t<best.t))best={index:i,t,point:p};
  });
  return best;
}
/* Turn a screen to face a point (the viewer or a controller). */
function face(s,from){s.yaw=Math.atan2(from[0]-s.x,from[2]-s.z);}
/* Camera rotation (yaw about Y, then pitch about X) applied to a camera-space vector. */
function camRotate(v){
  const cy=Math.cos(state.cam.yaw),sy=Math.sin(state.cam.yaw),cp=Math.cos(state.cam.pitch),sp=Math.sin(state.cam.pitch);
  const y=v[1]*cp-v[2]*sp,z=v[1]*sp+v[2]*cp;      // pitch
  return [v[0]*cy+z*sy,y,-v[0]*sy+z*cy];            // yaw
}

// ---------- shared NES input (same command every interface uses) ----------
const pressed={};
function setButtons(next){
  const change={};for(const k of Object.keys(C.buttons)){const v=!!next[k];if(v!==!!pressed[k]){change[k]=v;pressed[k]=v;}}
  if(Object.keys(change).length)C.run('input.set',{buttons:change},{adapter:state.session?'xr':'xr-preview'});
}

// ---------- desktop preview ----------
let overlay=null;
function buildOverlay(){
  overlay=document.createElement('div');overlay.id='spatialOverlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:600;background:#05060a;display:flex;flex-direction:column';
  const bar=document.createElement('div');bar.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:6px 10px;background:var(--bg2);border-bottom:1px solid var(--bdr2);font:11px monospace;color:var(--txt)';
  const btn=(id,label,fn,disabled)=>{const b=document.createElement('button');b.id=id;b.textContent=label;b.disabled=!!disabled;b.style.cssText='font:11px monospace;background:var(--bg3);color:var(--txt);border:1px solid var(--bdr2);padding:5px 9px;min-height:28px;cursor:pointer';b.onclick=fn;bar.append(b);return b;};
  const title=document.createElement('b');title.textContent='Spatial view';title.style.color='var(--acc)';bar.append(title);
  btn('spatialEnterVR','Enter VR',()=>C.run('spatial.open',{mode:'vr'},{adapter:'desktop'}),true);
  btn('spatialEnterAR','Enter AR',()=>C.run('spatial.open',{mode:'ar'},{adapter:'desktop'}),true);
  btn('spatialReset','Reset layout',()=>{state.screens=defaultScreens();if(state.gl)for(const s of state.screens)s.tex=null;});
  btn('spatialClose','Close',()=>C.run('spatial.close',null,{adapter:'desktop'}));
  const hint=document.createElement('span');hint.id='spatialHint';hint.style.color='var(--dim)';
  hint.textContent='Drag to look around · wheel to move · click a screen to select · Shift+drag moves it · arrows, Z, X, Enter, Shift play the game';bar.append(hint);
  const canvas=document.createElement('canvas');canvas.id='spatialCanvas';canvas.style.cssText='flex:1;width:100%;min-height:0;display:block;touch-action:none';canvas.tabIndex=0;
  overlay.append(bar,canvas);document.body.append(overlay);
  let drag=null;
  canvas.addEventListener('pointerdown',e=>{canvas.focus();canvas.setPointerCapture(e.pointerId);const ray=previewRay(e),h=hit(ray.o,ray.d);
    if(h){state.selected=h.index;if(e.shiftKey)state.grab={index:h.index,dist:h.t};}
    drag={x:e.clientX,y:e.clientY,yaw:state.cam.yaw,pitch:state.cam.pitch,moved:false};});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;
    if(state.grab){const ray=previewRay(e),s=state.screens[state.grab.index];s.x=ray.o[0]+ray.d[0]*state.grab.dist;s.y=ray.o[1]+ray.d[1]*state.grab.dist;s.z=ray.o[2]+ray.d[2]*state.grab.dist;face(s,ray.o);return;}
    state.cam.yaw=drag.yaw+dx*0.004;state.cam.pitch=Math.max(-1.1,Math.min(1.1,drag.pitch+dy*0.004));});
  canvas.addEventListener('pointerup',()=>{drag=null;state.grab=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();const step=-Math.sign(e.deltaY)*0.15,d=camRotate([0,0,-1]);
    state.cam.eye[0]+=d[0]*step;state.cam.eye[2]+=d[2]*step;},{passive:false});
  const keyMap={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',KeyZ:'a',KeyX:'b',Enter:'start',ShiftRight:'select'};
  canvas.addEventListener('keydown',e=>{if(e.key==='Escape'){C.run('spatial.close');return;}const b=keyMap[e.code];if(b){e.preventDefault();setButtons({...pressed,[b]:true});}});
  canvas.addEventListener('keyup',e=>{const b=keyMap[e.code];if(b){e.preventDefault();setButtons({...pressed,[b]:false});}});
  canvas.addEventListener('blur',()=>setButtons({}));
  return canvas;
}
function previewRay(e){
  const r=state.canvas.getBoundingClientRect(),x=((e.clientX-r.left)/r.width)*2-1,y=1-((e.clientY-r.top)/r.height)*2;
  const f=Math.tan(Math.PI/6),aspect=r.width/Math.max(1,r.height),d=camRotate([x*f*aspect,y*f,-1]),len=Math.hypot(d[0],d[1],d[2]);
  return {o:state.cam.eye.slice(),d:d.map(v=>v/len)};
}
function previewFrame(){
  if(!state.open||state.session)return;const c=state.canvas,gl=state.gl,w=Math.max(1,c.clientWidth|0),h=Math.max(1,c.clientHeight|0);
  if(c.width!==w*devicePixelRatio|0||c.height!==h*devicePixelRatio|0){c.width=w*devicePixelRatio|0;c.height=h*devicePixelRatio|0;}
  gl.clearColor(0.02,0.025,0.04,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);
  // camera transform: columns are the rotated axes, then the eye position; the view matrix is its inverse
  const xa=camRotate([1,0,0]),ya=camRotate([0,1,0]),za=camRotate([0,0,1]),e=state.cam.eye;
  const camM=new Float32Array([xa[0],xa[1],xa[2],0, ya[0],ya[1],ya[2],0, za[0],za[1],za[2],0, e[0],e[1],e[2],1]);
  draw(M.persp(Math.PI/3,c.width/c.height,0.05,100),invert(camM),{x:0,y:0,width:c.width,height:c.height});
  state.raf=requestAnimationFrame(previewFrame);
}
function invert(m){ // rigid transform inverse (rotation + translation)
  const r=new Float32Array([m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0,0,0,0,1]),t=[m[12],m[13],m[14]];
  r[12]=-(r[0]*t[0]+r[4]*t[1]+r[8]*t[2]);r[13]=-(r[1]*t[0]+r[5]*t[1]+r[9]*t[2]);r[14]=-(r[2]*t[0]+r[6]*t[1]+r[10]*t[2]);return r;
}

// ---------- WebXR ----------
async function supported(mode){try{return !!xr&&await xr.isSessionSupported(mode);}catch(_){return false;}}
async function startXR(kind){
  if(!xr)throw Error('WebXR is unavailable in this browser.');
  const mode=kind==='ar'?'immersive-ar':'immersive-vr';
  if(!await supported(mode))throw Error(mode+' is not supported on this device.');
  const session=await xr.requestSession(mode,{optionalFeatures:['local-floor','hand-tracking']});
  C.registerAdapter({id:'xr',kind:'xr',title:'WebXR '+(kind==='ar'?'AR':'VR')});
  state.session=session;state.mode=kind;
  await state.gl.makeXRCompatible?.();
  session.updateRenderState({baseLayer:new XRWebGLLayer(session,state.gl)});
  let ref;try{ref=await session.requestReferenceSpace('local-floor');}catch(_){ref=await session.requestReferenceSpace('local');for(const s of state.screens)s.y-=1.5;}
  state.ref=ref;
  session.addEventListener('selectstart',e=>{const ray=xrRay(e.frame,e.inputSource);if(!ray)return;const h=hit(ray.o,ray.d);
    if(h){state.selected=h.index;state.grab={index:h.index,dist:h.t,source:e.inputSource};}else setButtons({...pressed,a:true});});
  session.addEventListener('selectend',e=>{if(state.grab&&state.grab.source===e.inputSource)state.grab=null;else setButtons({...pressed,a:false});});
  session.addEventListener('end',()=>{state.session=null;state.grab=null;setButtons({});if(state.open)state.raf=requestAnimationFrame(previewFrame);});
  session.requestAnimationFrame(xrFrame);
  return {mode};
}
function xrRay(frame,source){
  const pose=frame&&state.ref&&frame.getPose(source.targetRaySpace,state.ref);if(!pose)return null;const m=pose.transform.matrix;
  return {o:[m[12],m[13],m[14]],d:[-m[8],-m[9],-m[10]]};
}
function xrFrame(t,frame){
  const session=frame.session;session.requestAnimationFrame(xrFrame);
  // The page animation loop is paused during an immersive session: drive the emulator from here.
  if(typeof emu!=='undefined'&&emu.running&&performance.now()-state.lastEmuDrive>50&&typeof emuLoop==='function'&&typeof emuRunGeneration!=='undefined'){
    try{emuLoop(t,emuRunGeneration);}catch(_){/* emulator reports its own errors */}}
  // controllers: trigger/squeeze/face buttons/thumbstick -> NES buttons
  const next={};
  for(const source of session.inputSources){
    const g=source.gamepad;if(state.grab&&state.grab.source===source){const ray=xrRay(frame,source);if(ray){const s=state.screens[state.grab.index];
      s.x=ray.o[0]+ray.d[0]*state.grab.dist;s.y=ray.o[1]+ray.d[1]*state.grab.dist;s.z=ray.o[2]+ray.d[2]*state.grab.dist;face(s,ray.o);}continue;}
    if(!g)continue;const b=i=>!!g.buttons[i]?.pressed,ax=g.axes||[];
    if(b(1))next.b=true;if(b(4))next.start=true;if(b(5))next.select=true;
    const x=ax[2]??ax[0]??0,y=ax[3]??ax[1]??0;if(x<-0.5)next.left=true;if(x>0.5)next.right=true;if(y<-0.5)next.up=true;if(y>0.5)next.down=true;
  }
  setButtons({...next,a:pressed.a&&!state.grab});
  const pose=frame.getViewerPose(state.ref);if(!pose)return;
  const layer=session.renderState.baseLayer,gl=state.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);
  gl.clearColor(0.02,0.025,0.04,state.mode==='ar'?0:1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);
  for(const view of pose.views)draw(view.projectionMatrix,view.transform.inverse.matrix,layer.getViewport(view));
}
// Remember when the page loop last ran so XR never doubles emulator frames.
if(typeof emuLoop==='function'){const original=emuLoop;try{emuLoop=function(now,generation){state.lastEmuDrive=performance.now();return original(now,generation);};}catch(_){/* read-only binding */}}

// ---------- commands ----------
async function open(mode){
  if(!state.open){
    state.screens=defaultScreens();state.canvas=buildOverlay();initGL(state.canvas,true);state.open=true;
    const [vr,ar]=await Promise.all([supported('immersive-vr'),supported('immersive-ar')]);
    document.getElementById('spatialEnterVR').disabled=!vr;document.getElementById('spatialEnterAR').disabled=!ar;
    state.canvas.focus();state.raf=requestAnimationFrame(previewFrame);
  }
  if(mode==='vr'||mode==='ar')return {...await startXR(mode),screens:state.screens.length};
  return {mode:'preview',screens:state.screens.length};
}
function close(){
  if(state.session){try{state.session.end();}catch(_){}}
  if(state.raf)cancelAnimationFrame(state.raf);setButtons({});
  overlay?.remove();overlay=null;state.open=false;state.gl=null;state.canvas=null;return {closed:true};
}
C.register({name:'spatial.info',group:'spatial',title:'Spatial (VR/AR) support',
  run:async()=>({webxr:!!xr,vr:await supported('immersive-vr'),ar:await supported('immersive-ar'),open:state.open,mode:state.session?state.mode:state.open?'preview':null,screens:state.screens.length})});
C.register({name:'spatial.open',group:'spatial',title:'Open the spatial view',needs:'ui',summary:'preview (desktop window), vr or ar (WebXR headset/phone).',
  args:{mode:{type:'string',default:'preview',enum:['preview','vr','ar']}},run:a=>open(a.mode)});
C.register({name:'spatial.close',group:'spatial',title:'Close the spatial view',needs:'ui',run:()=>close()});
C.register({name:'spatial.layout',group:'spatial',title:'Screen layout',summary:'Read, or set by id: {screens:[{id,x,y,z,yaw,w}]}. View state only.',
  args:{screens:{type:'object'}},
  run:a=>{if(a.screens){const list=Array.isArray(a.screens)?a.screens:a.screens.items;if(!Array.isArray(list))throw Error('screens must be a list');
      for(const u of list){const s=state.screens.find(x=>x.id===u.id);if(!s)throw Error('No screen '+u.id);for(const k of ['x','y','z','yaw','w'])if(Number.isFinite(u[k]))s[k]=u[k];}}
    return {screens:state.screens.map(({tex,dirty,...s})=>s)};}});
C.register({name:'spatial.capture',group:'spatial',title:'Capture the preview (PNG data URL)',needs:'ui',
  run:()=>{if(!state.open||!state.canvas)throw Error('Open the spatial view first.');return {png:state.canvas.toDataURL('image/png')};}});

// Studio bar entry
const bar=document.getElementById('studioBar');
if(bar){const b=document.createElement('button');b.id='studioSpatial';b.textContent='VR / AR';b.title='Spatial view: floating game screens (desktop preview, WebXR headset or phone)';
  b.onclick=()=>C.run('spatial.open',{mode:'preview'},{adapter:'desktop'});const learn=document.getElementById('studioLearn');(learn||bar.lastChild).before(b);}
services.Spatial=Object.freeze({open,close,state:()=>({open:state.open,mode:state.session?state.mode:state.open?'preview':null,screens:state.screens.length})});
})();
