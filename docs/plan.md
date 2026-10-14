# Release checklist

1. Update package and manifest versions and the lockfile.
2. Run `npm ci`, `npm test`, `npm run test:browser` and `npm run package` on the release revision.
3. Check the ZIP has manifest.json at its root and all referenced scripts/pages/icons, with no development files.
4. Review documentation and screenshots for private repository data and paths.
5. Publish source, an annotated version tag and extension ZIP on GitHub.
6. Follow [Chrome Web Store preparation](CHROME_WEB_STORE.md), upload the same ZIP, complete listing/privacy/distribution and submit for review.
7. Track GitHub release, store submission and public store availability separately.
