/* Public distribution profile: private captured project templates are excluded.
 * Native decoders continue to read the user-selected ROM on demand. */
(()=>{'use strict';
window.Forge=window.Forge||{};window.Forge.services=window.Forge.services||{};
function find(){return null;}
function info(){return null;}
async function project(){throw Error('This private captured-project template is not bundled in the public build. Open your local source ROM or recovery pack.');}
window.Forge.services.RecoveryCatalog=Object.freeze({find,info,project});
})();
