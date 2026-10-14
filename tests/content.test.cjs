const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const html = `<!doctype html><html><body>
<aside id="sidebar"><div id="filter-bar"><input placeholder="Filter files…"><button aria-label="Filter options" aria-controls="filter-menu">Filter</button></div>
<ul role="tree" aria-label="File Tree">
  <li id="src" role="treeitem" aria-expanded="true" aria-label="src" tabindex="0"><div>src</div><ul role="group">
    <li id="production" role="treeitem" tabindex="-1"><a href="#diff-prod">billing.service.ts</a></li>
    <li id="test" role="treeitem" tabindex="-1"><a href="#diff-test">billing.service.spec.ts</a></li>
    <li id="test-dir" role="treeitem" aria-expanded="true" aria-label="__tests__" tabindex="-1"><div>__tests__</div><ul role="group">
      <li id="helper" role="treeitem" tabindex="-1"><a href="#diff-helper">helper.ts</a></li>
    </ul></li>
    <li id="collapsed" role="treeitem" aria-expanded="false" aria-label="lazy" tabindex="-1"><div>lazy</div></li>
  </ul></li>
</ul></aside>
<div id="filter-menu" role="menu"><h3>File extensions</h3><button role="menuitemcheckbox" aria-checked="true">.ts</button><button role="menuitemcheckbox" aria-checked="true">Viewed files</button></div>
<section data-testid="progressive-diffs-list">
  <div id="diff-test-wrapper" style="content-visibility:auto;contain-intrinsic-size:auto 420px">
    <div id="diff-test" role="region" aria-labelledby="heading-test">
      <header><h3 id="heading-test"><a href="#diff-test">‎src/billing.service.spec.ts‎</a></h3><button aria-pressed="false">Viewed</button></header>
      <div class="diff-body"><textarea>draft comment</textarea><p>test diff</p></div>
    </div>
  </div>
  <div id="diff-prod-wrapper"><div id="diff-prod" role="region" aria-labelledby="heading-prod"><h3 id="heading-prod"><a href="#diff-prod">src/billing.service.ts</a></h3><p>production diff</p></div></div>
</section>
</body></html>`;

async function setup(t, {markup = html, enabled = false, settings = {language: 'ru'}, url = 'https://github.com/owner/repo/pull/1/changes'} = {}) {
  const dom = new JSDOM(markup, {url, runScripts: 'outside-only', pretendToBeVisual: true});
  t.after(() => dom.window.close());
  const state = {hideTests: enabled, settings};
  const listeners = new Set();
  dom.window.chrome = {storage: {local: {
    async get() { return {...state}; },
    async set(values) { const changes = Object.fromEntries(Object.entries(values).map(([key, newValue]) => [key, {oldValue: state[key], newValue}])); Object.assign(state, values); listeners.forEach(fn => fn(changes, 'local')); },
  }, onChanged: {addListener(fn) { listeners.add(fn); }}}};
  for (const name of ['test-files.js', 'i18n.js', 'content.js']) {
    const file = path.join(__dirname, '../extension', name);
    if (fs.existsSync(file)) dom.window.eval(fs.readFileSync(file, 'utf8'));
  }
  await settle(dom.window);
  return {dom, document: dom.window.document, state, listeners};
}
async function settle(win) { await new Promise(resolve => win.setTimeout(resolve, 50)); }
function hidden(doc, id) { return doc.getElementById(id).hasAttribute('data-github-pr-file-filter-hidden'); }
function toggle(doc) { const button = doc.querySelector('[data-github-pr-file-filter-toggle]'); assert.ok(button, 'toggle must be inserted'); button.click(); }

test('native menu toggle hides tests in tree and whole diff cards, preserving production and collapsed directories', async t => {
  const {document, dom, state} = await setup(t);
  assert.equal(hidden(document, 'test'), false);
  toggle(document); await settle(dom.window);
  assert.equal(hidden(document, 'test'), true);
  assert.equal(hidden(document, 'helper'), true);
  assert.equal(hidden(document, 'test-dir'), true);
  assert.equal(hidden(document, 'diff-test-wrapper'), true);
  for (const id of ['src', 'production', 'collapsed', 'diff-prod-wrapper']) assert.equal(hidden(document, id), false, id);
  assert.equal(state.hideTests, true);
  assert.equal(document.querySelector('[data-github-pr-file-filter-toggle]').getAttribute('aria-checked'), 'true');
});

