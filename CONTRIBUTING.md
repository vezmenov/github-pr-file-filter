# Contributing

Report bugs or propose naming conventions through [GitHub issues](https://github.com/vezmenov/fukk-specs/issues). Include the extension version, browser version, GitHub `/files` or `/changes` view, expected result, actual result, and a minimal example. Remove private repository names, source code, account details, and credentials from screenshots or fixtures.

For a new test convention, include positive paths that should hide, similar production paths that must stay visible, and a link to the framework's official naming or discovery documentation. Broad suffixes such as `*test*` can hide production files; prefer specific rules and an individually configurable preset.

## Local checks

Use Node.js 26 and npm. Packaging requires the system `zip` command.

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm run package
```

Keep runtime code in `extension/` free of remote scripts, telemetry, and npm dependencies. The browser test uses an isolated profile and a controlled fixture. Add regression coverage for changed matching or DOM behavior. A fixture result does not replace a real GitHub compatibility check when selectors change.

Keep changes focused and describe the observable behavior in the pull request. Update English and Russian documentation when settings or supported conventions change. Contributions are licensed under the project's MIT license.
