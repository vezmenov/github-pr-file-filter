const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../extension/test-files.js'), 'utf8'), context);
const api = context.GitHubPrFileFilter;
const plain = value => JSON.parse(JSON.stringify(value));
const config = changes => ({ ...plain(api.DEFAULT_SETTINGS), ...changes });

test('public API and preset metadata are frozen, serializable data', () => {
  assert.ok(Object.isFrozen(api));
  assert.ok(Object.isFrozen(api.PRESETS));
  assert.ok(Object.isFrozen(api.DEFAULT_SETTINGS));
  assert.ok(api.PRESETS.length >= 20);
  assert.equal(new Set(api.PRESETS.map(preset => preset.id)).size, api.PRESETS.length);
  for (const preset of api.PRESETS) {
    assert.ok(Object.isFrozen(preset));
    assert.equal(typeof preset.name, 'string');
    assert.equal(typeof preset.description, 'string');
    assert.ok(Array.isArray(preset.examples));
    assert.ok(preset.patterns.every(pattern => typeof pattern === 'string'));
    for (const file of preset.examples) assert.equal(api.isTestFile(file, config({ presets: [preset.id] })), true, `${preset.id}: ${file}`);
  }
  assert.deepEqual(plain(api.DEFAULT_SETTINGS.presets), plain(api.PRESETS.map(preset => preset.id)));
});

test('normalization supplies safe defaults and deep copies lists', () => {
  assert.deepEqual(plain(api.normalizeSettings(null)), plain(api.DEFAULT_SETTINGS));
  const input = { excludePatterns: ['  *.snap  ', '*.snap'], includePatterns: ['tests/keep.ts'], excludedExtensions: ['snap', '.d.ts', 'snap'] };
  const result = api.normalizeSettings(input);
  assert.deepEqual(plain(result.excludePatterns), ['*.snap']);
  assert.deepEqual(plain(result.excludedExtensions), ['.snap', '.d.ts']);
  input.includePatterns.push('*.js');
  result.excludePatterns.push('*.txt');
  assert.deepEqual(plain(api.DEFAULT_SETTINGS.excludePatterns), []);
  assert.deepEqual(plain(result.includePatterns), ['tests/keep.ts']);
});

test('explicit empty presets disable automatic classification', () => {
  const settings = api.normalizeSettings({ presets: [] });
  assert.deepEqual(plain(settings.presets), []);
  assert.equal(api.isTestFile('foo.spec.ts', settings), false);
  assert.equal(api.isTestFile('tests/helper.js', settings), false);
});

test('disabled extension shows files even with custom exclusions', () => {
  const match = api.createMatcher(config({ enabled: false, excludePatterns: ['**'], excludedExtensions: ['.ts'] }), true);
  assert.equal(match('tests/keep.spec.ts'), false);
});

test('always-show exceptions override presets, suffixes, and custom exclusions', () => {
  const match = api.createMatcher(config({ includePatterns: ['tests/keep.*', '**/important.d.ts'], excludePatterns: ['tests/**'], excludedExtensions: ['.d.ts'] }), true);
  assert.equal(match('tests/keep.spec.ts'), false);
  assert.equal(match('src/important.d.ts'), false);
  assert.equal(match('tests/hide.spec.ts'), true);
  assert.equal(match('src/generated.d.ts'), true);
});

test('custom exclusions still work when the test toggle is off', () => {
  const match = api.createMatcher(config({ excludePatterns: ['generated/**'], excludedExtensions: ['.snap'] }), false);
  assert.equal(match('generated/api.ts'), true);
  assert.equal(match('button.snap'), true);
  assert.equal(match('button.spec.ts'), false);
  assert.equal(match('tests/helper.ts'), false);
});

test('compound suffixes match whole suffixes, not directory names or backups', () => {
  const match = api.createMatcher(config({ excludedExtensions: ['.d.ts', '.min.js', 'snap'] }), false);
  for (const file of ['api.d.ts', 'nested/api.d.ts', 'assets/app.min.js', 'Button.snap']) assert.equal(match(file), true, file);
  for (const file of ['api.ts', 'api.d.ts.map', 'app.min.jsx', 'snap/file.js', 'api.snap.bak']) assert.equal(match(file), false, file);
});

test('selecting one preset leaves unrelated frameworks visible', () => {
  const match = api.createMatcher(config({ presets: ['go'] }), true);
  assert.equal(match('src/api_test.go'), true);
  assert.equal(match('src/button.spec.ts'), false);
  assert.equal(match('tests/fixture.json'), false);
});

