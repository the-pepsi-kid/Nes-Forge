/* Documentation layout smoke check; does not certify every app workflow. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

(async () => {
  const out = path.join(__dirname, 'review/document-layout');
  fs.mkdirSync(out, {recursive: true});
  const browser = await chromium.launch({headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process']});
  const report = {scope: 'Current guide and retained reading-page viewport layout; not a full tutorial or device acceptance.', browser: browser.version(), checks: [], screenshots: []};
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const names = ['START_HERE', 'Guide', 'Tutorial', 'Manual', 'Reference/Operator_Reference',
      'Guides/Projects_and_Play', 'Guides/Art_and_Scenes', 'Guides/Gameplay_and_World', 'Guides/Audio', 'Guides/RE_and_Code'];
    for (const width of [1380, 390]) {
      await page.setViewportSize({width, height: width === 390 ? 844 : 1000});
      for (const name of names) {
        await page.goto(pathToFileURL(path.join(__dirname, name + '.html')).href);
        const metrics = await page.evaluate(() => ({width: innerWidth, content: document.documentElement.scrollWidth,
          headings: document.querySelectorAll('main h1,main h2,main h3').length,
          tables: document.querySelectorAll('main table').length,
          wraps: document.querySelectorAll('main .table-wrap').length}));
        assert.ok(metrics.headings > 0, name + ': missing guide body');
        assert.ok(metrics.content <= width + 1, name + ': viewport overflow at ' + width);
        assert.equal(metrics.tables, metrics.wraps, name + ': tables need local scrolling');
        report.checks.push({page: name + '.html', viewport: width, ...metrics, result: 'PASS'});
        if (['START_HERE', 'Guide', 'Guides/Audio'].includes(name)) {
          const file = name.replaceAll('/', '-') + '-' + width + '.png';
          await page.screenshot({path: path.join(out, file)});
          report.screenshots.push(file);
        }
      }
    }
    assert.deepEqual(errors, []);
    report.pageErrors = errors;
    report.result = 'PASS';
    fs.writeFileSync(path.join(out, 'Report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({result: report.result, checks: report.checks.length, browser: report.browser, screenshots: report.screenshots}));
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
