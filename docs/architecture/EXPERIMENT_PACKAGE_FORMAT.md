# Experiment package format (NESForgeExperimentPackage v1)

A package is one JSON document (`*.forge-experiment.json`) holding everything needed to inspect an investigation and
reproduce it: what ran, on what, with what input, what was seen, what was claimed and what was rejected. It is
produced by `experiment.exportPackage` (the panel's **Export evidence package**), checked by `experiment.inspectPackage`
or `tools/agent-lab/inspect-package.cjs`, reproduced by `experiment.replayPackage`, and run in an independent emulator
by `tools/agent-lab/independent/verify-package.cjs`. Module: `app/src/re/experiment-package.js` (UMD; the same code
validates in the editor and in Node).

The metadata-only export of AL-EXP-01 (`experiment.exportMetadata`) stays available as the lightweight alternative:
hashes, offsets, counts and outcomes, no bytes.

## Integrity

- `packageHash` is the SHA-256 of the canonical JSON of every other field. Canonical JSON has sorted keys and integers
  only.
- A fraction is stored as an integer per mille, under the field name with `Permille` appended. For example
  `coverage: 0.873` becomes `coveragePermille: 873`.
- Receipts, the candidate definition and independent receipts carry their own seals and are re-verified on validation.
- Every embedded payload is checked against its SHA-256.

## Complete and referenced evidence

Every piece of evidence is either **embedded** (its bytes are present) or **referenced** (only its SHA-256 and the
reason it is absent). `manifest.completeness` counts both and lists the referenced items, with
`kind: "complete" | "partial"`. Reasons used:

| Reason | When |
|---|---|
| `larger than 98304 bytes: regenerable by replaying the recorded inputs` | Large payloads (for example the full bus trace). Replaying the package's plans regenerates them, and the replay compares their digests |
| `regenerable by running the job` | Pixels, CHR and reads of the variant jobs. The baselines' are embedded |
| `derived from a private cartridge` | Every capture, payload and job channel of a non-synthetic package |

## Private cartridges

`privacy: "private"` is the setting for any cartridge that is not one of Forge's synthetic fixtures.
- **Never embedded:** the cartridge, every capture derived from it, every payload, and every mutation's byte values
  (only offsets and regions are kept). The validator refuses a private package that embeds any of them.
- **Reference only:** the cartridge is recorded by SHA-256. Verifying the package needs a locally supplied cartridge
  with that SHA-256 (`--cartridge FILE.nes`, or the `bytes` argument of `experiment.replayPackage`); any other file is
  refused.
- **Digests:** the independent harness can still verify a private package, comparing FCEUX's captures with the
  recorded digests.

In this phase experiments run only on synthetic fixtures. The private mode exists so the format never needs changing
to keep commercial material out.

## Fields

| Field | Content |
|---|---|
| `format`, `version` | `NESForgeExperimentPackage`, `1` |
| `manifest` | the NES Forge engine (document SHA-256), privacy, the list of sections, and completeness |
| `cartridge` | `sha256`, `byteLength`, `mapper`, `mirroring`, `prgBytes`, `chrBytes`, `availability` (`embedded` with `base64`, or `reference` with a note). Optionally `generation`, the fixture-generation instructions for a synthetic fixture (generator, seed, command) |
| `inputs` | the training and withheld input designs: steps of frames and buttons, and capture frames |
| `plans` | every validated `NESForgeExperimentPlan`, with its hash and the hashes of its receipts |
| `receipts` | every sealed `NESForgeExperimentReceipt`: identities, outcome, channels, capture digests, first divergence, trace summary, limitations, verification block (`independent: false`) |
| `payloads` | capture and trace payloads by SHA-256: embedded or referenced |
| `edges` | one causal edge per trial: what was changed, and what was observed |
| `hypotheses` | `ranked` (every candidate with coverage, trace support and base evidence), `supported`, `falsified` (each with its classification and reason), `confounded`, `untested` |
| `interventions` | each intervention's mutation, prediction size, outcome, result and interpretation (read or not read, path same or diverged, classification); the controls; the second-position and repeat confirmation; the palette arrays considered |
| `observe`, `propose` | repeatability and trace completeness; what the search considered |
| `candidate` | the frozen `NESForgeCandidateDefinition` (v2), or `null` |
| `revisions` | the revision chain: number, hash, previous hash |
| `result` | the classification (`candidate`, `ambiguous`, `insufficient-evidence`, `inconclusive`) and its reason |
| `reconstruction` | the withheld screen cell by cell (status and IDs), the stated attribute bits, the input hash, and `claims`: each claimed cell's four tiles, in engine-neutral form |
| `verification` | the mirroring, NES Forge's colour-class table, the verification jobs, the same-engine checks, and any attached independent receipts. Each job holds its definition, expectation and NES Forge's NMI-synchronized captures (digests, with embedded or referenced channels) |
| `lifecycle` | the lifecycle assessment when exported |
| `limitations` | what the package does not establish |

**Verification job** (`NESForgeVerificationJob` v1):
- `id`, `kind` (baseline, holdout, intervention, control);
- `cartridgeSha256`, `mutations`, `variantSha256`;
- `nmiTarget`;
- `latches` (the mask at each `$4016` latch) and `defaultMask`;
- `checkpoints` (`{label, nmi}`), `maxFrames`;
- `trace`, `chr`, `pixels`, `channels`.

**Expectation:**
- `reference`;
- `prediction` (with `predict`: `{label, index, value}` over the visible 1024 bytes);
- `no-effect`;
- `claims`;
- `compare-only`.

## Example

`QA/fixtures/al-exp-02/samples/` holds an example package from the acceptance run, and the FCEUX receipt for it.

```bash
node tools/agent-lab/inspect-package.cjs QA/fixtures/al-exp-02/samples/example.forge-experiment.json
```

```bash
node tools/agent-lab/independent/verify-package.cjs QA/fixtures/al-exp-02/samples/example.forge-experiment.json --out /tmp/receipt.json
```
