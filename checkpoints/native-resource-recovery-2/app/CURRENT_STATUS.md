# Current status

**2.0.0-alpha.11 · native-resource-recovery-2 · Metroid-focused review candidate**

Metroid now projects all 193 room slots / 191 physical rooms across five areas with initial graphics and native palette overlap. Existing object structure substitutions survive Undo/Redo, save/reopen, native rebuild and reimport. Original 6502 loaders verify initial and edited room backgrounds.

Metroid Audio now exposes 12 music cues and 24 effects, with bank-aware native playback, structural commands, five source volume envelopes and finite editable tracker excerpts. Its Audio library restores with the native project. Audio encoding back to the source ROM remains unsupported.

Read ../reviews/native-resource-recovery-2/METROID_REVIEW.md and its exact-hash verification reports. This checkpoint uses focused compatibility checks; the stopped pre-Metroid full run does not certify this build. Browser and full gameplay acceptance remain open.

Earlier Mega Man, Contra, Final Fantasy, partial TMNT, Ninja Gaiden and Zelda II work remains retained. No title has complete resource or behavior recovery. Ordinary schema 12 and portable-source schema 16 remain. The next title waits for owner review.
