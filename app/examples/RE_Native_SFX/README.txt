NES Forge 2.0.0-alpha.11 — Native SFX examples

Open a .nesforge.json with normal Open Project, then Build & Run. Press B/attack to trigger its recovered effect through an explicitly authored Scout animation binding.
HonkeyPong_SFX_0 and HonkeyPong_SFX_1 use the independently authored native effects. HonkeyPong_SFX_0_Edited raises the ordinary tracker notes one semitone. All are editable schema-12 projects; paired .nes files are generated Forge World ROMs.
These separate projects deliberately use tempo150/speed1 and disabled music. SFX import itself preserves music, tempo/speed, runtime settings and animation bindings. It requires the current project already have compatible150/1 timing.
Original effects0/1 each occupy one pulse channel for12audibleframes. The native final mixed frame is included; terminal row12 ends the canonical effect. Source timers happen to match existing canonical notes for these originals; edited inputs may need disclosed nearest-pitch adaptation.
Native mixing/arbitration and pulse phase are not recreated. Original effect2 uses multiple channels and remains refused. Forge retains its existing one-effect channel takeover/resume behavior.

Use the native Audio panel to Analyze current ROM, Find SFX, Preview, review/acknowledge differences and confirm import. No native game trigger is imported. Existing authoring tools can bind the imported SFX later.
The original input, full upstream notices, pinned source/build and original-driver evidence remain in examples/RE_Native_Audio. Evidence JSON records conversion and source identity; it is not a project backup.
Logical original/generated CPU/APU comparisons are in tests/native-sfx-apu.cjs. Listen in Forge and an independent emulator; automated results do not establish speaker, browser or hardware acceptance.

Regenerate with node tools/build_native_sfx_examples.cjs. Manifest.json identifies actual source, HTML, project and ROM bytes.
