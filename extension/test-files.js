(() => {
  'use strict';

  // These are file naming conventions, not source-code or framework detection.
  // Source files containing inline tests remain visible unless a path rule matches.
  const scriptExtensions = ['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'mts', 'cts'];
  const scriptPatterns = markers => scriptExtensions.flatMap(extension =>
    markers.map(marker => `${marker}.${extension}`));

  const PRESETS = [
    { id: 'common', name: 'Common test directories',
      description: 'Files under test, tests, spec, specs, __tests__, __specs__, __snapshots__, or e2e directories, plus Cucumber feature files.',
      examples: ['tests/fixture.json', 'packages/ui/__tests__/helper.ts', 'features/login.feature'],
      patterns: ['**/test/**', '**/tests/**', '**/spec/**', '**/specs/**', '**/__tests__/**', '**/__specs__/**', '**/__snapshots__/**', '**/e2e/**', '*.feature'] },
    { id: 'javascript', name: 'JavaScript / TypeScript',
      description: 'Jest, Vitest, Jasmine, Mocha, AVA, Bun, Deno, and Node test filename conventions.',
      examples: ['button.test.tsx', 'api.spec.mjs', 'main_test.ts', 'test.cjs'],
      patterns: [...scriptPatterns(['*.test', '*.spec', '*_test', '*_spec', 'test', 'spec']), 'test-*.js'] },
    { id: 'browser', name: 'Browser / E2E',
      description: 'Playwright and Cypress .spec, .test, .cy, and .e2e files, plus Cypress and E2E directories.',
      examples: ['login.cy.ts', 'login.e2e.js', 'cypress/support/commands.ts'],
      patterns: [...scriptPatterns(['*.cy', '*.e2e', '*.spec', '*.test']), '**/cypress/**', '**/e2e/**'] },
    { id: 'python', name: 'Python',
      description: 'pytest and unittest test_*.py and *_test.py naming conventions.',
      examples: ['test_api.py', 'src/api_test.py'], patterns: ['test_*.py', '*_test.py'] },
    { id: 'go', name: 'Go', description: 'Go testing and testify *_test.go files.',
      examples: ['server_test.go'], patterns: ['*_test.go'] },
    { id: 'ruby', name: 'Ruby', description: 'RSpec, Minitest, and Test::Unit filenames.',
      examples: ['user_spec.rb', 'user_test.rb', 'test_user.rb'], patterns: ['*_spec.rb', '*_test.rb', 'test_*.rb'] },
    { id: 'jvm', name: 'JVM / Android',
      description: 'JUnit, TestNG, Kotest, ScalaTest, and Spock test source layouts. Production src/main files stay visible.',
      examples: ['src/test/java/UserTest.java', 'src/androidTest/kotlin/ScreenTest.kt', 'src/integrationTest/groovy/UserSpec.groovy'],
      patterns: ['**/src/test/**', '**/src/androidTest/**', '**/src/integrationTest/**', '**/src/functionalTest/**', '**/src/testFixtures/**'] },
    { id: 'dotnet', name: '.NET', description: 'xUnit, NUnit, and MSTest Test/Tests filenames and .Tests projects.',
      examples: ['UserTests.cs', 'UserTest.fs', 'Api.Tests/Fixture.cs'],
      patterns: ['*Test.cs', '*Tests.cs', '*Test.fs', '*Tests.fs', '*Test.vb', '*Tests.vb', '**/*.Tests/**', '**/*Tests/**'] },
    { id: 'php', name: 'PHP', description: 'PHPUnit, Pest, and PHP .phpt test files.',
      examples: ['UserTest.php', 'parser.phpt'], patterns: ['*Test.php', '*Tests.php', '*_test.php', '*.phpt'] },
    { id: 'rust', name: 'Rust', description: 'Cargo integration-test directories and separate *_test.rs files; inline #[test] is not inferred.',
      examples: ['tests/integration.rs', 'parser_test.rs'], patterns: ['**/tests/**/*.rs', '*_test.rs'] },
    { id: 'dart', name: 'Dart / Flutter', description: 'package:test, Flutter widget, and integration test conventions.',
      examples: ['widget_test.dart', 'integration_test/app.dart'], patterns: ['*_test.dart', '**/integration_test/**'] },
    { id: 'swift', name: 'Swift / Apple', description: 'XCTest and Swift Testing test filenames and Tests/UITests source directories.',
      examples: ['AccountTests.swift', 'AppUITests/Fixture.swift'],
      patterns: ['*Tests.swift', '*Test.swift', '**/Tests/**', '**/*Tests/**/*.swift', '**/*UITests/**'] },
    { id: 'cpp', name: 'C / C++', description: 'GoogleTest, Catch2, doctest, and CUnit conventional separate test filenames.',
      examples: ['parser_test.cpp', 'test_parser.c', 'parser.test.cc'],
      patterns: ['c', 'cc', 'cpp', 'cxx'].flatMap(extension =>
        ['*_test', '*_tests', 'test_*', '*.test', '*Test', '*Tests'].map(marker => `${marker}.${extension}`)) },
    { id: 'elixir', name: 'Elixir / Erlang', description: 'ExUnit *_test.exs, EUnit *_tests.erl, and Common Test *_SUITE.erl files.',
      examples: ['parser_test.exs', 'parser_tests.erl', 'parser_SUITE.erl'],
      patterns: ['*_test.exs', '*_tests.erl', '*_SUITE.erl'] },
    { id: 'shell', name: 'Shell / PowerShell', description: 'Bats, ShellSpec, and Pester test filenames.',
      examples: ['check.bats', 'parser_spec.sh', 'Get-User.Tests.ps1'],
      patterns: ['*.bats', '*_spec.sh', '*_test.sh', '*.Tests.ps1'] },
    { id: 'r', name: 'R', description: 'testthat test-*.R and test_*.R files.',
      examples: ['test-user.R', 'test_user.r'], patterns: ['test-*.R', 'test_*.R', 'test-*.r', 'test_*.r'] },
    { id: 'julia', name: 'Julia', description: 'Julia Test runtests.jl, test_*.jl, and *_test.jl naming conventions.',
      examples: ['runtests.jl', 'parser_test.jl'], patterns: ['runtests.jl', 'test_*.jl', '*_test.jl'] },
    { id: 'lua', name: 'Lua', description: 'Busted *_spec.lua and LuaUnit test filename conventions.',
      examples: ['parser_spec.lua', 'test_parser.lua'], patterns: ['*_spec.lua', '*_test.lua', 'test_*.lua'] },
    { id: 'clojure', name: 'Clojure', description: 'clojure.test and ClojureScript *_test source filenames.',
      examples: ['parser_test.clj', 'parser_test.cljs', 'parser_test.cljc'], patterns: ['*_test.clj', '*_test.cljs', '*_test.cljc'] },
    { id: 'haskell', name: 'Haskell', description: 'Hspec *Spec.hs and conventional separate HUnit test files.',
      examples: ['ParserSpec.hs', 'ParserTest.hs'], patterns: ['*Spec.hs', '*Test.hs', '*Tests.hs'] },
    { id: 'perl', name: 'Perl', description: 'Test::More and Perl TAP .t files.',
      examples: ['parser.t'], patterns: ['*.t'] },
    { id: 'zig', name: 'Zig', description: 'Separate test_*.zig and *_test.zig files; inline test blocks are not inferred.',
      examples: ['parser_test.zig', 'test_parser.zig'], patterns: ['*_test.zig', 'test_*.zig'] },
  ];

  function deepFreeze(value) {
    if (value && typeof value === 'object') {
      for (const child of Object.values(value)) deepFreeze(child);
      Object.freeze(value);
    }
    return value;
  }

  deepFreeze(PRESETS);
  const presetIds = PRESETS.map(preset => preset.id);
  const DEFAULT_SETTINGS = deepFreeze({
    enabled: true,
    presets: presetIds.slice(),
    excludedExtensions: [],
    excludePatterns: [],
    includePatterns: [],
    hideInTree: true,
    hideInDiff: true,
    caseSensitive: false,
    language: 'auto',
  });
  const booleanKeys = ['enabled', 'hideInTree', 'hideInDiff', 'caseSensitive'];
  const patternKeys = ['excludePatterns', 'includePatterns'];
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

  function validPattern(value) {
    return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 300
      && !/[\[\]{}\\\u0000-\u001f\u007f]/.test(value) && !value.trim().startsWith('!');
  }

  function normalizeExtension(value) {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    const extension = trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
    return /^\.[\p{L}\p{N}_+-]+(?:\.[\p{L}\p{N}_+-]+)*$/u.test(extension)
      && extension.length <= 40 ? extension : '';
  }

  function unique(values) { return [...new Set(values)]; }

  function normalizeSettings(input) {
    const source = isObject(input) ? input : {};
    const settings = { ...DEFAULT_SETTINGS };
    for (const key of booleanKeys) settings[key] = typeof source[key] === 'boolean' ? source[key] : DEFAULT_SETTINGS[key];
    settings.presets = Array.isArray(source.presets)
      ? unique(source.presets.filter(id => presetIds.includes(id))) : presetIds.slice();
    settings.excludedExtensions = Array.isArray(source.excludedExtensions)
      ? unique(source.excludedExtensions.slice(0, 100).map(normalizeExtension).filter(Boolean)) : [];
    for (const key of patternKeys) settings[key] = Array.isArray(source[key])
      ? unique(source[key].slice(0, 200).filter(validPattern).map(pattern => pattern.trim())) : [];
    settings.language = ['auto', 'en', 'ru'].includes(source.language) ? source.language : 'auto';
    return settings;
  }

  function validateSettings(input) {
    if (!isObject(input)) return ['Settings must be an object.'];
    const errors = [];
    for (const key of Object.keys(input)) if (!own(DEFAULT_SETTINGS, key)) errors.push(`Unknown setting: ${key}.`);
    for (const key of booleanKeys) if (own(input, key) && typeof input[key] !== 'boolean') errors.push(`${key} must be a boolean.`);
    if (own(input, 'language') && !['auto', 'en', 'ru'].includes(input.language)) errors.push('language must be auto, en, or ru.');
    if (own(input, 'presets')) {
      if (!Array.isArray(input.presets)) errors.push('presets must be an array of preset IDs.');
      else if (input.presets.some(id => !presetIds.includes(id))) errors.push('presets contains an unknown preset ID.');
    }
    if (own(input, 'excludedExtensions')) {
      if (!Array.isArray(input.excludedExtensions)) errors.push('excludedExtensions must be an array.');
      else {
        if (input.excludedExtensions.length > 100) errors.push('excludedExtensions supports at most 100 entries.');
        if (input.excludedExtensions.some(extension => !normalizeExtension(extension))) errors.push('Extensions must be suffixes such as .snap or .d.ts, at most 40 characters long.');
      }
    }
    for (const key of patternKeys) {
      if (!own(input, key)) continue;
      if (!Array.isArray(input[key])) errors.push(`${key} must be an array.`);
      else {
        if (input[key].length > 200) errors.push(`${key} supports at most 200 patterns.`);
        if (input[key].some(pattern => !validPattern(pattern))) errors.push(`${key} requires non-empty globs of at most 300 characters. Use forward slashes, *, **, and ?; brackets, braces, and ! negation are unsupported.`);
      }
    }
    return errors;
  }

  function normalizePath(path) {
    if (typeof path !== 'string' || !path || /[/\\]$/.test(path)) return '';
    return path.replace(/\\/g, '/').replace(/[\u200e\u200f]/g, '')
      .replace(/\/+/g, '/').replace(/^(?:\.\/)+/, '').replace(/^\//, '');
  }

  // Use a bounded dynamic-programming glob matcher instead of a backtracking
  // regular expression. Repeated user wildcards cannot cause exponential work.
  function compileGlob(pattern, caseSensitive) {
    const glob = caseSensitive ? pattern : pattern.toLowerCase();
    const basenameOnly = !glob.includes('/');
    const targetPath = path => basenameOnly ? path.slice(path.lastIndexOf('/') + 1) : path;
    if (!/[*?]/.test(glob)) return path => targetPath(path) === glob;
    if (basenameOnly && /^\*[^*?]+$/.test(glob)) return path => targetPath(path).endsWith(glob.slice(1));

    const tokens = [];
    for (let index = 0; index < glob.length; index += 1) {
      const character = glob[index];
      if (character === '*') {
        if (glob[index + 1] === '*') {
          while (glob[index + 1] === '*') index += 1;
          if (glob[index + 1] === '/') { tokens.push({ kind: 'directories' }); index += 1; }
          else tokens.push({ kind: 'all' });
        } else tokens.push({ kind: 'star' });
      } else if (character === '?') tokens.push({ kind: 'one' });
      else {
        let literal = character;
        while (index + 1 < glob.length && !/[*?]/.test(glob[index + 1])) literal += glob[++index];
        tokens.push({ kind: 'literal', value: literal });
      }
    }
    return normalized => {
      const path = targetPath(normalized);
      let previous = new Uint8Array(path.length + 1);
      previous[0] = 1;
      for (const token of tokens) {
        const next = new Uint8Array(path.length + 1);
        let hasMatch = false;
        let prefixMatch = false;
        for (let index = 0; index <= path.length; index += 1) {
          switch (token.kind) {
            case 'literal':
              if (previous[index] && path.startsWith(token.value, index)) { next[index + token.value.length] = 1; hasMatch = true; }
              break;
            case 'one':
              if (previous[index] && index < path.length && path[index] !== '/') { next[index + 1] = 1; hasMatch = true; }
              break;
            case 'star':
            case 'all':
              next[index] = previous[index] || (index > 0 && next[index - 1] && (token.kind === 'all' || path[index - 1] !== '/'));
              hasMatch ||= Boolean(next[index]);
              break;
            case 'directories':
              next[index] = previous[index] || (prefixMatch && path[index - 1] === '/');
              prefixMatch ||= Boolean(previous[index]);
              hasMatch ||= Boolean(next[index]);
              break;
          }
        }
        if (!hasMatch) return false;
        previous = next;
      }
      return Boolean(previous[path.length]);
    };
  }

  function createMatcher(input = DEFAULT_SETTINGS, hideTests = true) {
    const settings = normalizeSettings(input);
    if (!settings.enabled) return () => false;
    const include = settings.includePatterns.map(pattern => compileGlob(pattern, settings.caseSensitive));
    const exclude = settings.excludePatterns.map(pattern => compileGlob(pattern, settings.caseSensitive));
    const extensions = settings.excludedExtensions.map(extension => settings.caseSensitive ? extension : extension.toLowerCase());
    const auto = hideTests ? PRESETS.filter(preset => settings.presets.includes(preset.id))
      .flatMap(preset => preset.patterns).map(pattern => compileGlob(pattern, settings.caseSensitive)) : [];
    return rawPath => {
      const normalized = normalizePath(rawPath);
      if (!normalized) return false;
      const path = settings.caseSensitive ? normalized : normalized.toLowerCase();
      if (include.some(match => match(path))) return false;
      const filename = path.slice(path.lastIndexOf('/') + 1);
      return extensions.some(extension => filename.endsWith(extension))
        || exclude.some(match => match(path)) || auto.some(match => match(path));
    };
  }

  const defaultMatcher = createMatcher(DEFAULT_SETTINGS, true);
  function isTestFile(path, settings = DEFAULT_SETTINGS) {
    return settings === DEFAULT_SETTINGS ? defaultMatcher(path) : createMatcher(settings, true)(path);
  }

  globalThis.GitHubPrFileFilter = Object.freeze({ PRESETS, DEFAULT_SETTINGS, normalizeSettings, validateSettings, createMatcher, isTestFile });
})();
