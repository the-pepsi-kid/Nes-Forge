/* Current extraction coverage. The JSON block is the single source for the
 * in-app views, downloaded ledger and the packaged compatibility ledger.
 * Native adapters remain responsible for edit/build permission. */
(()=>{
'use strict';
const catalog =
/* RECOVERY_COVERAGE_BEGIN */
{
  "format": "NESForgeRecoveryCoverage",
  "version": 1,
  "inputFiles": 32,
  "titleGroups": 25,
  "fullRecoveryComplete": false,
  "recordedFromCommit": "baf1cc760cdfc98859f21237883e00bf015d085d",
  "scope": "Revision-bound extraction and editing; includes local owner-provided Round 3 archive evidence, not full game support.",
  "verificationPolicy": {
    "audioRequiredForEveryProject": true,
    "sceneAloneCompletesVerification": false,
    "sourceMatching": "Exact original SHA-256. Unsupported derivatives require independent verification.",
    "statusMeaning": "Partial records describe only their declared domains. Observed Audio means measured register activity. Native writer availability is still checked by each installed adapter."
  },
  "projects": [
    {
      "name": "1943 (U).nes",
      "sha256": "2fd596ac4563b910a4d0a36d4a3658910fcfa822afd4f78bd62f73552e17ea00",
      "byteLength": 131088,
      "declaredMapper": 2,
      "prgBytes": 131072,
      "chrBytes": 0,
      "private": true,
      "title": "1943",
      "payloadSha256": "9f54aafa367247b99c344ba9a0c58ad8fa8aceeeae1c304b8fefc9985c3c118c",
      "legacyHeaderWarning": false,
      "role": "primary",
      "recoveryStatus": "unresolved",
      "fullRecovery": false,
      "integratedScope": "Preserved source and physical CHR inspection only; game resources and native edits unresolved.",
      "domains": {
        "areas": "unresolved",
        "graphics": "unresolved",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "unresolved",
        "objectsTextFlags": "unresolved",
        "relationships": "unresolved",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "pending-current-checkpoint",
        "driver": "unresolved"
      },
      "titleId": "1943",
      "gaps": [
        "Native scene reconstruction",
        "Game-specific animation, actors and collision",
        "Audio decoder and native writers"
      ],
      "nextWork": "Native scene reconstruction",
      "evidence": [
        "app/docs/projects/README.md"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Adventures of Lolo (U) [!].nes",
      "sha256": "914c676959612fc6738a297b6b799dff848e43de4e9bd3c9f3c6783efd059e01",
      "byteLength": 65552,
      "declaredMapper": 1,
      "prgBytes": 32768,
      "chrBytes": 32768,
      "private": true,
      "title": "Adventures of Lolo",
      "payloadSha256": "ed8545c01b4abd17d919ab2500d2946735b4aca90ad3b46787f74e35973fa552",
      "legacyHeaderWarning": false,
      "role": "primary",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "50 native room backgrounds, fixed-capacity terrain/heart substitution and verified original CPU/PPU comparisons. Audio: 10 music cues, 24 SFX, native audition and finite editable tracker excerpts.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "partial",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "partial",
        "nativeWriter": "partial",
        "execution": "partial"
      },
      "audioVerification": {
        "required": true,
        "status": "automated-passed-owner-listening-pending",
        "driver": "lolo-us-1",
        "musicCues": 10,
        "sfxCues": 24,
        "nativeAudioWriter": false,
        "evidence": "reviews/lolo-audio-1/Lolo_Audio_Verification.json",
        "defaultCueCheck": {
          "cueId": "music:0",
          "updates": 128,
          "soundingUpdates": 110
        }
      },
      "titleId": "adventures-of-lolo",
      "gaps": [
        "Moving actors and animation",
        "HUD, world travel and gameplay rules",
        "Native Audio writing"
      ],
      "nextWork": "Moving actors and animation",
      "evidence": [
        "reviews/lolo-recovery-1/HANDOFF.md",
        "reviews/lolo-audio-1/HANDOFF.md",
        "docs/recovery/rc2-results/all-rom-intake.json"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Battletoads (U).nes",
      "sha256": "677330f45a1249d24d003792a4674c93f836be57fd18b57125306efe82f3cda8",
      "byteLength": 262160,
      "declaredMapper": 7,
      "prgBytes": 262144,
      "chrBytes": 0,
      "private": true,
      "title": "Battletoads",
      "payloadSha256": "56d25e05dde2048c3a9b4e36ab5325091310ce2b65171615b5596fc542db66fa",
      "legacyHeaderWarning": false,
      "role": "primary",
      "recoveryStatus": "unresolved",
      "fullRecovery": false,
      "integratedScope": "Preserved source and physical CHR inspection only; game resources and native edits unresolved.",
      "domains": {
        "areas": "unresolved",
        "graphics": "unresolved",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "unresolved",
        "objectsTextFlags": "unresolved",
        "relationships": "unresolved",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "pending-current-checkpoint",
        "driver": "unresolved"
      },
      "titleId": "battletoads",
      "gaps": [
        "Native scene reconstruction",
        "Game-specific animation, actors and collision",
        "Audio decoder and native writers"
      ],
      "nextWork": "Native scene reconstruction",
      "evidence": [
        "app/docs/projects/README.md"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "title": "Castlevania",
      "titleId": "castlevania",
      "name": "Castlevania US PRG 0",
      "sha256": "55bcab0d9efc33a9d9efc90f2c3c4ab12f3221a44b1f357e6c6202a456399aa8",
      "role": "primary",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "byteLength": 131088,
      "integratedScope": "6 source-linked captured scenes, 9 editable metasprites and 6 animation records. Native audio includes 49 playable requests, 15 three-channel sequences and 4 controls. Forge can audition the original driver and import tracker excerpts. The earlier replay traced 649 APU writes to 12 original CPU instruction sites. The Stage 01 courtyard has 3 native background pages, 144 placements and 23 distinct 32px metatiles. Resources exposes 12 CHR upload lists with 26 source transfers. Both the pages and pattern tables open as editable project copies.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "partial",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "partial",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "partial",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "gaps": [
        "Remaining stage layouts, including the castle interior and transitions",
        "Collision, actors and full animation rules",
        "Song names, remaining gameplay triggers, full arrangements and native score writeback"
      ],
      "nextWork": "Recover the Stage 01 castle interior and validate its transition, graphics and placements against original scrolling.",
      "evidence": [
        "docs/recovery/castlevania-05/CHAT_HANDOFF.md",
        "docs/recovery/rc2-results/editor-workflows.json",
        "Recovery/Castlevania/AUDIO.md",
        "docs/recovery/rc2-results/castlevania-audio.json",
        "docs/recovery/rc2-results/all-rom-intake.json",
        "Recovery/Castlevania/GRAPHICS.md",
        "docs/recovery/rc2-results/castlevania-graphics.json"
      ],
      "evidenceScope": "Both US originals supplied the graphics, scrolling layout checks, cue comparisons and editable project round trips.",
      "audioVerification": {
        "required": true,
        "status": "automated-passed-owner-listening-pending",
        "driver": "source-decoded",
        "writerSites": 12,
        "apuWrites": 649,
        "nativeAudioWriter": false,
        "tableRecords": 93,
        "playableRequests": 49,
        "threeChannelSequences": 15,
        "controls": 4,
        "defaultCueCheck": {
          "cueId": "request:39",
          "updates": 128,
          "soundingUpdates": 112
        }
      },
      "graphicsVerification": {
        "courtyardPages": 3,
        "placements": 144,
        "distinctMetatiles": 23,
        "chrUploadGroups": 12,
        "transferRecords": 26,
        "nativeGraphicsWriter": false
      }
    },
    {
      "title": "Castlevania",
      "titleId": "castlevania",
      "name": "Castlevania US PRG 1",
      "sha256": "0bf466eb3819eee34e41de076b5c1bf16375d0de5ba64ede8ade6ed599accb53",
      "role": "alternate-revision",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "byteLength": 131088,
      "integratedScope": "6 source-linked captured scenes, 9 editable metasprites and 6 animation records. Native audio includes 49 playable requests, 15 three-channel sequences and 4 controls. Forge can audition the original driver and import tracker excerpts. The earlier replay traced 649 APU writes to 12 original CPU instruction sites. The Stage 01 courtyard has 3 native background pages, 144 placements and 23 distinct 32px metatiles. Resources exposes 12 CHR upload lists with 26 source transfers. Both the pages and pattern tables open as editable project copies.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "partial",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "partial",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "partial",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "gaps": [
        "Remaining stage layouts, including the castle interior and transitions",
        "Collision, actors and full animation rules",
        "Song names, remaining gameplay triggers, full arrangements and native score writeback"
      ],
      "nextWork": "Recover the Stage 01 castle interior and validate its transition, graphics and placements against original scrolling.",
      "evidence": [
        "docs/recovery/castlevania-05/CHAT_HANDOFF.md",
        "docs/recovery/rc2-results/editor-workflows.json",
        "Recovery/Castlevania/AUDIO.md",
        "docs/recovery/rc2-results/castlevania-audio.json",
        "docs/recovery/rc2-results/all-rom-intake.json",
        "Recovery/Castlevania/GRAPHICS.md",
        "docs/recovery/rc2-results/castlevania-graphics.json"
      ],
      "evidenceScope": "Both US originals supplied the graphics, scrolling layout checks, cue comparisons and editable project round trips.",
      "audioVerification": {
        "required": true,
        "status": "automated-passed-owner-listening-pending",
        "driver": "source-decoded",
        "writerSites": 12,
        "apuWrites": 649,
        "nativeAudioWriter": false,
        "tableRecords": 93,
        "playableRequests": 49,
        "threeChannelSequences": 15,
        "controls": 4,
        "defaultCueCheck": {
          "cueId": "request:39",
          "updates": 128,
          "soundingUpdates": 112
        }
      },
      "graphicsVerification": {
        "courtyardPages": 3,
        "placements": 144,
        "distinctMetatiles": 23,
        "chrUploadGroups": 12,
        "transferRecords": 26,
        "nativeGraphicsWriter": false
      }
    },
    {
      "title": "Castlevania II",
      "titleId": "castlevania-ii",
      "name": "Castlevania II · investigated US revision",
      "sha256": "f045d72683d3156555eccbb56090888f03a15e5b25e59db49dca7a87330472d3",
      "role": "primary",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "Native layout tables, raw tile categories and revision-bound Audio inspection/playback.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "partial",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "gaps": [
        "Conditional block substitution and collision",
        "Original graphic contexts and gameplay links",
        "Native resource writers"
      ],
      "nextWork": "Conditional block substitution and collision",
      "evidence": [
        "app/src/re/spatial-native.js",
        "docs/recovery/rc2-results/all-rom-intake.json"
      ],
      "evidenceScope": "Retained investigated-revision adapter and prior notes; see release results for current checks.",
      "audioVerification": {
        "required": true,
        "status": "default-cue-verified",
        "nativeAudioWriter": false,
        "defaultCueCheck": {
          "cueId": "57",
          "updates": 128,
          "soundingUpdates": 128
        }
      },
      "byteLength": 262160
    },
    {
      "name": "Contra (U).nes",
      "sha256": "26541a5550ee22deeb3d5484e4a96130219b58cff74d068fb1eb6567fa5e5519",
      "byteLength": 131088,
      "declaredMapper": 2,
      "prgBytes": 131072,
      "chrBytes": 0,
      "private": true,
      "title": "Contra",
      "payloadSha256": "d41e28b1a33b3b6768e7c39c9fdfb1fda4b49940542d14085911fabd399e1ca9",
      "legacyHeaderWarning": false,
      "role": "primary",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "144 source slots, 126 available initial-state resources, 18 unavailable states, bounded native block writer.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "unresolved",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "partial",
        "nativeWriter": "partial",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "pending-current-checkpoint",
        "driver": "unresolved"
      },
      "titleId": "contra",
      "gaps": [
        "18 unavailable graphics states",
        "Audio driver",
        "Actors, collision and stage rules"
      ],
      "nextWork": "18 unavailable graphics states",
      "evidence": [
        "app/src/re/native-prg-resources.js"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Double Dragon (U).nes",
      "sha256": "eaeef33de58b18f3dcfa283c48c1fba7b70b3e522c84dee000cc8c1110156982",
      "byteLength": 262160,
      "declaredMapper": 1,
      "prgBytes": 131072,
      "chrBytes": 131072,
      "private": true,
      "title": "Double Dragon",
      "payloadSha256": "8f2f9ba926280edd3652745e1d04a30ecce64089fbf3f022a35b4039a2dd7b66",
      "legacyHeaderWarning": false,
      "role": "primary",
      "recoveryStatus": "unresolved",
      "fullRecovery": false,
      "integratedScope": "Preserved source and physical CHR inspection only; game resources and native edits unresolved.",
      "domains": {
        "areas": "unresolved",
        "graphics": "unresolved",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "unresolved",
        "objectsTextFlags": "unresolved",
        "relationships": "unresolved",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "pending-current-checkpoint",
        "driver": "unresolved"
      },
      "titleId": "double-dragon",
      "gaps": [
        "Native scene reconstruction",
        "Game-specific animation, actors and collision",
        "Audio decoder and native writers"
      ],
      "nextWork": "Native scene reconstruction",
      "evidence": [
        "app/docs/projects/README.md"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Final Fantasy (U) [a1].nes",
      "sha256": "fafb45c017ebfcc1af8149c2a61001ea2b0b134c1cbf0139c10b0597ba46c47c",
      "byteLength": 262160,
      "declaredMapper": 1,
      "prgBytes": 262144,
      "chrBytes": 0,
      "private": true,
      "title": "Final Fantasy",
      "payloadSha256": "d02401ecab70bae5a38df6e2234e7aef208e9b2e32b780f8f473751e9d20c1a9",
      "legacyHeaderWarning": false,
      "role": "alternate-revision",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "61 standard maps, normal/room palette states, 2440 pages, bounded native block writer. Overworld projection remains unresolved.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "unresolved",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "partial",
        "nativeWriter": "partial",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "pending-current-checkpoint",
        "driver": "unresolved"
      },
      "titleId": "final-fantasy",
      "gaps": [
        "Overworld reconstruction",
        "Audio driver",
        "Actors, events and game systems"
      ],
      "nextWork": "Overworld reconstruction",
      "evidence": [
        "app/src/re/native-prg-resources.js"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Final Fantasy (U).nes",
      "sha256": "d360beeee19a69d1c92d02292167c57f2d3ca8405b79101fc8c2f39dea549667",
      "byteLength": 262160,
      "declaredMapper": 1,
      "prgBytes": 262144,
      "chrBytes": 0,
      "private": true,
      "title": "Final Fantasy",
      "payloadSha256": "fa456d852372173ea31b192459ba1a2026f779df67793327ba6e132476c1d034",
      "legacyHeaderWarning": false,
      "role": "primary",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "61 standard maps, normal/room palette states, 2440 pages, bounded native block writer. Overworld projection remains unresolved.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "unresolved",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "partial",
        "nativeWriter": "partial",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "pending-current-checkpoint",
        "driver": "unresolved"
      },
      "titleId": "final-fantasy",
      "gaps": [
        "Overworld reconstruction",
        "Audio driver",
        "Actors, events and game systems"
      ],
      "nextWork": "Overworld reconstruction",
      "evidence": [
        "app/src/re/native-prg-resources.js"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Gun Smoke (U).nes",
      "sha256": "4ad9629a2bacc158a7f50975869c7dfe533567ae399a5bdc5df2240286df259f",
      "byteLength": 131088,
      "declaredMapper": 2,
      "prgBytes": 131072,
      "chrBytes": 0,
      "private": true,
      "title": "Gun Smoke",
      "payloadSha256": "f39421a126f3b93caa37d6c3ed899840ddfd51b0587446ca459f72564aca1433",
      "legacyHeaderWarning": false,
      "role": "primary",
      "recoveryStatus": "unresolved",
      "fullRecovery": false,
      "integratedScope": "Preserved source and physical CHR inspection only; game resources and native edits unresolved.",
      "domains": {
        "areas": "unresolved",
        "graphics": "unresolved",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "unresolved",
        "objectsTextFlags": "unresolved",
        "relationships": "unresolved",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "pending-current-checkpoint",
        "driver": "unresolved"
      },
      "titleId": "gun-smoke",
      "gaps": [
        "Native scene reconstruction",
        "Game-specific animation, actors and collision",
        "Audio decoder and native writers"
      ],
      "nextWork": "Native scene reconstruction",
      "evidence": [
        "app/docs/projects/README.md"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Hudson's Adventure Island (U).nes",
      "sha256": "b5cb5eb40e5926403be364bd151ef98fa433a5aa82b24470e483f2fd90f48956",
      "byteLength": 65552,
      "declaredMapper": 3,
      "prgBytes": 32768,
      "chrBytes": 32768,
      "private": true,
      "title": "Hudson's Adventure Island",
      "payloadSha256": "53bfc94fce46a25188f84f102810406f686a7fb13fb5e4ae8f13760106acb969",
      "legacyHeaderWarning": false,
      "role": "primary",
      "recoveryStatus": "unresolved",
      "fullRecovery": false,
      "integratedScope": "Preserved source and physical CHR inspection only; game resources and native edits unresolved.",
      "domains": {
        "areas": "unresolved",
        "graphics": "unresolved",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "unresolved",
        "objectsTextFlags": "unresolved",
        "relationships": "unresolved",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "pending-current-checkpoint",
        "driver": "unresolved"
      },
      "titleId": "hudson-s-adventure-island",
      "gaps": [
        "Native scene reconstruction",
        "Game-specific animation, actors and collision",
        "Audio decoder and native writers"
      ],
      "nextWork": "Native scene reconstruction",
      "evidence": [
        "app/docs/projects/README.md"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Kid Niki - Radical Ninja (U) (PRG 0).nes",
      "sha256": "01eae135185618291dca0fc0b19861a38c8e2af7dfb0efba4642ead612f79aaf",
      "byteLength": 262160,
      "declaredMapper": 1,
      "prgBytes": 262144,
      "chrBytes": 0,
      "private": true,
      "title": "Kid Niki - Radical Ninja",
      "payloadSha256": "81e527e9c282f5078a3d08470ad3c032fea9a72f1559ee9d2702ea6b07fab45c",
      "legacyHeaderWarning": false,
      "role": "alternate-revision",
      "recoveryStatus": "unresolved",
      "fullRecovery": false,
      "integratedScope": "Preserved source and physical CHR inspection only; game resources and native edits unresolved.",
      "domains": {
        "areas": "unresolved",
        "graphics": "unresolved",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "unresolved",
        "objectsTextFlags": "unresolved",
        "relationships": "unresolved",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "pending-current-checkpoint",
        "driver": "unresolved"
      },
      "titleId": "kid-niki-radical-ninja",
      "gaps": [
        "Native scene reconstruction",
        "Game-specific animation, actors and collision",
        "Audio decoder and native writers"
      ],
      "nextWork": "Native scene reconstruction",
      "evidence": [
        "app/docs/projects/README.md"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Kid Niki - Radical Ninja (U) (PRG 1) [!].nes",
      "sha256": "327481ad7cbcd120ac4d139bfee9971498d0878101506e7ed25f840adc2752df",
      "byteLength": 262160,
      "declaredMapper": 1,
      "prgBytes": 262144,
      "chrBytes": 0,
      "private": true,
      "title": "Kid Niki - Radical Ninja",
      "payloadSha256": "81a77623adf819f10548052075555998c1ec1ef5f4dc4bf6ff6b6c3fa3541c1b",
      "legacyHeaderWarning": false,
      "role": "primary",
      "recoveryStatus": "unresolved",
      "fullRecovery": false,
      "integratedScope": "Preserved source and physical CHR inspection only; game resources and native edits unresolved.",
      "domains": {
        "areas": "unresolved",
        "graphics": "unresolved",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "unresolved",
        "objectsTextFlags": "unresolved",
        "relationships": "unresolved",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "pending-current-checkpoint",
        "driver": "unresolved"
      },
      "titleId": "kid-niki-radical-ninja",
      "gaps": [
        "Native scene reconstruction",
        "Game-specific animation, actors and collision",
        "Audio decoder and native writers"
      ],
      "nextWork": "Native scene reconstruction",
      "evidence": [
        "app/docs/projects/README.md"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Kirby's Adventure (U) (PRG 0).nes",
      "sha256": "102309c351308638bdbfa13e96cae55b8a95b30429b561b41c651807fb905789",
      "byteLength": 786448,
      "declaredMapper": 4,
      "prgBytes": 524288,
      "chrBytes": 262144,
      "private": true,
      "title": "Kirby's Adventure",
      "payloadSha256": "a6b81fec11c24a33fd763db5c28005e760a1614e70c1bb5ccde0bd4242431000",
      "legacyHeaderWarning": true,
      "role": "alternate-revision",
      "recoveryStatus": "unresolved",
      "fullRecovery": false,
      "integratedScope": "Preserved source and physical CHR inspection only; game resources and native edits unresolved.",
      "domains": {
        "areas": "unresolved",
        "graphics": "unresolved",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "unresolved",
        "objectsTextFlags": "unresolved",
        "relationships": "unresolved",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "pending-current-checkpoint",
        "driver": "unresolved"
      },
      "titleId": "kirby-s-adventure",
      "gaps": [
        "Native scene reconstruction",
        "Game-specific animation, actors and collision",
        "Audio decoder and native writers"
      ],
      "nextWork": "Native scene reconstruction",
      "evidence": [
        "app/docs/projects/README.md"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Kirby's Adventure (U) (PRG 1) [!].nes",
      "sha256": "34afcebaf04d57a42c2436fb95b933c7841e1621f1dc3be482380baef33ec3d8",
      "byteLength": 786448,
      "declaredMapper": 4,
      "prgBytes": 524288,
      "chrBytes": 262144,
      "private": true,
      "title": "Kirby's Adventure",
      "payloadSha256": "1250a80faf865aa5ee5585ad7639e5ef2b3fa541554effda5fad2cc5dc2acef5",
      "legacyHeaderWarning": false,
      "role": "primary",
      "recoveryStatus": "unresolved",
      "fullRecovery": false,
      "integratedScope": "Preserved source and physical CHR inspection only; game resources and native edits unresolved.",
      "domains": {
        "areas": "unresolved",
        "graphics": "unresolved",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "unresolved",
        "objectsTextFlags": "unresolved",
        "relationships": "unresolved",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "pending-current-checkpoint",
        "driver": "unresolved"
      },
      "titleId": "kirby-s-adventure",
      "gaps": [
        "Native scene reconstruction",
        "Game-specific animation, actors and collision",
        "Audio decoder and native writers"
      ],
      "nextWork": "Native scene reconstruction",
      "evidence": [
        "app/docs/projects/README.md"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Kung Fu (U) [a1].nes",
      "sha256": "9e8383b3bd99ccf9bc972c57d37599604e969aebab7a8f0c9428112fafb6b82d",
      "byteLength": 40976,
      "declaredMapper": 0,
      "prgBytes": 32768,
      "chrBytes": 8192,
      "private": true,
      "title": "Kung Fu",
      "payloadSha256": "b5f367b20609d0ce9ec641364415ef1e02642bca34afecadd8bf2e06cce39cc2",
      "legacyHeaderWarning": false,
      "role": "alternate-revision",
      "recoveryStatus": "unresolved",
      "fullRecovery": false,
      "integratedScope": "Preserved source and physical CHR inspection only; game resources and native edits unresolved.",
      "domains": {
        "areas": "unresolved",
        "graphics": "unresolved",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "unresolved",
        "objectsTextFlags": "unresolved",
        "relationships": "unresolved",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "pending-current-checkpoint",
        "driver": "unresolved"
      },
      "titleId": "kung-fu",
      "gaps": [
        "Native scene reconstruction",
        "Game-specific animation, actors and collision",
        "Audio decoder and native writers"
      ],
      "nextWork": "Native scene reconstruction",
      "evidence": [
        "app/docs/projects/README.md"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Kung Fu (U).nes",
      "sha256": "ba57badd19db565481c5d9d7f86bfa0a919725a9661144d69925f501c9a0f4a1",
      "byteLength": 40976,
      "declaredMapper": 0,
      "prgBytes": 32768,
      "chrBytes": 8192,
      "private": true,
      "title": "Kung Fu",
      "payloadSha256": "0ba5e69962f6576d3729aa967092a7e8c98d00213cd98026dee343bff67b4177",
      "legacyHeaderWarning": false,
      "role": "primary",
      "recoveryStatus": "unresolved",
      "fullRecovery": false,
      "integratedScope": "Preserved source and physical CHR inspection only; game resources and native edits unresolved.",
      "domains": {
        "areas": "unresolved",
        "graphics": "unresolved",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "unresolved",
        "objectsTextFlags": "unresolved",
        "relationships": "unresolved",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "pending-current-checkpoint",
        "driver": "unresolved"
      },
      "titleId": "kung-fu",
      "gaps": [
        "Native scene reconstruction",
        "Game-specific animation, actors and collision",
        "Audio decoder and native writers"
      ],
      "nextWork": "Native scene reconstruction",
      "evidence": [
        "app/docs/projects/README.md"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Mega Man (U).nes",
      "sha256": "1c8885892051d79db757746e2281f417cd5b156a86988b0010ad95d7bd4276c5",
      "byteLength": 131088,
      "declaredMapper": 66,
      "prgBytes": 131072,
      "chrBytes": 0,
      "private": true,
      "title": "Mega Man",
      "payloadSha256": "5314ad0c406161195b6bb100ee11304bab8af121bba85992be896d5cb26b109e",
      "legacyHeaderWarning": true,
      "role": "primary",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "167 native room records; 320 initial stage-state pointer slots, 282 materializable / 564 pages; native one-byte block substitutions, shared normal/Wily ownership, guarded lifecycle and source-byte preservation.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "unresolved",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "partial",
        "nativeWriter": "partial",
        "execution": "partial"
      },
      "playbackMapping": "Original DiskDude header declares mapper 66; source unchanged. Native loader research explicitly used UxROM mapping. Ordinary emulator playback is not certified.",
      "audioVerification": {
        "required": true,
        "status": "pending-current-checkpoint",
        "driver": "unresolved"
      },
      "titleId": "mega-man",
      "gaps": [
        "Audio driver",
        "Actors and dynamic graphics contexts",
        "Stage travel and gameplay rules"
      ],
      "nextWork": "Audio driver",
      "evidence": [
        "app/src/re/native-megaman-resources.js"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "title": "Mega Man 2",
      "titleId": "mega-man-2",
      "name": "Mega Man 2 · investigated US revision",
      "sha256": "49136b412ff61beac6e40d0bbcd8691a39a50cd2744fdcdde3401eed53d71edf",
      "role": "primary",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "Native screen slots, stage-dependent collision categories and revision-bound Audio inspection/playback.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "partial",
        "actors": "unresolved",
        "audio": "partial",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "gaps": [
        "Actor and moving-platform placement",
        "Stage transition graph and movement rules",
        "Native resource writers"
      ],
      "nextWork": "Actor and moving-platform placement",
      "evidence": [
        "app/src/re/spatial-native.js",
        "docs/recovery/rc2-results/all-rom-intake.json"
      ],
      "evidenceScope": "Retained investigated-revision adapter and prior notes; see release results for current checks.",
      "audioVerification": {
        "required": true,
        "status": "default-cue-verified",
        "nativeAudioWriter": false,
        "defaultCueCheck": {
          "cueId": "0",
          "updates": 128,
          "soundingUpdates": 119
        }
      },
      "byteLength": 262160
    },
    {
      "name": "Metroid (U).nes",
      "sha256": "c5eea06e1e1128b576bd789f1a4f63bb154d6d31579c2f319382fb77a72d34a6",
      "byteLength": 131088,
      "declaredMapper": 1,
      "prgBytes": 131072,
      "chrBytes": 0,
      "private": true,
      "title": "Metroid",
      "payloadSha256": "649db8035018f2512ccea70aca6606c3b3a6988cd9ed43953b38dc5103dec7bb",
      "legacyHeaderWarning": true,
      "role": "primary",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "193 source room slots / 191 physical room records across five areas; ordered native background projection, initial graphics/palettes and single-byte native structure replacement. Native Audio: 12 music cues, 24 SFX, 1 reset control; bounded native audition and editable score excerpts, without a native audio writer.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "partial",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "partial",
        "nativeWriter": "partial",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "automated-passed-owner-listening-pending",
        "driver": "metroid-us-1",
        "musicCues": 12,
        "sfxCues": 24,
        "nativeAudioWriter": false,
        "evidence": "reviews/lolo-audio-1/Retained_Metroid_Audio.json",
        "defaultCueCheck": {
          "cueId": "music:7",
          "updates": 128,
          "soundingUpdates": 128
        }
      },
      "titleId": "metroid",
      "gaps": [
        "Doors and world connections",
        "Actors, items and collision-rule editing",
        "Native Audio writing"
      ],
      "nextWork": "Doors and world connections",
      "evidence": [
        "reviews/native-resource-recovery-2/METROID_REVIEW.md",
        "reviews/native-resource-recovery-2/METROID_AUDIO.md",
        "docs/recovery/rc2-results/all-rom-intake.json"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Mike Tyson's Punch-Out!! (U) (PRG 0).nes",
      "sha256": "0435f6d9bcfeb474a592c3a950530a99c03a6f6cacff793dc88f822bb8cc6952",
      "byteLength": 262160,
      "declaredMapper": 9,
      "prgBytes": 131072,
      "chrBytes": 131072,
      "private": true,
      "title": "Mike Tyson's Punch-Out!!",
      "payloadSha256": "752f9d07450e6ec075b109f5be1b1933e8385ad687ceaf24f70a590767bb5a27",
      "legacyHeaderWarning": false,
      "role": "primary",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "Both US revisions: ring and audience layouts, latch-aware CHR and fight palettes; source-linked poses and bounded position editing; Glass Joe count/health recipes with save/reopen, native build/export/reimport; native Audio catalog and playback.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "partial",
        "collision": "unresolved",
        "actors": "partial",
        "audio": "partial",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "partial",
        "nativeWriter": "partial",
        "execution": "partial"
      },
      "audioVerification": {
        "required": true,
        "status": "automated-passed-owner-listening-pending",
        "driver": "punch-out-us-prg0",
        "musicRequests": 23,
        "proceduralEffects": 45,
        "dpcmRequests": 7,
        "startupPcmRoutines": 1,
        "emptySlots": 6,
        "controlCues": 2,
        "totalEntries": 84,
        "soundingSelections": 76,
        "nativeAudioWriter": false,
        "pcmTrackerEditing": false,
        "evidence": "docs/recovery/rc2-results/native-profiles.json",
        "startupEvidence": "reviews/punch-out-1/PCM_Verification.json",
        "defaultCueCheck": {
          "cueId": "music:12",
          "updates": 128,
          "soundingUpdates": 122
        }
      },
      "titleId": "mike-tyson-s-punch-out",
      "gaps": [
        "Complete opponent behavior and fight reconstruction",
        "Native animation sequence writing",
        "Native Audio writing"
      ],
      "nextWork": "Complete opponent behavior and fight reconstruction",
      "evidence": [
        "app/docs/projects/PUNCH_OUT.md",
        "docs/recovery/rc2-results/punch-out-browser-revisions.json",
        "docs/recovery/rc2-results/all-rom-intake.json"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Mike Tyson's Punch-Out!! (U) (PRG 1).nes",
      "sha256": "22ce21aa9c477d87e9cdc386b185f2166b18d438257640aa1d8e75ee9960e06e",
      "byteLength": 262160,
      "declaredMapper": 9,
      "prgBytes": 131072,
      "chrBytes": 131072,
      "private": true,
      "title": "Mike Tyson's Punch-Out!!",
      "payloadSha256": "2ebab487204c42b0d9cf19c37bdc395e396226ca3eaa664907bf7f8216b3c4d3",
      "legacyHeaderWarning": true,
      "role": "alternate-revision",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "Both US revisions: ring and audience layouts, latch-aware CHR and fight palettes; source-linked poses and bounded position editing; Glass Joe count/health recipes with save/reopen, native build/export/reimport; native Audio catalog and playback.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "partial",
        "collision": "unresolved",
        "actors": "partial",
        "audio": "partial",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "partial",
        "nativeWriter": "partial",
        "execution": "partial"
      },
      "audioVerification": {
        "required": true,
        "status": "automated-passed-owner-listening-pending",
        "driver": "punch-out-us-prg1",
        "musicRequests": 23,
        "proceduralEffects": 45,
        "dpcmRequests": 7,
        "startupPcmRoutines": 1,
        "emptySlots": 6,
        "controlCues": 2,
        "totalEntries": 84,
        "soundingSelections": 76,
        "nativeAudioWriter": false,
        "pcmTrackerEditing": false,
        "evidence": "docs/recovery/rc2-results/native-profiles.json",
        "startupEvidence": "reviews/punch-out-1/PCM_Verification.json",
        "defaultCueCheck": {
          "cueId": "music:12",
          "updates": 128,
          "soundingUpdates": 122
        }
      },
      "titleId": "mike-tyson-s-punch-out",
      "gaps": [
        "Complete opponent behavior and fight reconstruction",
        "Native animation sequence writing",
        "Native Audio writing"
      ],
      "nextWork": "Complete opponent behavior and fight reconstruction",
      "evidence": [
        "app/docs/projects/PUNCH_OUT.md",
        "docs/recovery/rc2-results/punch-out-browser-revisions.json",
        "docs/recovery/rc2-results/all-rom-intake.json"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "title": "Ninja Gaiden",
      "titleId": "ninja-gaiden",
      "name": "Ninja Gaiden · investigated US revision",
      "sha256": "07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e",
      "role": "primary",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "Native rooms and ground kinds, 13 player animation scripts, source-linked resource inspection and Audio catalog.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "partial",
        "collision": "partial",
        "actors": "unresolved",
        "audio": "partial",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "gaps": [
        "Actor placement and damage boxes",
        "Room transitions and complete behavior",
        "Native inverse writers for remaining resources"
      ],
      "nextWork": "Actor placement and damage boxes",
      "evidence": [
        "app/docs/projects/NINJA_GAIDEN.md",
        "docs/recovery/rc2-results/all-rom-intake.json"
      ],
      "evidenceScope": "Retained investigated-revision adapter and prior notes; see release results for current checks.",
      "audioVerification": {
        "required": true,
        "status": "default-cue-verified",
        "nativeAudioWriter": false,
        "defaultCueCheck": {
          "cueId": "42",
          "updates": 128,
          "soundingUpdates": 128
        }
      },
      "byteLength": 262160
    },
    {
      "name": "River City Ransom (U).nes",
      "sha256": "b95f8def04c0012604b7cc68cf4ed8f49b2dfe4beda6182051de4b2423bea7b1",
      "byteLength": 262160,
      "declaredMapper": 4,
      "prgBytes": 131072,
      "chrBytes": 131072,
      "private": true,
      "title": "River City Ransom",
      "payloadSha256": "54cdc8b6fab804339c44601663585c8e7a8b01ef35b49754eb13a767b57c7d07",
      "legacyHeaderWarning": false,
      "role": "primary",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "36 cropped native street segments in 13 locations, shared physical-tile editing and Audio catalog/playback/transcription. The 22 special/interior locations remain unavailable.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "partial",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "partial",
        "nativeWriter": "partial",
        "execution": "partial"
      },
      "audioVerification": {
        "required": true,
        "status": "automated-passed-owner-listening-pending",
        "driver": "river-city-us-1",
        "musicRequests": 19,
        "uniqueMusicHeaders": 18,
        "sfxCues": 43,
        "controlCues": 1,
        "nativeAudioWriter": false,
        "evidence": "reviews/river-city-1/Audio_Verification.json",
        "defaultCueCheck": {
          "cueId": "request:2",
          "updates": 128,
          "soundingUpdates": 110
        }
      },
      "titleId": "river-city-ransom",
      "gaps": [
        "22 special and interior locations",
        "HUD, actors and collision",
        "Native Audio writing"
      ],
      "nextWork": "22 special and interior locations",
      "evidence": [
        "reviews/river-city-1/HANDOFF.md",
        "docs/recovery/rc2-results/all-rom-intake.json"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Shadowgate (U).nes",
      "sha256": "f3eeeefb3a1359cf45ad8a5033525ae4be050b9fb9cbe2105e09637aad00a9be",
      "byteLength": 262160,
      "declaredMapper": 68,
      "prgBytes": 131072,
      "chrBytes": 131072,
      "private": true,
      "title": "Shadowgate",
      "payloadSha256": "fbc69cdaf7c1419906d8cf2a74ab70d11520b2f3877387b8fd70460b6e6dd542",
      "legacyHeaderWarning": true,
      "role": "primary",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "130 static picture-table slots with original background CHR, standard palettes, bounded native tile editing and save/reopen/rebuild. Audio: 14 music requests, 20 SFX and one unavailable request. Object/door overlays, alternate states and full gameplay remain unresolved.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "partial",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "partial",
        "nativeWriter": "partial",
        "execution": "partial"
      },
      "audioVerification": {
        "required": true,
        "status": "automated-passed-owner-listening-pending",
        "driver": "shadowgate-us-1",
        "musicRequests": 14,
        "uniqueMusicHeaders": 13,
        "sfxCues": 20,
        "unavailableRequests": 1,
        "nativeAudioWriter": false,
        "evidence": "reviews/shadowgate-1/Audio_Verification.json",
        "defaultCueCheck": {
          "cueId": "request:13",
          "updates": 128,
          "soundingUpdates": 128
        }
      },
      "executionMapper": 4,
      "legacyHeaderPreserved": true,
      "titleId": "shadowgate",
      "gaps": [
        "Object and door overlays",
        "Alternate picture states, text and puzzle logic",
        "Native Audio writing"
      ],
      "nextWork": "Object and door overlays",
      "evidence": [
        "reviews/shadowgate-1/HANDOFF.md",
        "docs/recovery/rc2-results/all-rom-intake.json"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "name": "Teenage Mutant Ninja Turtles (U).nes",
      "sha256": "9ff2693fdafb0c454d571b34bae6623a806db4a317ce2fcb2fea0f721bc04083",
      "byteLength": 262160,
      "declaredMapper": 1,
      "prgBytes": 131072,
      "chrBytes": 131072,
      "private": true,
      "title": "Teenage Mutant Ninja Turtles",
      "payloadSha256": "892468d05a1097769d14e0ed4822267760d85dbfc79d83a0235878109f839dd1",
      "legacyHeaderWarning": true,
      "role": "primary",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "20 Area 1 side-view layouts, initial background/palette and bounded native block writer.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "unresolved",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "partial",
        "nativeWriter": "partial",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "pending-current-checkpoint",
        "driver": "unresolved"
      },
      "titleId": "teenage-mutant-ninja-turtles",
      "gaps": [
        "Remaining areas",
        "Actor and collision rules",
        "Audio driver"
      ],
      "nextWork": "Remaining areas",
      "evidence": [
        "app/src/re/native-block-layout.js"
      ],
      "evidenceScope": "Recorded revision-specific extraction. Current intake checks are reported separately in the release results."
    },
    {
      "title": "Zelda II",
      "titleId": "zelda-ii",
      "name": "Zelda II · investigated US revision",
      "sha256": "ad8c0fbcf092bf84b48e69fd3964eea4ed91bfe62abc352943d537979782680c",
      "role": "primary",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "Four native overworld terrain maps, bounded terrain/location/scene writers, source resource and Audio catalogs.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "partial",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "partial",
        "nativeWriter": "partial",
        "execution": "unresolved"
      },
      "gaps": [
        "Side-view collision and native movement rules",
        "Full NPC, item, spell and enemy behavior",
        "Native Audio writing"
      ],
      "nextWork": "Side-view collision and native movement rules",
      "evidence": [
        "app/docs/projects/ZELDA_II.md",
        "docs/recovery/rc2-results/all-rom-intake.json"
      ],
      "evidenceScope": "Retained investigated-revision adapter and prior notes; see release results for current checks.",
      "audioVerification": {
        "required": true,
        "status": "default-cue-verified",
        "nativeAudioWriter": false,
        "defaultCueCheck": {
          "cueId": "title:$01",
          "updates": 128,
          "soundingUpdates": 110
        }
      },
      "byteLength": 262160
    },
    {
      "name": "Super Mario Bros 3 (U) (PRG 1).nes",
      "sha256": "4377a7f5e6eb50bdd2ac6f249bf1a7085500aca8eb41f38545c3a2731c51a579",
      "byteLength": 393232,
      "declaredMapper": 4,
      "prgBytes": 262144,
      "chrBytes": 131072,
      "private": true,
      "title": "Super Mario Bros. 3",
      "titleId": "super-mario-bros-3",
      "role": "primary",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "Mario 3 level records, game-generated screen tiles and object placements from owner-provided ZIP; original-engine writer not registered.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "partial",
        "audio": "unresolved",
        "objectsTextFlags": "partial",
        "relationships": "partial",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "not-independently-verified",
        "nativeAudioWriter": false
      },
      "gaps": [
        "Original engine logic and native writeback not verified",
        "Runtime sprite/AI/physics and screen-placement parity incomplete",
        "Full original audio timing and driver writer unresolved"
      ],
      "nextWork": "Independent original-ROM placement and object trace verification",
      "evidence": [
        "LOCAL_EXTRACTION_UPDATE_README.md"
      ],
      "evidenceScope": "Owner-supplied extraction ZIP inspected privately; source SHA-256 present in owner ROM census; exporter outcomes are not independent pixel/runtime parity.",
      "sourcePackage": "Super_Mario_Bros_3.zip"
    },
    {
      "name": "Super Mario Bros 2 (U) (PRG 1).nes",
      "sha256": "6ba64ff651ede7eea2f6142f681b5f03df496456523e3712f8cd5bbee8f2f2ae",
      "byteLength": 262160,
      "declaredMapper": 4,
      "prgBytes": 131072,
      "chrBytes": 131072,
      "private": true,
      "title": "Super Mario Bros. 2",
      "titleId": "super-mario-bros-2",
      "role": "primary",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "Mario 2 native area layouts and source object placements from owner-provided ZIP; import recovered room adaptation from ZIP.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "partial",
        "audio": "unresolved",
        "objectsTextFlags": "partial",
        "relationships": "partial",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "not-independently-verified",
        "nativeAudioWriter": false
      },
      "gaps": [
        "Original engine logic and native writeback not verified",
        "Runtime sprite/AI/physics and screen-placement parity incomplete",
        "Full original audio timing and driver writer unresolved"
      ],
      "nextWork": "Independent original-ROM placement and object trace verification",
      "evidence": [
        "LOCAL_EXTRACTION_UPDATE_README.md"
      ],
      "evidenceScope": "Owner-supplied extraction ZIP inspected privately; source SHA-256 present in owner ROM census; exporter outcomes are not independent pixel/runtime parity.",
      "sourcePackage": "Super_Mario_Bros_2.zip"
    },
    {
      "name": "Super Mario Bros - Duck Hunt (U).nes",
      "sha256": "23ec3f6bb68f8774070ce936869e7f62ac3490449f58e62d6ed33a0fb385d456",
      "byteLength": 81936,
      "declaredMapper": 66,
      "prgBytes": 65536,
      "chrBytes": 16384,
      "private": true,
      "title": "Super Mario Bros. / Duck Hunt",
      "titleId": "super-mario-bros",
      "role": "primary",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "Mario original area/level layouts and source object placements from owner-provided ZIP; open this exact extraction pack to edit room adaptations.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "partial",
        "audio": "unresolved",
        "objectsTextFlags": "partial",
        "relationships": "partial",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "not-independently-verified",
        "nativeAudioWriter": false
      },
      "gaps": [
        "Original engine logic and native writeback not verified",
        "Runtime sprite/AI/physics and screen-placement parity incomplete",
        "Full original audio timing and driver writer unresolved"
      ],
      "nextWork": "Independent original-ROM placement and object trace verification",
      "evidence": [
        "LOCAL_EXTRACTION_UPDATE_README.md"
      ],
      "evidenceScope": "Owner-supplied extraction ZIP inspected privately; source SHA-256 present in owner ROM census; exporter outcomes are not independent pixel/runtime parity.",
      "sourcePackage": "Super_Mario_Bros.zip"
    },
    {
      "name": "Mega Man 2 (U).nes",
      "sha256": "27b5a635df33ed57ed339dfc7fd62fc603b39c1d1603adb5cdc3562a0b0d555b",
      "byteLength": 262160,
      "declaredMapper": 1,
      "prgBytes": 262144,
      "chrBytes": 0,
      "private": true,
      "title": "Mega Man 2",
      "titleId": "mega-man-2",
      "role": "investigated-alternate-source",
      "recoveryStatus": "partial",
      "fullRecovery": false,
      "integratedScope": "Mega Man 2 stage/screen catalog and finite audio adaptations from owner-provided ZIP; native engine behavior/writeback not reconstructed.",
      "domains": {
        "areas": "partial",
        "graphics": "partial",
        "menus": "unresolved",
        "animation": "unresolved",
        "collision": "unresolved",
        "actors": "unresolved",
        "audio": "partial",
        "objectsTextFlags": "unresolved",
        "relationships": "partial",
        "lifecycle": "unresolved",
        "nativeWriter": "unresolved",
        "execution": "unresolved"
      },
      "audioVerification": {
        "required": true,
        "status": "not-independently-verified",
        "nativeAudioWriter": false
      },
      "gaps": [
        "Original engine logic and native writeback not verified",
        "Runtime sprite/AI/physics and screen-placement parity incomplete",
        "Full original audio timing and driver writer unresolved",
        "Original legacy header requires independent original-ROM identity checks before native writer"
      ],
      "nextWork": "Independent original-ROM placement and object trace verification",
      "evidence": [
        "LOCAL_EXTRACTION_UPDATE_README.md"
      ],
      "evidenceScope": "Owner-supplied extraction ZIP inspected privately; source SHA-256 present in owner ROM census; exporter outcomes are not independent pixel/runtime parity.",
      "sourcePackage": "Mega_Man_2_U.zip"
    }
  ],
  "reviewBuild": "Integrated Review 6 (2.0.0-alpha.12)",
  "localUpdate": "offline-extraction-round3-2026-11-18-no-github-changes"
}
/* RECOVERY_COVERAGE_END */
;
function freeze(value) {
 if(value && typeof value==='object') { Object.values(value).forEach(freeze); Object.freeze(value); }
 return value;
}
freeze(catalog);
function match(sha256) {
 if(!/^[a-f0-9]{64}$/i.test(sha256||'')) return null;
 return catalog.projects.find(record=>record.sha256===sha256.toLowerCase())||null;
}
function titles() {
 return [...new Map(catalog.projects.map(record=>[record.titleId,{id:record.titleId,title:record.title,status:record.recoveryStatus}])).values()];
}
Forge.services.RecoveryCoverage=Object.freeze({catalog,match,titles});
})();
