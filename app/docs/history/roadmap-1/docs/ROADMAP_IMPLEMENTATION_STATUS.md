# Implementation status — roadmap-1

This is a progress checkpoint under full roadmap implementation authorization. It is not a declaration that the complete roadmap is done. Items are reviewed in dependency order, beginning with Audio; independently prepared later work is not a substitute for missing earlier acceptance. The comprehensive roadmap remains the requirements source.

| Roadmap area | Status in this candidate | Remaining work / evidence |
|---|---|---|
| Existing World, Audio Runtime and Gameplay Core baselines | Preserved by mandatory regression gate | Device listening/performance/controller review; historical documented limits remain |
| 1.9.1 gameplay breadth | Unimplemented | Projectiles/groups, moving platforms, checkpoints, NPC dialogue, traversal, physical Door semantics and typed animation events |
| 1.9.2 canonical visual behavior graph | Implemented for the existing profile | Browser/mobile usability acceptance; future operation profiles remain separate |
| 1.9.3 supported Audio workflow | MIDI/MusicXML export/reimport and built-in examples implemented | Audible comparison/external application compatibility, A6, full manual review; no DPCM/expansion/FLP/OCR claim |
| 2.0.1 linker and bank allocation | Unimplemented | Mapper-aware PRG/CHR allocation, relocations, dependency packing and streaming |
| 2.0.2 Debug/Edit versus Release outputs | Partial | External source workspace exports its actual expanded ASM/maps; generated-game assembly export and separated ROM metadata profiles remain |
| 2.0.3 runtime profiles | Existing limited profiles preserved | Additional scroll/mixed/mapper profiles and their executable contracts |
| 2.0.4 raster contracts | Existing captured evidence only | Canonical represented/compilable raster events and profile support |
| 2.0.5 incremental build/LiveLink | Unimplemented | Dependency invalidation, stable resource address mappings and safe replacement |
| General arbitrary-ROM inspection | Existing bounded independent intake retained | Execution still depends on emulator/mapper support; raw analysis does not imply semantic recovery |
| Alpha A0 / 2.2 recovery contracts and methods | Physical-source method registry and provenance implemented | More drivers/domains, signatures, decoders, encoders and independent validation |
| Alpha A3 native Audio recovery | Unimplemented beyond existing Native Room control | Independent permitted music/SFX driver inputs, format identification, native recovery and audible edit/rebuild proof |
| Alpha A1 graphics recovery | Generic physical CHR ROM import/edit/export implemented | Independent-engine end-to-end evidence; source palette/bank-use/compressed/CHR-RAM semantics remain unknown |
| Alpha A2 scenes/maps/collision | Existing Native Room control only | Reusable native formats, independent source/behavior proof; no screenshot-derived semantic guesses |
| 2.1/2.3 runtime investigation | Existing traces plus named full checkpoints and scripted input implemented | Breakpoints/read watches, broader code/data/xrefs/structures/profiling and verified game-specific actions |
| 2.4 live experiments and patches | Reversible internal/cartridge RAM experiments implemented | Value freezes, bank-aware ROM shadow patches and safe asset/LiveLink replacement |
| 2.5 technique discovery | Ongoing research target | Cannot be declared complete for every unknown engine or program |
| ASM migration | Bounded preserved multi-file Forge-6502/NROM workspace implemented | Named external dialects, real migration corpus, generated-runtime hooks/clobbers/budgets, mapper/linker integration |
| NESmaker/Lua/other languages | Unimplemented | Named versions/profiles, user-owned sources and explicit host/cartridge boundaries |
| Public repository/reviewer readiness | Source, tests and history packaged | License choice, repository setup/publication and reviewer/device acceptance |
| 3.0 input/deterministic sessions | Existing single-controller profile plus scripted RE replay | Multi-player/peripheral profiles and deterministic hosted session protocol |
| 3.1 netplay | Unimplemented | Networking, rollback/reconnect/spectators/lobbies for declared ROM profiles |
| 3.2 authority/transport contracts | Separate local server draft | Forge/cartridge intent bridge and integrated session acceptance |
| 3.3 persistent hosted worlds | Separate durable bounded state draft | Real chunk/world projection into NES budgets and integrated multi-client play |
| 3.4 economy | Separate ordinary-item/vendor/crafting reference subset | Full inventory/currency/resources/equipment/abilities/structures/XP domains and game bridge |
| 3.4.1 earned ordinary items | Local authoritative claims, items and issuer acceptance draft | Integrated game evidence, richer cross-world opt-in and lifecycle rules |
| 3.4.2 wallet/chain adapter | Unimplemented | SolGames audit, explicit testnet adapter, authentication/ownership/transfer separation, ROM effect bindings and lifecycle |
| 3.4.3 mintable loot | Unimplemented | Reserve/idempotent mint/settlement/failure and ownership lifecycle |
| 3.4.4 real-value combat loss | Unimplemented | Consent/custody model, authoritative combat, durable settlement and independent prelaunch review |
| 3.5 competitive matches | Unimplemented | Match/team/zone/spectate/rank/history profile |
| 3.6 social/voice | Unimplemented | Friends/parties/text/voice and moderation controls outside NES determinism |
| 3.7 collaborative editing | Unimplemented | Presence/concurrent edits/conflicts/versioned shared builds |
| 4.0 portable roles | Local Node host draft only | Developer/client/server role packaging and measured resource capacity on target hardware |
| 4.1 device deployment | Local server offline backup/restore draft | Build/deploy/update/logs/rollback plus actual Wi-Fi/cellular behavior |
| 4.2 Meshtastic/LoRa | Unimplemented | Hardware adapter, asynchronous message contract and measured network constraints |
| 4.3 physical deck | Unimplemented | BOM, assembly, power/thermal/battery/suspend/loss tests and field session |

The new source APIs contain actual working implementations, not placeholder completion flags. The explicit unimplemented rows remain work to do. A pure code change cannot establish phone audio latency, hardware controller compatibility, independent engine recovery, cryptocurrency settlement correctness in a deployed environment, or a physical deck build.

Next dependency: finish supported Audio acceptance and identify a verified independent native music/SFX input, then implement and validate that driver through the shared recovery contracts. Existing Pepsi and Bridge Room evidence cannot be stretched into a claim of native music recovery from arbitrary ROMs.
