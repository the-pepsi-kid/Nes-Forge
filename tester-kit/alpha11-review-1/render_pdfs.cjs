// Optional authoring dependency: Playwright + a Chromium browser.
// CHROMIUM_EXECUTABLE may point to an already installed browser.
const { chromium } = require('playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'],
  });
  try {
    const page = await browser.newPage();
    for (const name of ['Tutorial', 'Manual', 'Reference/Operator_Reference']) {
      await page.goto(pathToFileURL(path.join(__dirname, name + '.html')).href);
      await page.emulateMedia({media: 'print'});
      await page.pdf({
        path: path.join(__dirname, name + '.pdf'),
        format: 'A4', preferCSSPageSize: true, printBackground: true,
        displayHeaderFooter: true, headerTemplate: '<span></span>',
        footerTemplate: '<div style="font-size:8px;color:#526578;width:100%;text-align:center">NES Forge alpha.11 · Kit RC3 &nbsp; | &nbsp; <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      });
      console.log(name + '.pdf');
    }
  } finally { await browser.close(); }
  execFileSync(process.env.PYTHON || 'python3', [path.join(__dirname, 'portable_pdf_links.py')], {stdio: 'inherit'});
})().catch(error => { console.error(error); process.exit(1); });
