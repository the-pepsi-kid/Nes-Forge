# CAD-PORT-01 observation reports

Reports written by `tools/cad-port/observe.cjs` on the local cartridges the verification ledger
(`app/src/re/cad-port-revisions.js`, generated from these by `tools/cad-port/ledger.cjs`) records. Each holds the
cartridge's name and SHA-256, the input script's hash, the structural state of every translated definition, and per
engine (NES Forge's emulator, FCEUX 2.6.5): the screens observed, the first frame, where the background graphics came
from (CHR ROM offsets, or how many tiles were found verbatim in PRG), the 16 background colour numbers, and how much of
what the game drew the translated blocks explain. They contain no cartridge bytes and no captured graphics.

To reproduce (with the cartridge and FCEUX + Xvfb installed):

```bash
node tools/cad-port/observe.cjs --cartridge "Ninja Gaiden (U).nes" --game ninja_gaiden --engines forge,fceux --out ninja_gaiden.json
```

```bash
node tools/cad-port/ledger.cjs QA/fixtures/cad-port-01/observations/*.json
```
