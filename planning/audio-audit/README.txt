NES Forge audio alignment probes — October 2, 2026

Run from the portable Git repository root:
  node planning/audio-audit/reproduce-audio-findings.cjs app

Optional measured report output (choose a new path to preserve this evidence):
  node planning/audio-audit/reproduce-audio-findings.cjs app /tmp/audio-findings-rerun.json

With no app argument, the script resolves ../../app relative to itself.
Requires Node.js and the repository's existing harness; no npm install.

audio-findings.json records the exact source/HTML identity and script hash.
Both findings reproduced against HTML e868b5b13a565049df35972c677498c5764f87ecdead9b732989f37dcec61e5d:
 - 63-event control: generated reader returns after 13 CPU instructions.
 - 64-event case: still looping after the 20,000-instruction budget at row 64.
 - Authored A4: generated pulse and triangle both receive timer 253;
   internal APU periods imply 440.40 Hz pulse and 220.20 Hz triangle.

Exit 0 means these defects reproduced, NOT that the candidate passed review.
Exit 2 means at least one finding did not reproduce; inspect the output.
Errors fail normally. This is a focused probe, not a broad suite or speaker test.
The compiled routines are entered with controlled state. No production file,
fixture or candidate report is rewritten. Outputs are planning evidence only.
