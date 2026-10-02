# Reproducible regression tests

Requires Node.js 20 or newer. No npm packages, downloaded fixtures, proprietary ROMs, network access, or build step are needed. Run all suites from the extracted release folder with `node tests/run_all.cjs` (or `npm test`). Individual suite commands follow:

```sh
node tests/regression.cjs mainline/NES_Forge_1.6.5_First_Playable_Room.html
```

`tests/run_all.cjs` accepts an alternate HTML path as its first argument and writes per-suite logs, machine-readable reports, and an aggregate `test-results/Summary.json`. The aggregate runner requires the complete 1.6.5 editor. The older general regression suite also accepts the stabilized or original HTML as its argument; original 1.6.2 is expected to fail the metadata collision/exhaustion and destination-link regressions. A VM timeout protects tests against the historical allocator hang.

To write a machine-readable report:

```sh
FORGE_TEST_REPORT=Regression_Test_Results.json node tests/regression.cjs mainline/NES_Forge_1.6.5_First_Playable_Room.html
```

In Windows PowerShell:

```powershell
$env:FORGE_TEST_REPORT = 'Regression_Test_Results.json'
node tests/regression.cjs mainline/NES_Forge_1.6.5_First_Playable_Room.html
```

The general suite evaluates the complete HTML inline application script in a Node VM. It tests actual project loading/serialization, history, metatile painting, worlds, assembly, generated ROMs, emulator startup, ROM re-import, and Save As promise/stream behavior. When the 1.6.3 persistence layer is present, it additionally runs composer, animation, asset linking, rendering logic, and MS16 tests. Fixtures are original synthetic scenes and minimal assembly programs in `fixtures.cjs`.

`harness.cjs` supplies a lightweight DOM, no-op canvas, and inactive timers. Drawing tests explicitly record pixel writes from the real drawing functions; the emulator smoke test examines the application's actual framebuffer. This is not a browser, screenshot/layout audit, native file-dialog test, or comprehensive emulator accuracy test. IndexedDB recovery, browser gesture requirements, pop-up policy, actual file writes, and OS Save As behavior require manual browser verification. DOM mocks permit missing elements, so initialization success does not establish that every UI control exists or is wired in a real browser.

The source-preservation case checks the SHA-256 fingerprints in `preserved-source.json`, taken from the supplied 1.6.2 baseline. It proves those emulator/capture/Save As/CHR source blocks were retained exactly; it makes no independent claim about their historical correctness or interactions with newer layers.

These are reconstructed, runnable tests. They do not reproduce, replace, or substantiate the inherited **344/344** report, whose source tests and fixtures were absent.

The dedicated WR16 corruption/compatibility suite is also dependency-free:

```sh
node stabilization/tests/world_codec.test.cjs mainline/NES_Forge_1.6.5_First_Playable_Room.html
```

Additional MS16 validation, linking, and import cases:

```sh
node tests/metasprites.cjs mainline/NES_Forge_1.6.5_First_Playable_Room.html
```

The recorded baseline countercheck (`Baseline_Regression_Results.json`) reports 32/35 passing on original 1.6.2. Its three failing cases reproduce metadata placement at an occupied address, exhausted metadata space, and unresolved world/marker destinations after a real ROM re-import.

The UI handler suite is `node tests/composer-interactions.cjs mainline/NES_Forge_1.6.5_First_Playable_Room.html`. Its report explicitly distinguishes mocked handler checks from real browser interaction.

The 1.6.4 suites exercise these additional contracts:

| Suite | What it checks |
| --- | --- |
| `tests/model164.cjs` | Stable animation/entity identities, legacy migration, state mapping and defaults, invalid-edit atomicity, independent hit/hurt geometry, event ordering and UTF-8 bounds, undo/redo, deep frame duplication, exact frame-entry boundaries, loop/nonloop behavior, informational event handling, and facing reflection of art and boxes. |
| `tests/frame-editor164.cjs` | Frame-contact/event editing controls and preview behavior through the mocked DOM. |
| `tests/entity-studio164.cjs` | Entity animation assignment and playback controls through the mocked DOM. |
| `tests/persistence164.cjs` | v7 project persistence, new ROM metadata, old asset compatibility, reference remapping, corruption rejection, and atomic failure behavior. |

Each new suite accepts the HTML path as its first argument. The model and persistence suites honor `FORGE_TEST_REPORT`; handler suites accept a report path as their second argument. The aggregate runner supplies both conventions. To run only the model cases:

```sh
node tests/model164.cjs mainline/NES_Forge_1.6.5_First_Playable_Room.html
```

All 303 cases delivered with 1.6.4 remain in the aggregate. `version-expectations.cjs` adjusts only the intentional schema migration: v8/foundation 1.6.5, viewer defaults for legacy projects, and missing frame `hitboxes`, `hurtboxes`, and `events` arrays defaulting to `[]`. It does not discard authored fields or relax the older source, ROM, geometry, Save As, or corruption assertions. Fixture names mentioning v5/v6 describe the input project version, even when the loaded project is migrated to v8.

The 1.6.5 suites add generated gameplay and compatibility checks:

| Suite | What it checks |
| --- | --- |
| `tests/compiler165.cjs` | Actual linked-ROM compilation, per-cell collision, metatile overrides, source palettes, hardware sprite expansion, and runtime limits. |
| `tests/ui165.cjs` | Build mode/configuration UI handlers through the mocked DOM. |
| `tests/persistence165.cjs` | GP16 configuration, project/ZIP retention, ROM re-import references, corruption rejection, and atomicity. |
| `tests/gameplay165.cjs` | Original synthetic rooms running as generated 6502 ROMs in the bundled emulator: controls, collision, jump/platforms/ceilings, animation/events, target hits, facing, restart, NMI timing, and deterministic RAM/OAM/pixels. |
| `tests/engine165.cjs` | Actual machine-code worst-case update budget, minimum body bounds, stopped animation events, signed/offscreen sprites, and engine data reservation bounds. |

Gameplay tests set the existing controller key state, run the actual emulator, and finish a pending machine-code update at its main-loop boundary with bounded `cpuStep()` calls before inspecting RAM. They never use a JavaScript physics approximation. The framebuffer can represent the prior visible state relative to newly computed actor RAM, so rendering assertions account for the OAM transfer boundary. These tests exercise the bundled scanline emulator; they do not establish cycle-accurate NES hardware compatibility.

The historical MS16 v1 import case explicitly uses the preserved 1.6.3 HTML. The v8 migration updates output-schema expectations and uses schema 999 for unknown-future-version rejection; all earlier assertions remain.
