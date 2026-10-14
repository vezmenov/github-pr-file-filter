// Load the actual MV3 package in an isolated profile; GitHub responses are controlled fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {chromium} = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const extension = path.join(root, 'extension');
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'fukk-specs-chromium-'));
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', headless: true, viewport: {width: 1280, height: 800},
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    const html = await fs.readFile(path.join(root, 'tests/fixtures/github-pr.html'), 'utf8');
    await context.route('https://github.com/**', route => route.fulfill({contentType: 'text/html', body: html}));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('https://github.com/owner/repo/pull/1/changes');
    await page.getByRole('button', {name: 'Filter options'}).click();
    const toggle = page.locator('[data-fukk-specs-toggle]');
    await toggle.waitFor();
    assert.equal(await toggle.getAttribute('aria-checked'), 'false');
    await toggle.click();
    const test = page.locator('[id="src/app/billing.service.spec.ts"]');
    const prod = page.locator('[id="src/app/billing.service.ts"]');
    await test.waitFor({state: 'hidden'});
    assert.equal(await prod.isVisible(), true);
    await page.locator('#diff-test-wrapper').waitFor({state: 'hidden'});
    assert.equal(await page.locator('#diff-prod-wrapper').isVisible(), true);
    await prod.focus(); await prod.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'src/app/error.service.ts');
    const output = path.join(root, 'output/playwright'); await fs.mkdir(output, {recursive: true});
    await page.screenshot({path: path.join(output, 'chromium-extension.png')});
    await page.reload();
    await test.waitFor({state: 'hidden'}); // Real chrome.storage persists across reload.
    await page.locator('#diff-test-wrapper').waitFor({state: 'hidden'});
    await page.getByRole('button', {name: 'Filter options'}).click();
    assert.equal(await toggle.getAttribute('aria-checked'), 'true');
    const other = await context.newPage();
    await other.goto('https://github.com/owner/repo/pull/2/files');
    await other.locator('[id="src/app/billing.service.spec.ts"]').waitFor({state: 'hidden'});
    await other.getByRole('button', {name: 'Filter options'}).click();
    await other.locator('[data-fukk-specs-toggle]').click();
    await test.waitFor({state: 'visible'}); // Real storage.onChanged in the first tab.
    await page.locator('#diff-test-wrapper').waitFor({state: 'visible'});
    await other.close();
    await page.locator('#conversation').click();
    await toggle.waitFor({state: 'detached'}); // SPA exit without a DOM mutation.
    await page.locator('#changes').click();
    await toggle.waitFor();
    await toggle.click(); await test.waitFor({state: 'hidden'});
    // Options are loaded from the real extension origin. No chrome API mocks.
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const extensionId = new URL(worker.url()).host;
    const optionsPromise = context.waitForEvent('page');
    await page.locator('[data-fukk-specs-settings]').click();
    const options = await optionsPromise;
    options.on('pageerror', error => errors.push(error.message));
    await options.waitForURL(`chrome-extension://${extensionId}/options.html`);
    await options.locator('#hide-tests:checked').waitFor();
    await options.locator('#language').selectOption('en');
    await options.locator('#hide-tests').uncheck();
    await options.locator('#excluded-extensions').fill('.ts');
    await options.locator('#include-patterns').fill('**/billing.service.ts');
    await options.locator('#preview-path').fill('src/app/error.service.ts');
    assert.equal(await options.locator('#preview-result').getAttribute('data-hidden'), 'true');
    await options.locator('#preview-path').fill('src/app/billing.service.ts');
    assert.equal(await options.locator('#preview-result').getAttribute('data-hidden'), 'false');
    await options.locator('#settings-form button[type=submit]').click();
    await options.getByText('Settings saved.', {exact: true}).waitFor();
    await test.waitFor({state: 'hidden'});
    assert.equal(await prod.isVisible(), true);
    await page.locator('#diff-test-wrapper').waitFor({state: 'hidden'});
    assert.equal(await page.locator('#diff-prod-wrapper').isVisible(), true);
    const errorFile = page.locator('[id="src/app/error.service.ts"]');
    await errorFile.waitFor({state: 'hidden'});
    await options.locator('#hide-in-tree').uncheck();
    await options.locator('#settings-form button[type=submit]').click();
    await test.waitFor({state: 'visible'});
    await page.locator('#diff-test-wrapper').waitFor({state: 'hidden'});
    const popup = await context.newPage();
    popup.on('pageerror', error => errors.push(error.message));
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.locator('#enabled:checked').waitFor();
    await popup.locator('#enabled').uncheck();
    await page.locator('#diff-test-wrapper').waitFor({state: 'visible'});
    await popup.locator('#enabled').check();
    await page.locator('#diff-test-wrapper').waitFor({state: 'hidden'});
    // Malformed imports never overwrite storage; valid imports are drafts until saved.
    await options.locator('#import-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,hideTests:true,settings:{excludePatterns:['[bad]']}}))});
    await options.locator('#status[data-error="true"]').waitFor();
    assert.equal(await options.locator('#excluded-extensions').inputValue(), '.ts');
    const transfer = {version:1,hideTests:true,settings:{language:'en',enabled:true,presets:['javascript'],hideInTree:true,hideInDiff:true,excludedExtensions:[],excludePatterns:['**/generated/**'],includePatterns:[]}};
    await options.locator('#import-file').setInputFiles({name:'settings.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(transfer))});
    await options.locator('#excluded-extensions').waitFor();
    assert.equal(await options.locator('#excluded-extensions').inputValue(), '');
    assert.equal(await test.isVisible(), true); // Imported draft has not affected page.
    const downloadPromise = options.waitForEvent('download');
    await options.locator('#export-settings').click();
    const download = await downloadPromise;
    const exported = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
    assert.equal(exported.version, 1); assert.equal(exported.hideTests, true);
    assert.deepEqual(exported.settings.excludePatterns, transfer.settings.excludePatterns);
    await options.locator('#settings-form button[type=submit]').click();
    await test.waitFor({state: 'hidden'});
    await options.reload();
    await options.locator('#hide-tests:checked').waitFor();
    assert.equal(await options.locator('#exclude-patterns').inputValue(), '**/generated/**');
    // Restore release screenshot to default presets, with filtering enabled.
    await options.locator('#reset-settings').click();
    await options.locator('#language').selectOption('en');
    await options.locator('#hide-tests').check();
    await options.locator('#settings-form button[type=submit]').click();
    await test.waitFor({state: 'hidden'});
    await page.locator('[id="src/app/__tests__/helper.ts"]').waitFor({state: 'hidden'});
    await fs.mkdir(path.join(root, 'docs/assets'), {recursive: true});
    await page.screenshot({path: path.join(root, 'docs/assets/store-filter-1280x800.png')});
    await options.screenshot({path: path.join(root, 'docs/assets/store-settings-1280x800.png')});
    await options.locator('#rules-title').scrollIntoViewIfNeeded();
    await options.screenshot({path: path.join(root, 'docs/assets/store-rules-1280x800.png')});
    assert.deepEqual(errors, []);
    console.log('PASS: actual MV3, native menu, tree/diff, keyboard, persistence, cross-tab/SPA, options and popup, custom rules/exceptions, per-panel switch, import/export validation; controlled GitHub fixture.');
  } finally {
    await context?.close();
    await fs.rm(profile, {recursive: true, force: true});
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
