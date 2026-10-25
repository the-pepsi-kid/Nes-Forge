/* Exact investigated legacy-header exception. Source/output bytes are never
 * normalized: only the existing emulator's header view uses proven MMC3. */
(()=>{
'use strict';
const previous=parseRomHeader;
parseRomHeader=function(input){const bytes=input instanceof Uint8Array?input:Uint8Array.from(input||[]);if(bytes.length===262160&&bytes[6]===0x42&&bytes[7]===0x44&&Forge.services.NativeResourceProject.recognizes(bytes)?.id==='shadowgate-us-pictures-v1'){const header=bytes.slice(0,16);header[7]&=15;const view=bytes.slice();view.set(header);return {...previous(view),declaredMapper:68,mapperEvidence:'shadowgate-us-pictures-v1 immutable source guard'};}return previous(input);};
})();