const globCases = [
  ['*.css', ['root.css', 'src/root.css'], ['root.css.map', 'src.css/root.js']],
  ['src/*.js', ['src/a.js'], ['a.js', 'src/nested/a.js', 'other/src/a.js']],
  ['*/readme.md', ['src/readme.md'], ['readme.md', 'src/deep/readme.md']],
  ['**/*.js', ['a.js', 'src/a.js', 'src/deep/a.js'], ['a.jsx']],
  ['src/**/a?.js', ['src/a1.js', 'src/deep/a2.js'], ['src/a.js', 'src/a10.js', 'other/src/a1.js']],
  ['**/tests/**', ['tests/a.ts', 'src/tests/deep/a.ts'], ['src/testsupport/a.ts']],
  ['literal+(file).js', ['literal+(file).js', 'src/literal+(file).js'], ['literalfile.js']],
];
for (const [glob, hide, keep] of globCases) test(`glob ${glob} respects basename and path boundaries`, () => {
  const match = api.createMatcher(config({ presets: [], excludePatterns: [glob] }), false);
  for (const file of hide) assert.equal(match(file), true, file);
  for (const file of keep) assert.equal(match(file), false, file);
});

test('paths normalize Windows separators, leading dot, and bidi markers', () => {
  const match = api.createMatcher(config({ excludePatterns: ['src/**/secret.ts'], presets: [] }), false);
  assert.equal(match('./src\\deep\\secret.ts'), true);
  assert.equal(match('\u200esrc/deep/secret.ts\u200f'), true);
  assert.equal(match('src//deep/secret.ts'), true);
  for (const file of ['', null, undefined, {}, 42, 'tests/']) assert.equal(match(file), false);
});

test('case sensitivity controls presets, globs, and extensions', () => {
  const insensitive = api.createMatcher(config({ excludedExtensions: ['.SNAP'], excludePatterns: ['Custom/**'] }), true);
  const sensitive = api.createMatcher(config({ caseSensitive: true, excludedExtensions: ['.SNAP'], excludePatterns: ['Custom/**'] }), true);
  for (const file of ['BUTTON.TEST.TS', 'button.snap', 'custom/a.txt']) assert.equal(insensitive(file), true, file);
  for (const file of ['BUTTON.TEST.TS', 'button.snap', 'custom/a.txt']) assert.equal(sensitive(file), false, file);
  for (const file of ['button.test.ts', 'button.SNAP', 'Custom/a.txt']) assert.equal(sensitive(file), true, file);
});

test('compiled matcher is independent of later settings mutations', () => {
  const input = config({ presets: [], excludePatterns: ['*.snap'] });
  const match = api.createMatcher(input, false);
  input.excludePatterns[0] = '**';
  input.enabled = false;
  assert.equal(match('button.snap'), true);
  assert.equal(match('button.ts'), false);
});

test('default and partial valid settings validate without errors', () => {
  assert.deepEqual(plain(api.validateSettings(api.DEFAULT_SETTINGS)), []);
  assert.deepEqual(plain(api.validateSettings({})), []);
  assert.deepEqual(plain(api.validateSettings({ excludedExtensions: ['snap', '.d.ts'], language: 'ru' })), []);
});

const invalidSettings = [
  null, [], 'invalid', { enabled: 'false' }, { hideInTree: 1 }, { hideInDiff: null },
  { caseSensitive: 'yes' }, { language: 'de' }, { presets: ['unknown'] }, { presets: 'go' },
  { excludedExtensions: 'ts' }, { excludedExtensions: ['.'] }, { excludedExtensions: ['*.ts'] },
  { excludedExtensions: ['.foo/bar'] }, { excludedExtensions: ['.ts', 1] },
  { excludePatterns: '*.js' }, { includePatterns: [''] }, { excludePatterns: ['[ab].js'] },
  { excludePatterns: ['*.{js,ts}'] }, { includePatterns: ['!secret/**'] },
  { excludePatterns: ['src\\*.ts'] }, { excludePatterns: [42] }, { unknownOption: true },
];
for (const invalid of invalidSettings) test(`reject malformed settings ${JSON.stringify(invalid)}`, () => {
  const errors = api.validateSettings(invalid);
  assert.ok(errors.length > 0);
  assert.ok(errors.every(error => typeof error === 'string' && error.length > 0));
  assert.doesNotThrow(() => api.createMatcher(invalid, true)('ordinary.ts'));
});

test('validation and normalization enforce list and string limits', () => {
  for (const settings of [
    { excludePatterns: Array(201).fill('*.ts') },
    { includePatterns: Array(201).fill('*.ts') },
    { excludePatterns: ['a'.repeat(301)] },
    { excludedExtensions: Array(101).fill('.ts') },
    { excludedExtensions: ['x'.repeat(41)] },
  ]) assert.ok(api.validateSettings(settings).length > 0);
  const safe = api.normalizeSettings({ excludePatterns: ['[bad]', '!bad', '*.snap'], excludedExtensions: ['*', 'snap'], presets: ['go', 'unknown'] });
  assert.deepEqual(plain(safe.excludePatterns), ['*.snap']);
  assert.deepEqual(plain(safe.excludedExtensions), ['.snap']);
  assert.deepEqual(plain(safe.presets), ['go']);
});

test('repeated wildcard patterns do not block matching on long unrelated filenames', () => {
  const match = api.createMatcher(config({ presets: [], excludePatterns: ['*a'.repeat(100) + 'b'] }), false);
  assert.equal(match('a'.repeat(1000)), false);
});
