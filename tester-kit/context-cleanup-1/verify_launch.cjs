/* Optional real-browser launch/layout check. No private ROM is required.
 * Usage: node verify_launch.cjs PATH_TO_EXTRACTED_KIT
 * Requires Playwright and Chromium. CHROMIUM_EXECUTABLE may select an installed
 * browser. Prints JSON only; keep redirected reports outside the kit manifest.
 * Exit 0: PASS, 1: FAIL, 2: BLOCKED because the browser prerequisite is missing.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {pathToFileURL} = require('node:url');

const report = {
  format: 'NESForgeKitLaunchReview', startedAt: new Date().toISOString(),
  status: 'pending', checks: [],
  scope: 'Actual kit launcher clicks, application ready screen and documentation layout in two headless viewports. Not a full author/build/save/reopen tutorial, native OS-dialog, physical mobile, listening, controller or hardware acceptance.'
};

function finish(status, error, code) {
  report.status = status;
  report.finishedAt = new Date().toISOString();
  report.passed = report.checks.filter(check => check.result === 'PASS').length;
  report.failed = status === 'FAIL' ? 1 : 0;
  if (error) report.error = String(error.message || error);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = code;
}

async function checkDocument(page, label, viewport) {
  await page.locator('h1').first().waitFor({state: 'visible'});
  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    missingImages: Array.from(document.images).filter(image => !image.complete || image.naturalWidth === 0).map(image => image.getAttribute('src'))
  }));
  assert(layout.width <= layout.viewport + 2, `${label}: horizontal page overflow`);
  assert.deepEqual(layout.missingImages, [], `${label}: missing image`);
  report.checks.push({label, viewport, result: 'PASS', layout});
}

async function main() {
  assert(process.argv[2], 'Provide the extracted kit directory');
  const root = path.resolve(process.argv[2]);
  const record = JSON.parse(fs.readFileSync(path.join(root, 'SOURCE_RECORD.json'), 'utf8'));
  const appPath = path.resolve(root, record.app.path);
  assert(appPath.startsWith(root + path.sep), 'Application path leaves the kit');
  report.appSha256 = crypto.createHash('sha256').update(fs.readFileSync(appPath)).digest('hex');
  assert.equal(report.appSha256, record.app.sha256, 'Application identity mismatch');
  let chromium;
  try { ({chromium} = require('playwright')); }
  catch (error) { finish('BLOCKED', new Error(`Playwright is unavailable: ${error.message}`), 2); return; }
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
  } catch (error) { finish('BLOCKED', new Error(`Chromium could not launch: ${error.message}`), 2); return; }
  report.browser = browser.version();
  try {
    for (const viewport of [{width: 1380, height: 900}, {width: 390, height: 844}]) {
      const context = await browser.newContext({viewport});
      context.setDefaultTimeout(30000);
      const pageErrors = [];
      context.on('page', page => page.on('pageerror', error => pageErrors.push(error.message)));
      try {
        const page = await context.newPage();
        await page.goto(pathToFileURL(path.join(root, 'START_HERE.html')).href);
        await checkDocument(page, 'Landing page', viewport);
        const [app] = await Promise.all([
          page.waitForEvent('popup'),
          page.getByRole('link', {name: 'Open NES Forge ↗', exact: true}).click()
        ]);
        await app.waitForURL(pathToFileURL(appPath).href);
        await app.getByText('New Project', {exact: true}).first().waitFor({state: 'visible'});
        report.checks.push({label: 'Actual application launcher', viewport, result: 'PASS', newProjectVisible: true});
        await app.close();
        for (const [target, label] of [
          ['Tutorial.html', 'Original first-game tutorial'],
          ['Guides/Recover_Edit_Build.html', 'Recover, edit and build guide'],
          ['Guides/Scene_Context.html', 'Scene resources guide']
        ]) {
          const [guide] = await Promise.all([
            page.waitForEvent('popup'),
            page.locator(`a[href="${target}"][target="_blank"]`).first().click()
          ]);
          await guide.waitForURL(pathToFileURL(path.join(root, target)).href);
          await checkDocument(guide, label, viewport);
          await guide.close();
        }
        assert.deepEqual(pageErrors, [], 'Application or documentation script errors');
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  finish('PASS', null, 0);
}

main().catch(error => finish('FAIL', error, 1));
