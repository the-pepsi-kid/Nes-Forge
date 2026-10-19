/* Click the real launcher in a GitHub source checkout and an extracted kit.
 * Requires Playwright and Chromium. This is launch QA, not app acceptance.
 * Usage: node verify_launch.cjs PATH_TO_EXTRACTED_KIT
 * Optional: CHROMIUM_EXECUTABLE=/path/to/chromium
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

async function main() {
  assert(process.argv[2], 'Provide the extracted kit folder');
  const cases = [
    {layout: 'GitHub source checkout', root: __dirname,
      app: path.join(__dirname, 'NES_Forge.html')},
    {layout: 'Standalone tester kit', root: path.resolve(process.argv[2]),
      app: path.resolve(process.argv[2], 'NES_Forge.html')},
  ];
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'],
  });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const checks = [];
    for (const item of cases) {
      const errors = [];
      const capture = popup => popup.on('pageerror', error => errors.push(error.message));
      context.on('page', capture);
      await page.goto(pathToFileURL(path.join(item.root, 'START_HERE.html')).href);
      const [app] = await Promise.all([
        page.waitForEvent('popup'),
        page.getByRole('link', {name: 'Open NES Forge ↗', exact: true}).click(),
      ]);
      await app.waitForURL(pathToFileURL(item.app).href);
      await app.getByText('New Project', {exact: true}).first().waitFor({state: 'visible'});
      assert.deepEqual(errors, [], `${item.layout}: application script errors`);
      checks.push({layout: item.layout, button: 'Open NES Forge',
        title: await app.title(), expectedDestination: true, newProjectVisible: true,
        scriptErrors: errors, result: 'PASS'});
      context.off('page', capture);
      await app.close();
    }
    console.log(JSON.stringify({browser: browser.version(), checks,
      scope: 'Actual launcher click and application ready screen in both layouts; not a full tutorial or Windows/device acceptance.'}, null, 2));
  } finally {
    await browser.close();
  }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
