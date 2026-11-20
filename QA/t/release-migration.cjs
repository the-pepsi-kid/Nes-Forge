'use strict';
// Release migration: a recipe recorded against a project saved by the previous release must replay against the
// same project saved by the current release (only the "foundation" field differs), and nothing else may slip
// through. Version-independent: it always checks the current release against the one before it in
// RecipeIdentity's reviewed list, so a version bump without a reviewed migration fails here.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const {loadForge} = require('./u/harness.cjs');
const root = path.resolve(__dirname, '../..'), editor = path.resolve(process.argv[2] || path.join(root, 'NES_Forge.html')), output = process.argv[3];
const report = {editorSha256: crypto.createHash('sha256').update(fs.readFileSync(editor)).digest('hex'), checks: []};
const h = loadForge(editor);
if (!h.context.crypto || !h.context.crypto.subtle) h.context.crypto = crypto.webcrypto;
const example = JSON.parse(fs.readFileSync(path.join(root, 'Examples/TwoStages.nesforge.json'), 'utf8'));
const checks = [];
const check = (name, fn) => checks.push([name, fn]);
const current = h.run('Forge.release.version'), list = JSON.parse(JSON.stringify(h.run('Forge.services.RecipeIdentity.supportedFoundations')));
const previous = list[list.indexOf(current) - 1];

check('The current release is in the reviewed migration list after a previous release', () => {
  assert.ok(list.includes(current), current + ' is not in RecipeIdentity.supportedFoundations ' + JSON.stringify(list));
  assert.ok(previous, 'no previous release before ' + current);
  assert.equal(JSON.parse(h.run('JSON.stringify(Forge.services.ProjectStore.capture())')).foundation === undefined, false);
});
async function recipeFor(project) {
  h.context.__p = JSON.stringify(project);
  return JSON.parse(JSON.stringify(await h.run(`(async()=>{const M=Forge.services.MovementRules;const src=M.createSource(__p,{name:'release-test'});
    const r=M.preview(src,{seed:'release-migration',preset:'high-jump',intensity:1});return {recipe:r.recipe,effective:r.effective,sha:src.sha256};})()`, 300000)));
}
async function replayOn(project, recipe) {
  h.context.__p = JSON.stringify(project); h.context.__r = recipe;
  return JSON.parse(JSON.stringify(await h.run(`(async()=>{try{const M=Forge.services.MovementRules;const src=M.createSource(__p,{name:'release-test'});
    const r=await Forge.services.RecipeIdentity.replayMovement(src,__r);return {ok:true,migration:r.migration||null,foundation:r.project.foundation,sha:src.sha256};}catch(e){return {ok:false,error:e.message};}})()`, 300000)));
}
check('A previous-release recipe replays on the current-release project (foundation-only migration)', async () => {
  const before = {...structuredClone(example), foundation: previous}, after = {...structuredClone(example), foundation: current};
  const rec = await recipeFor(before); assert.ok(rec.effective, 'the test recipe must change something');
  const r = await replayOn(after, rec.recipe);
  assert.ok(r.ok, r.error); assert.ok(r.migration, 'expected a recorded migration'); assert.equal(r.migration.field, 'foundation'); assert.equal(r.foundation, current);
  assert.notEqual(r.sha, rec.sha);
});
check('Any other difference is still refused', async () => {
  const before = {...structuredClone(example), foundation: previous}, other = {...structuredClone(example), foundation: current, projectName: 'Changed by test'};
  const rec = await recipeFor(before), r = await replayOn(other, rec.recipe);
  assert.equal(r.ok, false, 'a renamed project must not replay'); assert.match(r.error, /differ|stale|refused/i);
});

(async () => {
  for (const [name, fn] of checks) { try { await fn(); report.checks.push({name, passed: true}); } catch (e) { report.checks.push({name, passed: false, error: String(e.message).slice(0, 500)}); } }
  report.current = current; report.previous = previous; report.passed = report.checks.every(c => c.passed);
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.error ? ': ' + c.error : ''));
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
