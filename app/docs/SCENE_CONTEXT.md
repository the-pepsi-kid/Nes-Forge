# Navigate source contexts, rooms and pages

Expand **Scene resources** below the toolbar in stage-context-1.

1. **Stage / World / source context** includes existing Worlds and recovered rooms. New native imports also offer their source **area** or **table context**. These source groupings do not establish complete playable stages, stage order or routes.
2. **Room / native slot** shows the catalog membership saved at import. Imported rooms are selectable; missing rooms and unavailable native slots stay listed and disabled. The coverage text counts each category. Conflicting source receipts disable context/room selection; individual project scenes remain inspectable.
3. **Scene / page** selects a canonical page of the chosen room. Scene, CHR, collision and Entity Studio use it. Live edits are saved by the existing scene switch. The existing Scene selector also updates context.
4. A page with an exact imported World owner selects that World and pans to its page within the segment. **Open World** keeps the chosen page. The existing World dropdown follows its declared tileset if the current page does not belong to that World. World rendering still uses the declared tileset scene; editing another page does not rebind or copy it.
5. Sprite poses and clips use the import's explicit canonical sprite owner, including on other pages. Shared animations retain their references; opening a clip selects a related frame. Repeated imports receive separate World and sprite-owner IDs. No resource is cloned by navigation.
6. **Open matching RE scene** requires the matching source hash/profile already open in RE. Source inspection stays detached. **Use inspected room** explicitly returns to an already-imported matching native room, preserving the current page when it already belongs to that room. It does not import missing rooms or replace source state.
7. **Audio (project)** opens the existing tracker without choosing music, changing timing or enabling a runtime. Scene/event-to-cue bindings remain unresolved.

Save/reopen preserves these optional source receipts and reconstructs the view. Ordinary projects stay schema 12; native source/recipe projects stay schema 13. Existing room-only receipts retain the earlier navigator and do not gain guessed stage membership. Context receipts document provenance, not authentication.

Native projects still rebuild only their supported location fields. Stage topology, directional collision, native art/Audio/behavior encoders and complete gameplay reconstruction remain future work.