test('disabling restores only extension visibility and preserves native filters', async t => {
  const {document, dom} = await setup(t, {enabled: true});
  document.getElementById('production').hidden = true;
  toggle(document); await settle(dom.window);
  assert.equal(hidden(document, 'test'), false);
  assert.equal(hidden(document, 'test-dir'), false);
  assert.equal(hidden(document, 'diff-test-wrapper'), false);
  assert.equal(document.getElementById('production').hidden, true);
});

test('saved preference applies before menu opens and to replacement React trees', async t => {
  const {document, dom} = await setup(t, {enabled: true});
  assert.equal(hidden(document, 'test'), true);
  const row = document.createElement('li'); row.id = 'new-test'; row.setAttribute('role', 'treeitem'); row.innerHTML = '<a href="#diff-new">new.test.tsx</a>';
  document.querySelector('[role="tree"]').append(row);
  await settle(dom.window);
  assert.equal(hidden(document, 'new-test'), true);
  document.getElementById('filter-menu').innerHTML = '<h3>File extensions</h3><button role="menuitemcheckbox">.ts</button>';
  await settle(dom.window);
  assert.equal(document.querySelectorAll('[data-github-pr-file-filter-toggle]').length, 1);
});

test('full path attributes and labelled folders detect tests with ordinary basenames', async t => {
  const {document, dom} = await setup(t, {enabled: true});
  const tree = document.querySelector('[role="tree"]');
  tree.insertAdjacentHTML('beforeend', '<li id="full-path" role="treeitem" data-path="tests/fixture.json"><a>fixture.json</a></li><li id="legacy-path" role="treeitem" data-tree-entry-type="file"><span data-filterable-item-text hidden>spec/helpers.rb</span><a>helpers.rb</a></li>');
  await settle(dom.window);
  assert.equal(hidden(document, 'full-path'), true); assert.equal(hidden(document, 'legacy-path'), true);
});

test('SPA entry from conversation initializes and leaving files removes extension state', async t => {
  const {document, dom} = await setup(t, {enabled: true, url: 'https://github.com/owner/repo/pull/1'});
  assert.equal(document.querySelector('[data-github-pr-file-filter-toggle]'), null);
  dom.window.history.pushState({}, '', '/owner/repo/pull/1/changes');
  document.dispatchEvent(new dom.window.Event('turbo:load')); await settle(dom.window);
  assert.equal(hidden(document, 'test'), true);
  dom.window.history.pushState({}, '', '/owner/repo/pull/1');
  document.dispatchEvent(new dom.window.Event('turbo:load')); await settle(dom.window);
  assert.equal(hidden(document, 'test'), false);
  assert.equal(hidden(document, 'diff-test-wrapper'), false);
  assert.equal(document.querySelector('[data-github-pr-file-filter-toggle]'), null);
});

test('preference updates from another tab update both menu and tree', async t => {
  const {document, dom, listeners} = await setup(t);
  listeners.forEach(fn => fn({hideTests: {newValue: true}}, 'local')); await settle(dom.window);
  assert.equal(hidden(document, 'test'), true);
});

test('tree keyboard movement skips hidden files and preserves focus when filtering an active test', async t => {
  const {document, dom, listeners} = await setup(t);
  document.getElementById('test').focus();
  listeners.forEach(fn => fn({hideTests: {newValue: true}}, 'local')); await settle(dom.window);
  assert.equal(document.activeElement.closest('[data-github-pr-file-filter-hidden]'), null);
  document.getElementById('production').focus();
  document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true, cancelable: true}));
  assert.equal(document.activeElement.id, 'collapsed');
});

test('toggle supports Space and menu arrow movement', async t => {
  const {document, dom} = await setup(t);
  const button = document.querySelector('[data-github-pr-file-filter-toggle]'); assert.ok(button);
  button.focus(); button.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: ' ', bubbles: true, cancelable: true}));
  await settle(dom.window); assert.equal(hidden(document, 'test'), true);
  button.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true, cancelable: true}));
  assert.equal(document.activeElement.getAttribute('data-github-pr-file-filter-enable'), '');
});

