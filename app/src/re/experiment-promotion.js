/* AL-EXP-02: the resource promotion contract. Eligibility rules and a data-only preview of what a verified candidate
 * would become in one of Forge's editors. This phase never promotes: there is no function here that writes to a
 * project, the resource library or a cartridge, and an unverified candidate cannot even be previewed. UMD, pure. */
(function(root,factory){const node=typeof module!=='undefined'&&module.exports;const api=factory(node?require('./experiment-contract.js'):root.ForgeExperimentContract);if(node)module.exports=api;else root.ForgeExperimentPromotion=api;})(typeof globalThis!=='undefined'?globalThis:this,function(contract){
'use strict';
const VERSION=1;
const ORDERS={row:{TL:0,TR:1,BL:2,BR:3},column:{TL:0,BL:1,TR:2,BR:3}},QUADS=['TL','TR','BL','BR'];
// Destinations in Forge's editors, and what this phase can preview into each.
const DESTINATIONS=Object.freeze({
  metatiles:{editor:'Metatiles (2x2 blocks)',kinds:['metatile-table-2x2'],preview:true},
  chr:{editor:'CHR sheet',kinds:[],preview:false,reason:'a 2x2 metatile table holds tile numbers, not tile graphics; CHR comes from the CHR source, not this candidate'},
  palettes:{editor:'Palettes',kinds:[],preview:false,reason:'the candidate\'s palette array selects one of four background palettes per record; palette colours are a separate resource, not yet a candidate kind'},
  scenes:{editor:'Scenes',kinds:[],preview:false,reason:'a scene needs a screen map decoder (map location and format), not yet a candidate kind'},
  world:{editor:'World',kinds:[],preview:false,reason:'world layout needs map and pointer-table decoders (later scope)'},
  sprites:{editor:'Sprites and metasprites',kinds:[],preview:false,reason:'sprite definitions are a different discovery (later scope)'},
  entities:{editor:'Entities',kinds:[],preview:false,reason:'entity placement and behaviour are later scope'},
});
const SUPPORTED_DECODERS=Object.freeze([{name:'metatile-2x2',version:1}]);

// Every rule an eligible candidate must meet; each unmet rule is named.
function eligibility({definition,assessment,destination='metatiles'}){
  const unmet=[];const dest=DESTINATIONS[destination];
  if(!dest)unmet.push('unknown destination '+destination);
  const v=definition?contract.verifyCandidate(definition):{ok:false,problems:['no definition']};
  if(!v.ok)unmet.push('the definition does not verify: '+v.problems.join('; '));
  if(definition&&definition.version!==2)unmet.push('a v1 definition names no decoder version or assumptions');
  if(dest&&definition&&!dest.kinds.includes(definition.kind))unmet.push((dest.reason||'this destination does not take '+definition.kind)+'');
  if(definition&&!SUPPORTED_DECODERS.some(d=>d.name===definition.decoder?.name&&d.version===definition.decoder?.version))unmet.push('decoder '+JSON.stringify(definition?.decoder||null)+' is not one the promotion contract supports');
  if(definition&&(definition.table.numbering||'operand-evidence')!=='operand-evidence')unmet.push('record numbering is relative: exact record identity is not established');
  if(!assessment||!['independently-verified','promotion-eligible','user-approved'].includes(assessment.state)||assessment.side)unmet.push('the lifecycle assessment is '+(assessment?assessment.state+(assessment.side?' ('+assessment.side+')':''):'missing')+'; independent verification is required');
  if(assessment&&definition&&assessment.definitionHash!==definition.definitionHash)unmet.push('the assessment is about another definition');
  return {eligible:!unmet.length,destination,unmet,rules:['definition verifies (v2)','destination takes this kind','decoder version supported','record numbering from operand evidence','lifecycle: independently verified, no side state','assessment names this definition']};
}

// What promotion would create, as data: never written anywhere in this phase.
function preview({definition,rom,assessment,destination='metatiles'}){
  const e=eligibility({definition,assessment,destination});
  if(!e.eligible)return {format:'NESForgePromotionPreview',version:VERSION,destination,eligible:false,unmet:e.unmet,records:[],writes:[]};
  const t=definition.table,f=ORDERS[t.order],layout=contract.romLayout(rom);
  if(contract.sha256(rom)!==definition.source.sha256)throw Error('Promotion preview: the cartridge is not the definition\'s source');
  const pal=definition.attributes,decode=pal?.decode==='low2'?v=>v&3:pal?.decode==='high2'?v=>v>>6:null;
  const aliasOf=new Map();definition.aliases.forEach((a,i)=>a.ids.forEach(id=>aliasOf.set(id,i)));
  const records=[];
  for(let id=0;id<=definition.extent.highest;id++){
    const offsets=QUADS.map(q=>t.physicalBase+id*t.recordStep+f[q]*t.fieldStep);
    records.push({id,tiles:offsets.map(o=>rom[o]),sourceOffsets:offsets,palette:decode?decode(rom[pal.physicalBase+id]):null,paletteOffset:pal?pal.physicalBase+id:null,observed:definition.extent.knownIds.includes(id),aliasGroup:aliasOf.has(id)?aliasOf.get(id):null});
  }
  const body={format:'NESForgePromotionPreview',version:VERSION,destination,eligible:true,definitionHash:definition.definitionHash,decoder:definition.decoder,assumptions:definition.assumptions,
    source:{sha256:definition.source.sha256,mapper:layout.mapper,table:{physical:t.physicalBase,cpu:t.cpuBase,layout:t.layout,order:t.order,recordStep:t.recordStep,fieldStep:t.fieldStep,recordBytes:4},
      palette:pal?{physical:pal.physicalBase,decode:pal.decode}:null,range:{first:0,last:definition.extent.highest,observed:definition.extent.knownIds.length}},
    knownAliases:definition.aliases,unsupported:definition.unsupported,records,
    wouldCreate:{metatiles:records.length,note:'2x2 metatiles in the Metatiles editor, each keeping its source offsets'},
    writes:[],conflicts:'not evaluated: a preview never writes, so it cannot overwrite anything'};
  return {...body,previewHash:contract.hashOf(body)};
}
return Object.freeze({version:VERSION,DESTINATIONS,SUPPORTED_DECODERS,eligibility,preview});
});
