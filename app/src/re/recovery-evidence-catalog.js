/* Public distribution profile: private embedded raw APU/CHR/OAM captures are excluded. */
(()=>{'use strict';
window.Forge=window.Forge||{};window.Forge.services=window.Forge.services||{};
function list(){return [];}
async function get(){throw Error('Private captured evidence is not bundled in the public build. Open your local recovery pack.');}
window.Forge.services.RecoveryEvidenceCatalog=Object.freeze({list,get});
})();
