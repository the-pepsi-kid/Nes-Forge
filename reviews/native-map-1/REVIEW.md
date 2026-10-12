# Native map recovery review

Candidate: `2.0.0-alpha.11 / native-map-1`, schema 12.

The bounded A2 implementation preserves the existing framework owners. `REMethods` owns discovery and dispatch; `RENativeScene` owns the shared background/map staging lifecycle; `ProjectStore` owns scene append, stale guards and Undo; the ordinary collision model and compiler own generated behavior. The existing A1 background API and outputs are retained. No runtime emitter, recipe algorithm, project schema or template was extended.

Independent production review identified and resolved two structural-recognition defects before the release freeze:

- Native state operands could alias the level buffer or CPU stack, allowing initialization to erase the map pointer or corrupt calls. Recognition now requires disjoint bounded RAM ownership and reserves the stack page.
- A parameter-loader suffix was not fully recognized, allowing an unchecked instruction to alter a copied pointer. Recognition now validates the complete relevant 173-byte routine and coherent state writes.

Original CPU execution demonstrates both rejected mutations. The final decoder's 22 focused cases pass. Procedural-base cells that are not explicitly written remain unknown, with `solid: null`; unknown geometry is not presented as empty.

Graphics evidence compares all 8,192 uploaded CHR-RAM bytes, reset palette writes and every referenced raw map against original CPU/PPU execution. In particular, the native PB53 `$83` operation retains buffer content and differs from the distributed CHR asset by ten bytes. Recovery follows executed code. Native random decoration, later palette updates and game-state effects remain outside the conversion.

Integration exercises the actual generated ROM: recovered floor support, an ordinary Collision-tab floor removal, canonical wall blocking/opening, and full background pixels. Source identity, cancellation, stale stages, unowned stages, import/Undo/Redo, Save As/reopen and linked metatile collision fallback are covered. The separate playable project uses an explicitly authored player and Forge physics; import itself appends an excluded scene without changing active runtime settings.

The method discovers 22 referenced maps structurally; one fits the declared static Empty/Solid subset. Unsupported native interactions, one-way landing, scrolling and procedural behavior receive explicit refusals. This is a format method, not a ROM filename/hash allowlist or general reconstruction of the original game.

All 38 existing current example files were regenerated and compared with the committed A1 parent: nine ROMs, fourteen projects and six recipes remain byte-identical. Only four receipt HTML hashes change. Exact source reversal reconstructs the parent and historical protection layers.

Authoritative full-gate outcomes are in `app/test-results/candidate/Summary.json` and `app/checkpoints/native-map-1-clean-extraction/Reproduction.json`, bound to the exact frozen HTML. All thirteen current browser reports are blocked with zero checks because Chromium is unavailable. VM and CPU/PPU results do not establish browser, independent-emulator, listening, device or hardware acceptance. The candidate remains unpromoted and the full roadmap remains unfinished.
