# AL-EXP-02 randomized synthetic fixtures

Original test cartridges for independent experimental verification
([docs/architecture/AGENT_LAB_VERIFICATION.md](../../../docs/architecture/AGENT_LAB_VERIFICATION.md)).
- **How they are made:** every byte comes from `(seed, scenario)` through `generate.cjs`, using its own small assembler
  (`asm6502.cjs`: AL-EXP-01's, with a few more instructions).
- **Content:** no commercial or third-party material. Apache-2.0, like the rest of Forge.

## What varies

Same cartridge family as AL-EXP-01:
- iNES NROM-128 (16 KiB PRG, 8 KiB CHR-ROM);
- four 16x15 screens of 2x2 metatiles: Right cycles the three training screens, B shows the withheld screen.

This suite randomizes much more:

| | Varied by the seed |
|---|---|
| Placement | table, palette array, maps, code and decoys at random PRG offsets. The table, the data and the code are each read through the `$8000` or `$C000` mirror, and the table with X or Y. Zero-page variables sit at random addresses |
| Content | record count, tiles, palettes, alias groups (count, size, same or different palette), screen arrangement, which decoys exist, and unused-data styles (random, zero, ramp, pseudo-records) per kilobyte |

**Interleaved tables are capped at 64 records** when read with absolute indexing: the program forms `id*4` in an 8-bit
register. FCEUX showed records 64 and above wrapping before the cap existed.

## Scenarios and the expected result

| Scenario | What it adds | Correct result |
|---|---|---|
| `standard` | random mix | candidate |
| `perfect-decoy` | an exact copy of the table that the program never reads | candidate; the copy falsified as not read |
| `read-unrelated` | a table the NMI handler reads every frame (8 bytes a frame), holding a partial copy of the records but unrelated to the screen | candidate; the unrelated table never supported |
| `palette-aliases` | 3-5 groups of identical tiles with different palettes | candidate; aliases resolved by palette |
| `identical-aliases` | 3-4 groups of identical tiles and palettes, all shown on the withheld screen | candidate; those cells explicitly ambiguous |
| `unobserved-records` | about a third of the records appear only on the withheld screen, including the highest IDs | candidate; unseen records inside the table reconstructed, those past it not claimed |
| `insufficient-observations` | the training screens show only two distinct records | insufficient evidence |
| `indirect-numbering` | records reached through a pointer computed from (map value + K); no instruction names record 0 | ambiguous: location and layout supported, record numbering undetermined |
| `confounded-guard` | a boot checksum over the table; a mismatch switches drawing to a backup copy, so changing the table changes the program's path | inconclusive: the table's interventions are confounded |

## Seeds

`seeds.json` pins 22 fixtures: 11 development and 11 withheld, one per scenario plus three standard ones in each group.
- **Withheld seeds:** drawn from `/dev/urandom` and committed before the generator or any discovery change. They are run
  only by the acceptance suite.
- **Markers:** the cartridge's marker is the gate prefix `NESFORGE-SYNTHETIC/1 ` and random filler. It carries no seed,
  scenario or generator name.

## Files

| File | Use |
|---|---|
| `seeds.json` | the pinned fixtures, roles, scenarios, expected results and SHA-256s |
| `roms/`, `truth/` | the cartridges and their truth files (used only by the oracle and by tests that need a known effect) |
| `oracle.cjs` | judges a discovery result against the truth; imports nothing from `app/` |
| `samples/` | an example package from the acceptance run and FCEUX's receipt for it |

## Commands

```bash
node QA/fixtures/al-exp-02/generate.cjs --check
```

```bash
node QA/fixtures/al-exp-02/generate.cjs --seed 9 --scenario confounded-guard --out /tmp/fixture
```

```bash
node QA/al-exp-02.cjs NES_Forge.html /tmp/al-exp-02.json /tmp/al-exp-02-artifacts
```

`AL_EXP_02_SEEDS=development` runs only the development fixtures.
