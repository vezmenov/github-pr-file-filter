# Architecture

The Manifest V3 extension uses plain JavaScript and CSS. Production files have no runtime dependencies or remote code. The only permission is `storage`.

## Runtime

- `test-files.js` compiles preset and user glob rules into a path predicate. Include rules take precedence over exclusions; custom exclusions work independently of the test toggle. Input sizes are bounded.
- `content.js` runs on github.com for SPA navigation, but changes visibility only on PR `/files` and `/changes` routes. A debounced observer reconciles lazy tree and diff updates while disconnected from its own mutations.
- `i18n.js` supplies English and Russian text.
- `background.js` handles one internal message to open options. It makes no network requests.
- Options and popup store preferences in `chrome.storage.local`. Storage events update other GitHub tabs.

## DOM integration

The native extension menu receives the test toggle, master switch and settings action. A search-adjacent fallback provides the test toggle when the menu is unavailable; the toolbar popup always exposes settings.

Tree leaves and complete diff entries use the same predicate. The extension writes only its own visibility attributes. It does not remove files, comments or drafts, or change Viewed state or native filtering. React progressive diff wrappers are hidden as a whole to remove reserved height. Legacy `.file[data-path]` entries are supported.

Empty expanded folders are hidden after filtering their children. Collapsed lazy folders remain until their contents are available. Keyboard navigation skips hidden entries and moves focus away from hidden comments without deleting drafts. Leaving PR files removes extension visibility marks and controls.

## Boundaries

Detection uses paths, not file contents. Inline tests, generated files without recognizable paths and custom conventions may need user rules. GitHub Enterprise hosts are not supported. The extension does not execute tests.

Unit tests verify paths. DOM tests verify visibility, keyboard and native-state preservation. Browser tests load the actual extension in isolated Chromium with controlled GitHub responses; they do not prove compatibility with every live GitHub revision.
