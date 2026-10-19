# Audio discovery example

Open Discovery_NROM.nes in AUDIO > ROM Audio Library. This original small 6502 program is deliberately absent from the installed native catalogs. The Audio Discovery panel scans its physical PRG code. Choose Record startup (resets game), then inspect Writer evidence and Call / table / RAM leads. The NMI handler changes pulse pitch from a ROM table using a RAM counter.

This example demonstrates unknown-driver investigation, not an automatic native score decoder. No editable song import is authorized by its signature or recorded writes. Source is tests/audio-discovery-fixture.cjs; reproduce with node tools/build_audio_discovery_example.cjs. Provenance.json pins the source and output.
