# Canonical Behavior Graph

The Behavior Graph is an authoring view over `gameplayCore.behaviors`. It adds no
saved graph document, executable representation, schema fields, template, or
runtime instruction. Canonical tables, native project JSON, Undo/Redo, validation,
and the existing Gameplay Compiler remain authoritative.

## Open and edit

1. Open the existing Gameplay panel and expand **GAMEPLAY CORE · TYPED TABLES**.
2. Add one of the existing templates if there are no Actor Definitions yet.
3. Expand **BEHAVIOR GRAPH** below the template controls in the Gameplay Core panel.
4. Choose an Actor Definition or Behavior. Select a state card to edit its name,
   initial-state role, and ordered entry/tick/exit actions.
5. **Add transition from state** creates an ordinary transition record. Choose
   its destination, priority, typed conditions, and ordered actions in the
   inspector. Selecting a transition in the list also highlights its drawn edge.
6. **Earlier in table / Later in table** changes the canonical tie order. Higher
   priority takes precedence; equal priorities are evaluated in table order.
7. Use **References** to navigate to a connected state or transition. Diagnostic
   buttons select the relevant canonical record and operation where available.
8. Build normally and save with **Save Project As…**. Reopening JSON restores the
   same records. Selection and automatic layout are temporary view state.

The graph uses real buttons, selects, and inputs. It does not require dragging,
hovering, a mouse, or canvas hit testing. Coarse-pointer controls use larger touch
targets, and state cards rearrange into fewer columns in a narrow panel.

## Template editing and safety

**Duplicate for selected Actor Definition** copies its current Behavior and
assigns the copy only to that Actor Definition. Instances of that Definition
continue to share it. Other Definitions using the original Behavior keep their
original reference. This is one ordinary Undo action.

A state cannot be removed while it is initial or has connected transitions.
Choose a new initial state and explicitly remove or retarget connections first.
Invalid changes do not change source or create an Undo entry. Stable record IDs
are displayed and retained; the graph edits the state name separately.

The graph does not expand the compiled profile. The five existing templates,
12-actor limit, 64 persistent-byte limit, and old-ROM behavior remain unchanged.
The Sideview Player uses its retained compatibility runtime; changing its graph
does not replace that runtime. Disabled Behavior components remain inert.

## Diagnostics and boundaries

Diagnostics include malformed operation operands, unsupported runtime operations,
missing references, structurally unreachable states, equal-priority ordering, and
transitions hidden behind an earlier unconditional transition. Paths use stable
Behavior/state/transition IDs and ordered operation indices. Whole-project
validation also reports ownership and component contracts.

Reachability is structural. A path in the graph does not establish that runtime
conditions can occur. Conditions, persistent values, placement, and runtime
profile restrictions still require a successful build and gameplay review.
Unknown operation types already present in authoring data are retained and
identified; selecting another type is an explicit replacement.

The graph's new-operation inspector marks operations absent from the current
compiled profile as **authoring only** and reports them as build errors. It does
not silently emulate them or convert them to another operation.

ContactDamage legacy mirror values and Actor Instance persistence bindings keep
their existing canonical contracts. Diagnostics report conflicts rather than
silently modifying a component when a Behavior action is edited.

## Verification

`node tests/gameplay-graph192.cjs` exercises actual created control handlers,
selection isolation, table/graph refresh, typed edits, atomic rejection,
Undo/Redo, explicit deletion, canonical ordering, reference navigation,
Behavior duplication, disabled/compatibility diagnostics, project save/reload,
byte-identical rebuilt ROM output, and an input transition executed by emitted
6502 code in the bundled emulator.

These are DOM-harness and generated-runtime checks. They do not claim real
browser layout, screen-reader review, native mobile keyboard presentation,
physical-controller behavior, or a hardware-console pass.