test('missing menu provides fallback control beside the file search', async t => {
  const {document} = await setup(t, {markup: html.replace(/<div id="filter-menu"[\s\S]*?<\/div>/, '')});
  assert.ok(document.querySelector('#filter-bar [data-github-pr-file-filter-fallback]'));
});

test('all test files show empty state that can restore them', async t => {
  const {document, dom} = await setup(t, {enabled: true, markup: html.replace(/<li id="production"[^]*?<\/li>/, '').replace(/<li id="collapsed"[^]*?<\/li>/, '')});
  assert.ok(document.querySelector('[data-github-pr-file-filter-empty]'));
  document.querySelector('[data-github-pr-file-filter-empty] button').click(); await settle(dom.window);
  assert.equal(hidden(document, 'test'), false);
  assert.equal(document.querySelector('[data-github-pr-file-filter-empty]'), null);
});

test('legacy details-menu gets a single toggle outside GitHub form', async t => {
  const legacy = html.replace(/<div id="filter-menu"[\s\S]*?<\/div>/, '<details open><summary data-target="file-filter.summary">File filter</summary><details-menu role="menu"><div class="SelectMenu-modal"><h3>Filter by extension</h3><form class="js-file-filter-form"><label role="menuitem"><input type="checkbox" checked>.ts</label></form></div></details-menu></details>');
  const {document, dom} = await setup(t, {markup: legacy, url: 'https://github.com/owner/repo/pull/1/files'});
  const button = document.querySelector('details-menu [data-github-pr-file-filter-toggle]'); assert.ok(button); assert.equal(button.closest('form'), null);
  button.click(); await settle(dom.window); assert.equal(hidden(document, 'test'), true);
});

test('own DOM changes settle without a mutation loop', async t => {
  const {document, dom} = await setup(t, {enabled: true});
  let mutations = 0;
  const observer = new dom.window.MutationObserver(records => { mutations += records.length; });
  observer.observe(document.body, {subtree: true, childList: true, attributes: true});
  document.querySelector('[role="tree"]').setAttribute('data-rerender', '1');
  await settle(dom.window); const after = mutations; await settle(dom.window);
  assert.equal(mutations, after); observer.disconnect();
});

test('observed GitHub React GroupHeading span without aria-controls identifies native filter menu', async t => {
  const observed = html.replace(' aria-controls="filter-menu"', '').replace('<h3>File extensions</h3>', '<div data-component="GroupHeadingWrap" role="presentation" aria-hidden="true"><span>File extensions</span></div><ul aria-label="File extensions" role="group"><li role="menuitemcheckbox" tabindex="0">.html</li></ul>');
  const {document} = await setup(t, {markup: observed});
  assert.ok(document.querySelector('#filter-menu [data-github-pr-file-filter-toggle]'));
  assert.equal(document.querySelector('[data-github-pr-file-filter-fallback]'), null);
});

test('tree labelled by heading and menu under sibling header are supported', async t => {
  const alternate = html.replace('role="tree" aria-label="File Tree"', 'role="tree" aria-labelledby="file-heading"').replace('<ul role="tree"', '<h2 id="file-heading">File Tree</h2><ul role="tree"').replace(' aria-controls="filter-menu"', '').replace('<div id="filter-menu" role="menu"><h3>File extensions</h3>', '<section><header><h3>File extensions</h3></header><div id="filter-menu" role="menu">').replace('</div>\n<section data-testid', '</div></section>\n<section data-testid');
  const {document} = await setup(t, {markup: alternate, enabled: true});
  assert.equal(hidden(document, 'test'), true);
  assert.ok(document.querySelector('#filter-menu [data-github-pr-file-filter-toggle]'));
});

test('filtering an active test leaves a single Tab stop after restoring files', async t => {
  const {document, dom, listeners} = await setup(t);
  document.getElementById('src').setAttribute('tabindex', '-1');
  const row = document.getElementById('test'); row.setAttribute('tabindex', '0'); row.focus();
  listeners.forEach(fn => fn({hideTests: {newValue: true}}, 'local')); await settle(dom.window);
  listeners.forEach(fn => fn({hideTests: {newValue: false}}, 'local')); await settle(dom.window);
  assert.equal(document.querySelectorAll('[role="tree"] [tabindex="0"]').length, 1);
});

