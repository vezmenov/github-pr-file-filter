# Privacy policy

Effective date: October 14, 2026

This policy applies to **GitHub PR File Filter**, the open-source browser extension maintained in [vezmenov/github-pr-file-filter](https://github.com/vezmenov/github-pr-file-filter).

## Local processing

The extension examines file names, repository-relative paths, and page elements already displayed on GitHub pull request file review pages. It uses that information in memory to hide or restore selected entries in the file tree and diff. Paths extracted from a review are not retained beyond that page's local processing. Source code, review comments, browsing history, and page contents are not saved.

The extension does not collect or transmit personal data. It has no analytics, advertising, telemetry, tracking identifiers, servers, external requests, or remotely loaded code. It does not read account credentials, authentication tokens, cookies, payment information, or private messages.

## Stored settings

The `storage` permission is used only for preferences in `chrome.storage.local`: filtering switches, selected presets, extension suffixes, path patterns, exceptions, case sensitivity, and interface language. These preferences stay in the browser profile and are not sent to the publisher or synchronized through a cloud service by this extension.

If you export settings, the extension downloads a JSON file containing those preferences using the browser's download handling. Imported settings files are read locally and validated. Your own custom rules may contain repository names or paths, so inspect an exported file before sharing it.

Use Reset and then Save in Settings to restore defaults. Uninstalling the extension removes its browser-managed local settings; exported files remain under your control and can be deleted separately.

## Site access

A content script is declared for `https://github.com/*` to support GitHub's navigation without full page reloads. Filtering activates only on pull request `/files` and `/changes` pages. This extension does not access other hosts. GitHub's own data handling remains governed by GitHub's policies.

## Sharing and changes

The publisher does not receive, sell, or share extension user data. Use of information is limited to the local file filtering feature described above. Changes to this policy will be published in this repository with an updated effective date.

For questions, open an issue in [the public issue tracker](https://github.com/vezmenov/github-pr-file-filter/issues). Do not include confidential repository contents or credentials in a public issue.
