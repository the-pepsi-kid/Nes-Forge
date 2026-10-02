/* NES Forge 1.8 — compact four-channel NES APU sequencer.
 * The emitter is shared by generated viewer, single-room, and World runtimes.
 * One pattern-backed SFX may temporarily preempt its selected music channel.
 */
(()=>{
'use strict';
const services=(window.Forge=window.Forge||{}).services=window.Forge.services||{};
function emit(spec,api,zBase){
 if(!spec?.enabled)throw Error('Audio engine requires an enabled compiled audio plan');
 const {e,label,address,abs,jsr,jmp,b,imm,ld,st,set,copy,current}=api,p='aud_';
 const Z={ready:zBase,accLo:zBase+1,accHi:zBase+2,rowTick:zBase+3,row:zBase+4,order:zBase+5,
  activeNote:zBase+6,activeInst:zBase+10,envVol:zBase+14,envArp:zBase+18,chVol:zBase+22,patPtr:zBase+26,patPos:zBase+34,
  sfxActive:zBase+38,sfxChannel:zBase+39,sfxRow:zBase+40,sfxEnd:zBase+41,sfxTick:zBase+42,sfxPtr:zBase+43,sfxPos:zBase+45,
  saveNote:zBase+46,saveInst:zBase+47,saveEnvVol:zBase+48,saveEnvArp:zBase+49,saveVol:zBase+50,
  tempCh:zBase+51,tempNote:zBase+52,tempInst:zBase+53,tempVol:zBase+54,tempArp:zBase+55,tempDuty:zBase+56,ptr:zBase+57,temp:zBase+59};
 if(zBase<9||zBase+60>256)throw Error('Audio zero-page allocation is invalid');
 const ldaX=zp=>e(0xB5,zp),staX=zp=>e(0x95,zp),ldx=zp=>e(0xA6,zp),ldy=zp=>e(0xA4,zp),cmp=value=>e(0xC9,value&255);
 const table=(name,values,kind='audio-data')=>{label(p+name);const start=current();for(const value of values)e(value&255);api.resource?.({kind,ownerId:p+name,address:start,byteLength:current()-start,alignment:1,region:'PRG',bank:0});};
 const pointer=(name,index,dest)=>{e(0xA6,index);abs(0xBD,p+name+'_lo');st(dest);abs(0xBD,p+name+'_hi');st(dest+1);};
 function applyEvent(){
  label(p+'apply_event');st(Z.tempCh); // Call with A=channel and Y on the row byte.
  e(0xC8,0xB1,Z.ptr);st(Z.tempNote);e(0xC8,0xB1,Z.ptr);st(Z.tempInst);e(0xC8,0xB1,Z.ptr);st(Z.tempVol);ldx(Z.tempCh);
  ld(Z.tempVol);cmp(255);b(0xF0,p+'apply_no_volume');staX(Z.chVol);label(p+'apply_no_volume');
  ld(Z.tempNote);cmp(255);b(0xF0,p+'apply_done');cmp(254);b(0xD0,p+'apply_note');imm(255);staX(Z.activeNote);jmp(p+'apply_done');
  label(p+'apply_note');staX(Z.activeNote);ld(Z.tempInst);cmp(255);b(0xF0,p+'apply_keep_inst');staX(Z.activeInst);label(p+'apply_keep_inst');ldaX(Z.activeInst);cmp(255);b(0xD0,p+'apply_has_inst');imm(0);staX(Z.activeInst);label(p+'apply_has_inst');imm(0);staX(Z.envVol);staX(Z.envArp);label(p+'apply_done');e(0x60);
 }
 function processMusic(channel){
  const base=p+'music_'+channel,ptr=Z.patPtr+channel*2;
  label(base);ld(Z.sfxActive);b(0xF0,base+'_load');ld(Z.sfxChannel);cmp(channel);b(0xF0,base+'_done');
  label(base+'_load');copy(ptr,Z.ptr);copy(ptr+1,Z.ptr+1);label(base+'_loop');ldy(Z.patPos+channel);e(0xB1,Z.ptr);cmp(255);b(0xF0,base+'_done');e(0xC5,Z.row);b(0xF0,base+'_hit');b(0xB0,base+'_done');
  ld(Z.patPos+channel);e(0x18,0x69,4);st(Z.patPos+channel);jmp(base+'_loop');
  label(base+'_hit');imm(channel);jsr(p+'apply_event');ld(Z.patPos+channel);e(0x18,0x69,4);st(Z.patPos+channel);label(base+'_done');e(0x60);
 }
function loadOrder(){
  label(p+'load_order');if(spec.musicEnabled)for(let channel=0;channel<4;channel++){e(0xA6,Z.order);abs(0xBD,p+'order_'+channel+'_lo');st(Z.patPtr+channel*2);abs(0xBD,p+'order_'+channel+'_hi');st(Z.patPtr+channel*2+1);set(Z.patPos+channel,0);}e(0x60);
}
 function processSfx(){
  label(p+'process_sfx');ld(Z.sfxActive);b(0xF0,p+'process_sfx_done');copy(Z.sfxPtr,Z.ptr);copy(Z.sfxPtr+1,Z.ptr+1);
  label(p+'sfx_scan');ldy(Z.sfxPos);e(0xB1,Z.ptr);cmp(255);b(0xF0,p+'process_sfx_done');e(0xC5,Z.sfxRow);b(0xF0,p+'sfx_hit');b(0xB0,p+'process_sfx_done');ld(Z.sfxPos);e(0x18,0x69,4);st(Z.sfxPos);jmp(p+'sfx_scan');
  label(p+'sfx_hit');ld(Z.sfxChannel);jsr(p+'apply_event');ld(Z.sfxPos);e(0x18,0x69,4);st(Z.sfxPos);label(p+'process_sfx_done');e(0x60);
 }
 function silenceChannel(){
  label(p+'silence_channel');ldx(Z.tempCh);e(0xE0,0);b(0xD0,p+'silence_1');imm(0x30);abs(0x8D,0x4000);e(0x60);label(p+'silence_1');e(0xE0,1);b(0xD0,p+'silence_2');imm(0x30);abs(0x8D,0x4004);e(0x60);label(p+'silence_2');e(0xE0,2);b(0xD0,p+'silence_3');imm(0x80);abs(0x8D,0x4008);e(0x60);label(p+'silence_3');imm(0x30);abs(0x8D,0x400C);e(0x60);
 }
 function renderChannel(){
  label(p+'render_channel');st(Z.tempCh);e(0xAA);ldaX(Z.activeNote);cmp(255);b(0xF0,p+'render_silence');st(Z.tempNote);ldaX(Z.activeInst);st(Z.tempInst);e(0xAA);abs(0xBD,p+'inst_duty');st(Z.tempDuty);
  // Volume envelope: nonlooping instruments remain silent after their last step.
  abs(0xBD,p+'inst_vol_len');st(Z.temp);ldx(Z.tempCh);ldaX(Z.envVol);e(0xC5,Z.temp);b(0x90,p+'vol_position_ok');ldx(Z.tempInst);abs(0xBD,p+'inst_vol_loop');cmp(255);b(0xF0,p+'vol_finished');ldx(Z.tempCh);staX(Z.envVol);jmp(p+'vol_position_ok');label(p+'vol_finished');set(Z.tempVol,0);jmp(p+'arp_begin');
  label(p+'vol_position_ok');ldx(Z.tempInst);abs(0xBD,p+'inst_vol_lo');st(Z.ptr);abs(0xBD,p+'inst_vol_hi');st(Z.ptr+1);ldx(Z.tempCh);ldaX(Z.envVol);e(0xA8,0xB1,Z.ptr,0x0A,0x0A,0x0A,0x0A);st(Z.tempVol);
  // Combine envelope and authored channel volume into the scale-table index.
  ldx(Z.tempCh);ldaX(Z.chVol);e(0x29,15,0x05,Z.tempVol,0xAA);abs(0xBD,p+'volume_scale');st(Z.tempVol);
  label(p+'arp_begin');ldx(Z.tempInst);abs(0xBD,p+'inst_arp_len');st(Z.temp);ldx(Z.tempCh);ldaX(Z.envArp);e(0xC5,Z.temp);b(0x90,p+'arp_position_ok');ldx(Z.tempInst);abs(0xBD,p+'inst_arp_loop');cmp(255);b(0xD0,p+'arp_use_loop');abs(0xBD,p+'inst_arp_len');e(0x38,0xE9,1);label(p+'arp_use_loop');ldx(Z.tempCh);staX(Z.envArp);
  label(p+'arp_position_ok');ldx(Z.tempInst);abs(0xBD,p+'inst_arp_lo');st(Z.ptr);abs(0xBD,p+'inst_arp_hi');st(Z.ptr+1);ldx(Z.tempCh);ldaX(Z.envArp);e(0xA8,0xB1,Z.ptr);st(Z.tempArp);b(0x30,p+'arp_negative');e(0x18,0x65,Z.tempNote);cmp(96);b(0x90,p+'pitch_ready');imm(95);jmp(p+'pitch_ready');label(p+'arp_negative');e(0x18,0x65,Z.tempNote);b(0xB0,p+'pitch_ready');imm(0);label(p+'pitch_ready');st(Z.tempNote);
  // Channel-specific APU registers.
  ldx(Z.tempCh);e(0xE0,0);b(0xD0,p+'render_1');ld(Z.tempDuty);for(let i=0;i<6;i++)e(0x0A);e(0x09,0x30,0x05,Z.tempVol);abs(0x8D,0x4000);ldx(Z.tempNote);abs(0xBD,p+'timer_lo');abs(0x8D,0x4002);abs(0xBD,p+'timer_hi');e(0x09,0xF8);abs(0x8D,0x4003);e(0x60);
  label(p+'render_1');e(0xE0,1);b(0xD0,p+'render_2');ld(Z.tempDuty);for(let i=0;i<6;i++)e(0x0A);e(0x09,0x30,0x05,Z.tempVol);abs(0x8D,0x4004);ldx(Z.tempNote);abs(0xBD,p+'timer_lo');abs(0x8D,0x4006);abs(0xBD,p+'timer_hi');e(0x09,0xF8);abs(0x8D,0x4007);e(0x60);
  label(p+'render_2');e(0xE0,2);b(0xD0,p+'render_3');ld(Z.tempVol);b(0xF0,p+'render_silence');imm(0xFF);abs(0x8D,0x4008);ldx(Z.tempNote);abs(0xBD,p+'timer_lo');abs(0x8D,0x400A);abs(0xBD,p+'timer_hi');e(0x09,0xF8);abs(0x8D,0x400B);e(0x60);
  label(p+'render_3');ld(Z.tempVol);b(0xF0,p+'render_silence');e(0x09,0x30);abs(0x8D,0x400C);ldx(Z.tempNote);abs(0xBD,p+'noise_period');abs(0x8D,0x400E);imm(0xF8);abs(0x8D,0x400F);e(0x60);
  label(p+'render_silence');jsr(p+'silence_channel');e(0x60);
 }
 function advanceEnvelopes(){
  label(p+'advance_env');for(let channel=0;channel<4;channel++){ld(Z.activeNote+channel);cmp(255);b(0xF0,p+'env_next_'+channel);ld(Z.envVol+channel);cmp(255);b(0xF0,p+'env_vol_hold_'+channel);e(0xE6,Z.envVol+channel);label(p+'env_vol_hold_'+channel);e(0xE6,Z.envArp+channel);label(p+'env_next_'+channel);}e(0x60);
 }
 function advanceRows(){
  label(p+'advance_rows');
  if(spec.musicEnabled){e(0xE6,Z.rowTick);ld(Z.rowTick);cmp(spec.speed);b(0x90,p+'advance_sfx');set(Z.rowTick,0);e(0xE6,Z.row);ld(Z.row);cmp(spec.rows);b(0x90,p+'advance_sfx');set(Z.row,0);e(0xE6,Z.order);ld(Z.order);cmp(spec.orders.length);b(0x90,p+'order_ok');set(Z.order,0);label(p+'order_ok');jsr(p+'load_order');}
  label(p+'advance_sfx');ld(Z.sfxActive);b(0xF0,p+'advance_done');e(0xE6,Z.sfxTick);ld(Z.sfxTick);cmp(spec.speed);b(0x90,p+'advance_done');set(Z.sfxTick,0);ld(Z.sfxRow);e(0xC5,Z.sfxEnd);b(0xB0,p+'finish_sfx');e(0xE6,Z.sfxRow);jmp(p+'advance_done');
  label(p+'finish_sfx');ldx(Z.sfxChannel);ld(Z.saveNote);staX(Z.activeNote);ld(Z.saveInst);staX(Z.activeInst);ld(Z.saveEnvVol);staX(Z.envVol);ld(Z.saveEnvArp);staX(Z.envArp);ld(Z.saveVol);staX(Z.chVol);set(Z.sfxActive,0);ld(Z.sfxChannel);jsr(p+'render_channel');label(p+'advance_done');e(0x60);
 }
 applyEvent();for(let channel=0;channel<4;channel++)processMusic(channel);loadOrder();processSfx();silenceChannel();renderChannel();advanceEnvelopes();advanceRows();
 label(p+'tick');if(spec.musicEnabled){ld(Z.rowTick);b(0xD0,p+'music_rows_done');for(let channel=0;channel<4;channel++)jsr(p+'music_'+channel);label(p+'music_rows_done');}ld(Z.sfxActive);b(0xF0,p+'sfx_rows_done');ld(Z.sfxTick);b(0xD0,p+'sfx_rows_done');jsr(p+'process_sfx');label(p+'sfx_rows_done');for(let channel=0;channel<4;channel++){imm(channel);jsr(p+'render_channel');}jsr(p+'advance_env');jsr(p+'advance_rows');e(0x60);
 label(p+'init');imm(0x0F);abs(0x8D,0x4015);imm(0x40);abs(0x8D,0x4017);set(Z.ready,1);for(const a of[Z.accLo,Z.accHi,Z.rowTick,Z.row,Z.order,Z.sfxActive])set(a,0);for(let channel=0;channel<4;channel++){set(Z.activeNote+channel,255);set(Z.activeInst+channel,0);set(Z.envVol+channel,0);set(Z.envArp+channel,0);set(Z.chVol+channel,15);set(Z.patPos+channel,0);}if(spec.musicEnabled)jsr(p+'load_order');e(0x60);
 label(p+'frame');ld(Z.ready);b(0xD0,p+'frame_ready');jsr(p+'init');label(p+'frame_ready');ld(Z.accLo);e(0x18,0x69,spec.tempo&255);st(Z.accLo);ld(Z.accHi);e(0x69,spec.tempo>>8);st(Z.accHi);label(p+'frame_loop');ld(Z.accHi);b(0xD0,p+'frame_tick');ld(Z.accLo);cmp(150);b(0x90,p+'frame_done');label(p+'frame_tick');ld(Z.accLo);e(0x38,0xE9,150);st(Z.accLo);ld(Z.accHi);e(0xE9,0);st(Z.accHi);jsr(p+'tick');jmp(p+'frame_loop');label(p+'frame_done');e(0x60);
 label(p+'play_sfx'); // A = compiled SFX index; one SFX owns the bus at a time.
 st(Z.temp);ld(Z.sfxActive);b(0xF0,p+'sfx_start_new');e(0x60);label(p+'sfx_start_new');ldx(Z.temp);abs(0xBD,p+'sfx_channel');st(Z.sfxChannel);ldx(Z.sfxChannel);ldaX(Z.activeNote);st(Z.saveNote);ldaX(Z.activeInst);st(Z.saveInst);ldaX(Z.envVol);st(Z.saveEnvVol);ldaX(Z.envArp);st(Z.saveEnvArp);ldaX(Z.chVol);st(Z.saveVol);ldx(Z.temp);
  abs(0xBD,p+'sfx_channel');st(Z.sfxChannel);abs(0xBD,p+'sfx_start');st(Z.sfxRow);abs(0xBD,p+'sfx_end');st(Z.sfxEnd);abs(0xBD,p+'sfx_ptr_lo');st(Z.sfxPtr);abs(0xBD,p+'sfx_ptr_hi');st(Z.sfxPtr+1);set(Z.sfxPos,0);set(Z.sfxTick,0);e(0x8A,0x18,0x69,1);st(Z.sfxActive);e(0x60);
 // Data tables.
 for(const [index,record]of spec.records.entries())table('pattern_'+index,[...record.events.flatMap(event=>[event.row,event.note===-2?254:event.note<0?255:event.note,event.inst<0?255:event.inst,event.vol<0?255:event.vol]),255],'audio-pattern');
 if(spec.musicEnabled)for(let channel=0;channel<4;channel++)for(const part of['lo','hi']){label(p+'order_'+channel+'_'+part);const start=current();for(const order of spec.orders){const name=p+'pattern_'+order[channel];api.fixupByte(name,part);}api.resource?.({kind:'audio-order',ownerId:p+'order_'+channel+'_'+part,address:start,byteLength:current()-start,alignment:1,region:'PRG',bank:0});}
 const instTables={inst_duty:spec.instruments.map(x=>x.duty),inst_vol_len:spec.instruments.map(x=>x.volume.length),inst_vol_loop:spec.instruments.map(x=>x.loopVol<0?255:x.loopVol),inst_arp_len:spec.instruments.map(x=>x.arp.length),inst_arp_loop:spec.instruments.map(x=>x.loopArp<0?255:x.loopArp)};for(const [name,values]of Object.entries(instTables))table(name,values);
 for(const [index,instrument]of spec.instruments.entries()){table('vol_'+index,instrument.volume,'audio-envelope');table('arp_'+index,instrument.arp.map(v=>v&255),'audio-envelope');}
 for(const [kind,key]of[['inst_vol','vol'],['inst_arp','arp']])for(const part of['lo','hi']){label(p+kind+'_'+part);const start=current();for(let index=0;index<spec.instruments.length;index++)api.fixupByte(p+key+'_'+index,part);api.resource?.({kind:'audio-envelope-pointers',ownerId:p+kind+'_'+part,address:start,byteLength:current()-start,alignment:1,region:'PRG',bank:0});}
 table('sfx_channel',spec.sfx.map(x=>x.channel));table('sfx_start',spec.sfx.map(x=>x.startRow));table('sfx_end',spec.sfx.map(x=>x.endRow));for(const part of['lo','hi']){label(p+'sfx_ptr_'+part);const start=current();for(const item of spec.sfx)api.fixupByte(p+'pattern_'+item.record,part);api.resource?.({kind:'audio-sfx-pointers',ownerId:p+'sfx_ptr_'+part,address:start,byteLength:current()-start,alignment:1,region:'PRG',bank:0});}
 table('timer_lo',spec.noteTimers.map(v=>v&255),'audio-note-table');table('timer_hi',spec.noteTimers.map(v=>v>>8),'audio-note-table');table('noise_period',Array.from({length:96},(_,note)=>Math.max(0,Math.min(15,15-Math.floor(note/6)))),'audio-note-table');
 table('volume_scale',Array.from({length:256},(_,i)=>Math.round(((i>>4)*(i&15))/15)),'audio-volume-table');
 return {frame:p+'frame',init:p+'init',playSfx:p+'play_sfx',zp:{...Z}};
}

// Add Audio Runtime to the unchanged legacy viewer only when explicitly enabled.
function enhanceViewer(engine,spec){
 if(!spec?.enabled)return engine;const prg=new Uint8Array(engine.prg),labels={},fixups=[];let pc=0xC000+engine.size;
 const e=(...values)=>{for(const value of values)prg[pc++-0xC000]=value&255;},label=name=>{if(labels[name]!==undefined)throw Error('Duplicate audio viewer label '+name);labels[name]=pc;},address=name=>{if(typeof name==='number'){e(name&255,name>>8);}else{fixups.push({at:pc,name});e(0,0);}},abs=(op,name)=>{e(op);address(name);},jsr=name=>abs(0x20,name),jmp=name=>abs(0x4C,name);
 const inverse={0xF0:0xD0,0xD0:0xF0,0x90:0xB0,0xB0:0x90,0x10:0x30,0x30:0x10};const b=(op,name)=>{e(inverse[op],3);jmp(name);},imm=v=>e(0xA9,v&255),ld=a=>e(0xA5,a),st=a=>e(0x85,a),set=(a,v)=>{imm(v);st(a);},copy=(a,c)=>{ld(a);st(c);},fixupByte=(name,part)=>{fixups.push({at:pc,name,part});e(0);};
 const oldRti=engine.irq-1-0xC000;if(prg[oldRti]!==0x40)throw Error('Legacy viewer NMI boundary changed');prg[oldRti]=0x60;
 label('aud_viewer_nmi');e(0x48,0x8A,0x48,0x98,0x48);jsr(engine.nmi);jsr('aud_frame');e(0x68,0xA8,0x68,0xAA,0x68,0x40);
 const api={e,label,address,abs,jsr,jmp,b,imm,ld,st,set,copy,current:()=>pc,fixupByte};emit(spec,api,0x20);
 for(const fixup of fixups){const value=labels[fixup.name]??(typeof fixup.name==='number'?fixup.name:undefined);if(value===undefined)throw Error('Unknown audio viewer label '+fixup.name);const at=fixup.at-0xC000;if(fixup.part)prg[at]=fixup.part==='lo'?value&255:value>>8;else{prg[at]=value&255;prg[at+1]=value>>8;}}
 if(pc>0xCFF0)throw Error('Audio-enabled scene viewer code/data reaches $'+pc.toString(16).toUpperCase()+'; reduce tracker data or use a playable runtime');
 const nmi=labels.aud_viewer_nmi,vec=0xFFFA-0xC000;prg[vec]=nmi&255;prg[vec+1]=nmi>>8;return {...engine,prg,size:pc-0xC000,nmi,audio:{labels,zpBase:0x20}};
}
services.AudioEngine={emit,enhanceViewer};
})();