test('ArrowRight from expanded folder focuses first visible child', async t => {
  const reordered = html.replace('<li id="production" role="treeitem" tabindex="-1"><a href="#diff-prod">billing.service.ts</a></li>', '').replace('<li id="test-dir"', '<li id="production" role="treeitem" tabindex="-1"><a href="#diff-prod">billing.service.ts</a></li><li id="test-dir"');
  const {document, dom} = await setup(t, {enabled: true, markup: reordered});
  document.getElementById('src').focus();
  document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}));
  assert.equal(document.activeElement.id, 'production');
});

test('native filter and test filter together hide an empty expanded directory', async t => {
  const {document, dom} = await setup(t, {enabled: true});
  document.getElementById('production').hidden = true;
  document.getElementById('collapsed').remove();
  await settle(dom.window);
  assert.equal(hidden(document, 'src'), true);
  toggle(document); await settle(dom.window);
  assert.equal(hidden(document, 'src'), false);
  assert.equal(document.getElementById('production').hidden, true);
});

test('hiding the roving Tab stop while focus is in menu keeps a visible tree Tab stop', async t => {
  const {document, dom} = await setup(t);
  document.getElementById('src').setAttribute('tabindex', '-1');
  document.getElementById('test').setAttribute('tabindex', '0');
  const button = document.querySelector('[data-github-pr-file-filter-toggle]'); button.focus(); button.click();
  await settle(dom.window);
  assert.equal(document.activeElement, button);
  assert.equal(document.getElementById('test').getAttribute('tabindex'), '-1');
  assert.equal(document.querySelectorAll('[role="tree"] [tabindex="0"]').length, 1);
});

test('collapsed test diff with no body hides the outer card and its estimated height', async t => {
  const collapsed = html.replace(/<div class="diff-body">[^]*?<\/div>/, '');
  const {document} = await setup(t, {enabled: true, markup: collapsed});
  assert.equal(hidden(document, 'diff-test-wrapper'), true);
  assert.equal(hidden(document, 'diff-test'), false); // Whole wrapper owns the visibility mark.
  assert.equal(hidden(document, 'diff-prod-wrapper'), false);
  assert.equal(document.querySelector('[data-testid="progressive-diffs-list"]').hasAttribute('data-github-pr-file-filter-hidden'), false);
});

test('late React diff insertions and changed paths are filtered', async t => {
  const {document, dom} = await setup(t, {enabled: true});
  const list = document.querySelector('[data-testid="progressive-diffs-list"]');
  list.insertAdjacentHTML('beforeend', '<div id="late-card"><div id="diff-late" role="region" aria-labelledby="late-heading"><h3 id="late-heading"><a href="#diff-late">src/late.test.tsx</a></h3></div></div>');
  await settle(dom.window);
  assert.equal(hidden(document, 'late-card'), true);
  document.querySelector('#late-heading a').textContent = 'src/late.tsx';
  await settle(dom.window);
  assert.equal(hidden(document, 'late-card'), false);
});

test('legacy file wrappers hide tests and restore only extension state', async t => {
  const legacy = html + '<div id="legacy-diff-test" class="file" data-path="tests/helper.json" hidden style="opacity:0.8"><header>helper.json</header><p>comment</p></div><div id="legacy-diff-prod" class="file" data-path="src/helper.json"><p>production</p></div>';
  const {document, dom} = await setup(t, {enabled: true, markup: legacy, url: 'https://github.com/owner/repo/pull/1/files'});
  assert.equal(hidden(document, 'legacy-diff-test'), true);
  assert.equal(hidden(document, 'legacy-diff-prod'), false);
  toggle(document); await settle(dom.window);
  const block = document.getElementById('legacy-diff-test');
  assert.equal(hidden(document, 'legacy-diff-test'), false);
  assert.equal(block.hidden, true); assert.equal(block.style.opacity, '0.8'); assert.equal(block.querySelector('p').textContent, 'comment');
});

