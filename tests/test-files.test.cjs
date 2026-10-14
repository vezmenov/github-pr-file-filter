const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function classifier() {
  const context = vm.createContext({});
  const file = path.join(__dirname, '../extension/test-files.js');
  if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  return context.FukkSpecs?.isTestFile ?? (() => false);
}

const shouldHide = [
  'src/app/billing.service.spec.ts', 'button.test.tsx', 'foo.spec.cts',
  'foo.test.mjs', 'foo.test.cjs', 'foo.spec.jsx', 'src/test.js',
  '__tests__/helper.ts', 'packages/api/tests/fixture.json',
  'src/test/java/Helper.java', 'spec/models/user_spec.rb', 'e2e/login.cy.ts',
  'test_api.py', 'api_test.py', 'server_test.go',
  'src\\components\\button.spec.ts', 'src/Кнопка.test.ts',
  'button.test.mts', 'lib/button_spec.cjs', 'lib/main_test.ts', 'src/spec.mjs',
  'test-api.js', 'src/__snapshots__/button.test.ts.snap',
  'auth.cy.ts', 'auth.e2e.tsx', 'cypress/support/commands.ts',
  'test_user.rb', 'user_test.rb', 'user_spec.rb',
  'src/androidTest/java/ScreenTest.java', 'src/integrationTest/kotlin/ApiSpec.kt',
  'UserTests.cs', 'UserTest.fs', 'UserTests.vb', 'User.Tests/Fixtures.cs',
  'UserTest.php', 'parser.phpt', 'parser_test.rs', 'widget_test.dart',
  'AccountTests.swift', 'AppUITests/Fixture.swift',
  'parser_test.cpp', 'test_parser.c', 'parser.test.cc',
  'parser_test.exs', 'parser_SUITE.erl', 'parser_tests.erl',
  'check.bats', 'Get-User.Tests.ps1', 'test-user.R', 'test_user.r',
  'runtests.jl', 'parser_test.jl', 'parser_spec.lua',
  'parser_test.clj', 'parser_test.cljs', 'parser_test.cljc',
  'ParserSpec.hs', 'parser.t', 'parser_test.zig',
  'pkg/TESTS/fixture.json', 'src/BUTTON.TEST.TS',
];
const shouldKeep = [
  'src/billing.service.ts', 'src/latest.ts', 'src/contest.ts',
  'src/testimonials.py', 'src/testdata/server.go', 'src/specification.ts',
  'src/testing/helper.ts', 'src/main/java/ConnectionTest.java',
  'src/lib.rs', 'src/tests.rs', 'foo.spec.ts.map', 'foo.test.tsx.bak',
  'docs/testing.md', 'test.config.ts', '.github/workflows/test.yml',
  'src/test-utils.ts', '', null, undefined,
  'src/testing.rs', 'src/Contest.java', 'src/main/kotlin/UserTest.kt',
  'src/Tests.md', 'src/parser_test.cpp.bak', 'src/ReadmeTests.txt',
];

for (const file of shouldHide) test(`hide ${file}`, () => assert.equal(classifier()(file), true));
for (const file of shouldKeep) test(`keep ${file}`, () => assert.equal(classifier()(file), false));
