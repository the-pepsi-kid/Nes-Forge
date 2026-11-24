# Discovery lifecycle and the resource promotion contract (AL-EXP-02)

Modules: `app/src/re/experiment-lifecycle.js`, `app/src/re/experiment-promotion.js` (UMD, pure). Commands:
`experiment.lifecycle`, `experiment.promotionPreview`, `experiment.reviseDefinition`.

**A state is never stored on a definition and never set by hand.** It is assessed from evidence each time.
- No score can move a candidate forward. A table that explains 100% of the screens but was never tested stays a
  hypothesis.
- No agent's recommendation can either.
- Falsified, ambiguous and inconclusive results are findings, and they are kept in the package.

## States and their evidence requirements

| State | Evidence required |
|---|---|
| Uninvestigated | Nothing has run yet: no plan, receipt or capture exists for this cartridge |
| Observed | A baseline run of the training input reached its target (background enabled at every capture), with sealed receipts |
| Hypothesis | At least one ranked candidate table explains at least three distinct observed records. Its geometry is not yet tested |
| Experimentally supported candidate | The intervention evidence below holds, the controls show no effect, every other tested hypothesis was falsified, and record 0 is established by instruction operands |
| Same-engine repeatable candidate | Two cold and two checkpoint-restored baselines identical (state, frames, ordered bus events), and the supporting intervention repeated with identical captures. This is determinism on one engine, not correctness |
| Independently verified candidate | A sealed receipt from an emulator that is not NES Forge, bound to this definition and cartridge, which NES Forge re-checks from its raw captures. The engines agree on every compared channel at every checkpoint, and on the other engine every supporting intervention shows its predicted effect, every control and decoy shows none, and every withheld-screen claim holds |
| Resource promotion eligible | The conditions below hold. Eligibility allows a preview only |
| User-approved resource | A person approved the promotion preview of this exact definition (an approval record naming the definition and preview hashes). **Not available in this phase: nothing is promoted** |

**Experimentally supported: the intervention evidence.** A frozen candidate whose single-byte interventions changed
exactly the predicted cells, to the predicted values:
- at two record positions, when the table has a second record that appears exactly once;
- without changing the program's path.

The controls that must show no effect are a same-value write, an unrelated byte, and a restoration run of the original
cartridge after every variant.

**Resource promotion eligible:**
- independently verified, with no side state;
- frozen before the withheld input ran;
- record numbering from operand evidence;
- a decoder version and destination the promotion contract supports.

Side states:

| Side state | When |
|---|---|
| Falsified | Every tested hypothesis was falsified by a clean intervention |
| Ambiguous | Several hypotheses survived and describe different tables, or the table is supported but record 0 is not established. In the second case IDs are relative and exact identity is not claimed. An ambiguous candidate is never promoted |
| Inconclusive | The evidence cannot decide: a control showed an effect, an intervention changed the program's path (confounded), a run did not reach its target, or the observations cannot fix a table's geometry (insufficient evidence) |
| Verification blocked | The independent emulator could not run |
| Verification failed | The independent engine disagreed on a compared channel, or a prediction failed on it |

## What an intervention can show

Each tested hypothesis gets exactly one of these classifications:

| Classification | Meaning |
|---|---|
| `supported` | the predicted cells changed to the predicted values and nothing else on screen changed; the program's path is the same |
| `falsified-not-read` | the program never read the byte under this input (complete trace): irrelevant for this input, not shown irrelevant in general |
| `falsified-no-observed-effect` | the byte was read but nothing observed changed: no observed effect, which is not the same as irrelevant |
| `falsified-unpredicted-effect` | something changed, but not what the hypothesis predicts |
| `confounded` | the change altered the program's execution: its per-frame executed-PC digest differs from the baseline's, so the screen effect cannot be attributed to the table |
| `inconclusive` | the trial did not complete (crash, timeout, target not reached, cancelled) |

## Revisions and withheld data

A frozen definition is never edited.
- **A change is a new revision.** `contract.reviseCandidate` makes revision n+1, which names revision n's hash and starts
  untested: hypothesis `proposed`, no interventions, no evaluation.
- **No evidence carries over.** Experimental support is read from the definition's own sealed evidence, so a revision
  stops at Hypothesis until it has its own interventions.
- **No reused withheld input.** A withheld input that evaluated one revision cannot evaluate another, and the
  assessment says so.

## Circular verification is prevented

| Stage | Where it runs | What it can see |
|---|---|---|
| Fixture generation | `QA/fixtures/al-exp-02/generate.cjs`, Node | everything; writes the cartridge and its truth file |
| Cartridge execution, hypothesis generation, mutation testing, freezing, withheld reconstruction | the editor's sandbox | the cartridge bytes and the input design only |
| Ground-truth evaluation | `oracle.cjs`, Node | the truth file and the discovery report, after the report, package and receipt exist |
| Independent emulator verification | `verify-package.cjs`, FCEUX | the package (cartridge, inputs, jobs, frozen definition, claims) |

**What the acceptance suite checks:**
- the discovery, verification, lifecycle, package and promotion modules name no fixture answers and read no files;
- the build carries no generator, oracle or truth;
- no AL-EXP-02 cartridge carries its seed, scenario or generator name (the marker is the gate prefix and random
  filler);
- scrambling everything after the gate prefix, renaming every capture label, or moving the table changes nothing but
  the answer's offset;
- the 22 seeds (11 withheld, drawn from `/dev/urandom`) were committed before the generator and every discovery change.

## The resource promotion contract

This phase implements eligibility and a preview, never promotion.
- **No writer exists.** The promotion module has no function that writes, promotes, registers or commits anything.
- **Unverified candidates stay out.** An unverified candidate cannot be previewed, and the library's intake already
  refuses candidate definitions.

| Destination | This phase |
|---|---|
| Metatiles (2x2 blocks) | Previewable for a `metatile-table-2x2` candidate |
| CHR | Not a destination for this kind: a metatile table holds tile numbers, not tile graphics |
| Palettes | Not yet a candidate kind: the palette array selects one of four background palettes per record |
| Scenes | Needs a screen-map decoder, not yet a candidate kind |
| World | Needs map and pointer-table decoders (later scope) |
| Sprites | A different discovery (later scope) |
| Entities | Later scope |

**What a v2 definition records:**

| Field | Content |
|---|---|
| `source` | The source cartridge's SHA-256 |
| `table.physicalBase`, `table.cpuBase` | The file offset and the CPU address of the table |
| `assumptions` | Mapper, banking, mirroring and screen |
| Record geometry | `recordStep`, `fieldStep`, `layout`, `order`, and the range in `extent` |
| `attributes` | The palette array and its encoding |
| `aliases` | Known aliases |
| `unsupported` | The cases the definition does not support |
| `evidence`, `verification` | Plans, interventions and repeatability. Independent verification is always a separate record |
| `decoder` | The decoder definition version (`metatile-2x2` v1) |
| `revision` | The revision number and the previous revision's hash |

**The preview (`NESForgePromotionPreview`)** lists every record that would become a metatile: its tiles, palette, four
source offsets and palette offset, whether it was observed, and its alias group. It also carries the source hash,
offsets, CPU address, decoder and unsupported cases, `writes: []` and a `previewHash`. A future approval would name
that hash.

## Translated definitions (CAD-PORT-01)

Definitions translated from upstream knowledge enter this lifecycle as hypotheses with recorded provenance. They
become verified resources only through the same evidence: interventions, repeatability and independent verification.
