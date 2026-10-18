# Chrome Web Store publishing

This document contains listing text, the release checklist, and a dated publication status.

## Publication status

As of **October 18, 2026 (Europe/Moscow)**, version **1.1.0** is **published and publicly available** in the [Chrome Web Store](https://chromewebstore.google.com/detail/github-pr-file-filter/femlegodeikdcchheikbcdnpcckdpbic). The public listing was checked without signing in and displayed **GitHub PR File Filter**, version **1.1.0**, and **Add to Chrome**.

### Publication history

The listing was rejected for keyword stuffing on October 15 (**Yellow Argon**). On October 16, the detailed description was shortened and corrected, its saved value was verified after reloading, and the same version was resubmitted. The runtime, package version, and functionality remain unchanged.

The source code and extension ZIP are already public in [GitHub release v1.1.0](https://github.com/vezmenov/github-pr-file-filter/releases/tag/v1.1.0).

## Listing fields

| Field | Value |
| --- | --- |
| Name | GitHub PR File Filter |
| Version | 1.1.0 |
| Primary language | English |
| Category | Developer Tools, if available in the current dashboard |
| Price | Free |
| Visibility | Public |
| Homepage | `https://github.com/vezmenov/github-pr-file-filter` |
| Support | `https://github.com/vezmenov/github-pr-file-filter/issues` |
| Privacy policy | `https://github.com/vezmenov/github-pr-file-filter/blob/main/docs/PRIVACY.md` |

### Short description

```text
Hide tests and selected file types in GitHub PR file trees and diffs, with configurable presets, patterns, and exceptions.
```

This is 122 characters, within the manifest description's 132-character limit. Keep manifest metadata and the listing consistent; the dashboard cannot edit uploaded manifest fields. [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare).

### Detailed description

```text
Hide test files in the tree and diff view of GitHub pull requests. Open the menu beside "Filter files" and enable "Hide test files".

Settings let you choose naming presets, hide extensions or path patterns, and add exceptions. Preview a path before saving. Rules can apply to either panel or both, and can be imported or exported as JSON.

Turn off "Enable file filtering" to restore entries hidden by the extension. Existing platform filters still apply. Viewed markers, comments and review drafts are preserved.

Recognition uses names and paths. It does not detect tests embedded in production code. Supports pull request review pages on github.com; enterprise hosts are not supported.

Page information is processed on your device. Only preferences are saved in local browser storage. No page data or settings are sent to the publisher. No analytics or remote code.

Open source. Code and support: https://github.com/vezmenov/github-pr-file-filter

Independent project, not affiliated with GitHub.
```

## Privacy practices fields

Use the following answers only while they remain consistent with the shipped extension. Chrome requires a single-purpose statement, permission justifications, remote-code disclosure, data-use certification, and a policy URL. [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).

**Single purpose:**

```text
Let users filter GitHub pull request file reviews by hiding test files and selected path or extension patterns in the file tree and diff, with reversible local controls.
```

**storage justification:**

```text
Save the user's filtering switches, selected naming presets, hidden suffixes, custom path patterns, exceptions, case-sensitivity preference, and interface language in chrome.storage.local. Settings remain in the browser profile and update the extension's controls in open GitHub tabs.
```

**GitHub site access / content script justification:**

```text
The content script runs on https://github.com/* so it can recognize navigation into and out of pull request file review pages without a full page reload. It reads file names and paths already rendered on /pull/<number>/files and /pull/<number>/changes pages and hides matching tree rows and diff cards. Processing is local, no page data is stored or transmitted, and filtering is inactive on other GitHub pages.
```

**Remote code:** No. All JavaScript and styles are bundled in the uploaded package. No remotely hosted code is executed.

**Data usage — Website content:** Select **Website content** because the extension processes rendered file names, repository-relative paths, and DOM metadata locally to filter GitHub reviews. Page data is not transmitted to the publisher or third parties and extracted paths are not retained beyond local page processing. User-entered custom patterns are stored only as preferences. Local processing must still be disclosed; the Chrome [User Data FAQ, question 3](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) explicitly includes data processed or stored on the device.

**Other categories:** The extension does not harvest personally identifiable information, health information, financial/payment information, authentication information, personal communications, location, or user activity tracking. It checks the current page's URL path locally for activation; it does not use the browser history API or store a list of visited websites. Local preferences and user-initiated settings import/export are described in the privacy policy. Do not describe this implementation as handling no user data: website content is processed locally.

**Data-use certifications:** The implementation does not sell or transfer user data, does not use it for unrelated purposes, and does not use it for creditworthiness or lending decisions. Complete the dashboard's certifications only after checking that their actual wording matches these practices.

## Assets

| Asset | Specification |
| --- | --- |
| Extension/store icon | PNG, 128 × 128 px, included in the ZIP. Square artwork should occupy 96 × 96 px with 16 px transparent padding on each side. |
| Small promotional tile | PNG or JPEG, 440 × 280 px. Required. |
| Screenshots | At least one, up to five; 1280 × 800 px preferred, or 640 × 400 px. Show the actual filter and settings without private repository content. |
| Marquee promotional tile | 1400 × 560 px. Optional. |

Only the icon, small promotional image, and a screenshot are mandatory; a promotional video is optional. Screenshots should have square corners and no added padding. [Official image requirements](https://developer.chrome.com/docs/webstore/images).

## Release checklist

1. Run `npm ci`, `npm test`, `npm run test:browser`, and `npm run package`; verify the unpacked extension on a real GitHub PR. Fixture tests and real GitHub checks are separate evidence.
2. Inspect `dist/github-pr-file-filter-1.1.0.zip`: `manifest.json` must be at its root, version/name/description must be correct, and only extension runtime assets must be present.
3. Confirm the public source repository and privacy URL are accessible. Use generic demo content for store screenshots.
4. Sign in to the intended publisher account. New publishers must register, accept the developer terms, and pay a one-time registration fee before submission. The account owner must handle registration, agreements, and payment. [Registration](https://developer.chrome.com/docs/webstore/register/).
5. Add a new item, upload the ZIP, complete listing, privacy, distribution, and any test-instruction fields. Select free public distribution in the supported regions you intend to serve.
6. Submit for review. Decide whether to publish automatically after approval. Record the item ID and review state; submission is not approval, and approval is not a live listing until published. [Publishing process](https://developer.chrome.com/docs/webstore/publish).
7. Verify the public listing after publication and keep the store links in both README files current. Future uploads must use a higher extension version.

## Reviewer test instructions

No extension account or special credentials are required. Use any accessible GitHub PR with both test and production files in `/files` or `/changes`. Open the file filter menu and enable Hide tests: matching rows and whole diff cards disappear. Disable it: files return and Viewed markers remain unchanged. In Settings, add `.md` to hidden extensions, add a matching README path to Always show, save, and verify that the exception remains visible. Turn Enable filtering off to restore everything hidden by the extension.

For a reproducible automated check, clone the public repository and run `npm ci`, `npx playwright install chromium`, and `npm run test:browser`. This check uses a controlled fixture and does not require access to a private repository.