test('diff filter works without file tree and moves focus out of a hidden comment without deleting its draft', async t => {
  const withoutTree = html.replace(/<ul role="tree"[^]*?<\/ul><\/aside>/, '</aside>');
  const {document, dom, listeners} = await setup(t, {markup: withoutTree});
  const draft = document.querySelector('textarea'); draft.focus();
  listeners.forEach(fn => fn({hideTests: {newValue: true}}, 'local')); await settle(dom.window);
  assert.equal(hidden(document, 'diff-test-wrapper'), true);
  assert.equal(document.activeElement.closest('[data-github-pr-file-filter-hidden]'), null);
  assert.equal(draft.value, 'draft comment');
  assert.equal(document.querySelector('#diff-test button').getAttribute('aria-pressed'), 'false');
});

test('region without progressive wrapper and removed region restore correctly', async t => {
  const {document, dom} = await setup(t, {enabled: true, markup: html+'<div role="region" id="diff-alone" aria-labelledby="alone-heading"><h3 id="alone-heading">test_api.py</h3></div>'});
  assert.equal(hidden(document, 'diff-alone'), true);
  document.getElementById('diff-test').remove();
  await settle(dom.window);
  assert.equal(hidden(document, 'diff-test-wrapper'), false);
});

test('hidden sidebar has a safe focus fallback when another tab hides the active diff', async t => {
  const {document, dom, listeners} = await setup(t, {markup: html.replace('<aside id="sidebar">', '<aside id="sidebar" hidden>').replace('<div id="filter-menu" role="menu">', '<div id="filter-menu" role="menu" hidden>')});
  const draft = document.querySelector('textarea'); draft.focus();
  listeners.forEach(fn => fn({hideTests: {newValue: true}}, 'local')); await settle(dom.window);
  assert.equal(hidden(document, 'diff-test-wrapper'), true);
  assert.equal(document.activeElement.closest('[data-github-pr-file-filter-hidden]'), null);
  assert.equal(draft.value, 'draft comment');
});

test('custom file extensions hide production files in both panels even with automatic tests off', async t => {
  const {document} = await setup(t, {settings: {excludedExtensions: ['.ts']}});
  for (const id of ['production', 'test', 'diff-prod-wrapper', 'diff-test-wrapper']) assert.equal(hidden(document, id), true, id);
  assert.equal(document.querySelector('[data-github-pr-file-filter-toggle]').getAttribute('aria-checked'), 'false');
});

test('always-show paths override presets and custom exclusions in both panels', async t => {
  const {document} = await setup(t, {enabled: true, settings: {excludedExtensions: ['.ts'], includePatterns: ['**/billing.service.spec.ts']}});
  assert.equal(hidden(document, 'test'), false);
  assert.equal(hidden(document, 'diff-test-wrapper'), false);
  assert.equal(hidden(document, 'production'), true);
});

test('settings changes across tabs apply independently to tree and diff and master disable restores all', async t => {
  const {document, dom, listeners} = await setup(t, {enabled: true, settings: {hideInTree: false}});
  assert.equal(hidden(document, 'test'), false);
  assert.equal(hidden(document, 'diff-test-wrapper'), true);
  listeners.forEach(fn => fn({settings: {newValue: {hideInTree: true, hideInDiff: false}}}, 'local')); await settle(dom.window);
  assert.equal(hidden(document, 'test'), true);
  assert.equal(hidden(document, 'diff-test-wrapper'), false);
  document.querySelector('[data-github-pr-file-filter-enable]').click(); await settle(dom.window);
  assert.equal(hidden(document, 'test'), false);
  assert.equal(hidden(document, 'helper'), false);
  assert.equal(hidden(document, 'diff-test-wrapper'), false);
});

test('custom exclusions retain visible keyboard navigation and empty state can disable the whole filter', async t => {
  const {document, dom} = await setup(t, {settings: {excludePatterns: ['**/*.ts']}, markup: html.replace(/<li id="collapsed"[^]*?<\/li>/, '')});
  assert.ok(document.querySelector('[data-github-pr-file-filter-empty]'));
  document.querySelector('[data-github-pr-file-filter-empty] button').click(); await settle(dom.window);
  assert.equal(hidden(document, 'production'), false);
  assert.equal(hidden(document, 'diff-prod-wrapper'), false);
});
