# Shared editor source

The active hosted editor is generated from `app/hosted-source-manifest.json` in
the repository root. Its 188 common inputs are the same files used by the native
editor, plus eleven hosted/RE extension modules. Rebuild with:

```sh
python3 app/tools/bundle.py
python3 tools/sync_main_entry.py
python3 app/tools/bundle.py --manifest hosted-source-manifest.json
```

Run from the repository root. Runtime launchers and the generated HTML remain
in this directory. There is no independently edited `forge-source/app` copy.
The original uploaded archive retains the v13-v16 HTML witnesses. Their hashes are recorded in Imported_History.json; retained regression suites now exercise the current generated editor.

Legacy browser fixtures target the current editor and protocol-13 health contract; explicit protocol-12 rejection is retained.

The supplied v17.1 source contributed a read-only emulator-frame trace hook,
verified edited-Zelda-II recognition, eleven extension modules, and the existing
host/client. Current Punch-Out idle, physical-CHR navigation, project capability,
build-control, Retro Workstation and source protection work is retained.
Hosting remains a localhost technical experiment, with provisional movement and
combat. A source-derived picture is not proof of original engine behavior.
