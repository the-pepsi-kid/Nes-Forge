# Recipe compatibility note — alpha.11

An independent UI-harness check found that alpha.10 mashup recipes cannot be opened directly through alpha.11's Seeded mashup UI. Ordinary project opening changes the `foundation` release metadata, so capturing the original base produces a different canonical SHA-256. Recipe loading then refuses with an exact-source error. The current project remains unchanged and no Undo entry is added. This refusal is a known compatibility limitation, not a cross-version replay pass.

Keep recipes with their matching application edition and original source projects. For an alpha.10 recipe, open the included `baseline/NES_Forge_2.0.0-alpha.10_Seeded_Mashup.html`, load its original base and donors, replay and apply the recipe, then Save Project As. Open that resulting editable project in alpha.11. An already-saved mashup result can be opened directly in alpha.11. The workaround was verified through the actual application handlers; the original result matched its recipe hash, and its alpha.11 project rebuilt without errors. Real-browser acceptance remains pending.

Movement recipes created and reopened in alpha.11 are covered by the current gate. Explicit cross-release recipe migration remains future work and should be addressed before another release bump. The preserved raw version-1 algorithm can still reproduce old recipes from untouched raw sources; that does not establish cross-version UI recipe loading.

This note is post-run evidence. It changes no tested application code, existing input or gate result. The source-history archive retains the independent reproduction script and receipt in `reviews/movement-rules-1/`.
