(() => {
  'use strict';
  const { DEFAULT_SETTINGS, normalizeSettings } = globalThis.GitHubPrFileFilter;
  const { t, translate } = globalThis.GitHubPrFileFilterI18n;
  const byId = id => document.getElementById(id);
  let state = { hideTests: false, settings: normalizeSettings(DEFAULT_SETTINGS) };

  function status(key, variables = {}, error = false) {
    byId('status').textContent = key ? t(key, state.settings.language, variables) : '';
    byId('status').dataset.error = String(error);
  }

  function render(next) {
    state = { hideTests: next.hideTests === true, settings: normalizeSettings(next.settings) };
    translate(document, state.settings.language);
    byId('enabled').checked = state.settings.enabled; byId('hide-tests').checked = state.hideTests;
    byId('preset-count').textContent = t('presetCount', state.settings.language, { count: state.settings.presets.length });
    byId('rule-count').textContent = t('ruleCount', state.settings.language, { count: state.settings.excludedExtensions.length + state.settings.excludePatterns.length, exceptions: state.settings.includePatterns.length });
    byId('targets').textContent = [state.settings.hideInTree && t('tree', state.settings.language), state.settings.hideInDiff && t('diff', state.settings.language)].filter(Boolean).join(' · ') || t('noTargets', state.settings.language);
    document.querySelector('.summary').setAttribute('aria-label', t('filterSummary', state.settings.language));
  }

  async function save(field) {
    byId('enabled').disabled = true; byId('hide-tests').disabled = true;
    const previous = state;
    const next = field === 'enabled'
      ? { ...state, settings: { ...state.settings, enabled: byId('enabled').checked } }
      : { ...state, hideTests: byId('hide-tests').checked };
    try {
      await chrome.storage.local.set(field === 'enabled' ? { settings: next.settings } : { hideTests: next.hideTests });
      render(next); status('popupSaved');
    } catch (error) { render(previous); status('saveError', { error: error.message }, true); }
    finally { byId('enabled').disabled = false; byId('hide-tests').disabled = false; }
  }

  byId('enabled').addEventListener('change', () => save('enabled'));
  byId('hide-tests').addEventListener('change', () => save('hideTests'));
  byId('open-settings').addEventListener('click', async () => {
    try { await chrome.runtime.openOptionsPage(); }
    catch (error) { status('readError', { error: error.message }, true); }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || (!changes.settings && !changes.hideTests)) return;
    render({ hideTests: changes.hideTests ? changes.hideTests.newValue : state.hideTests, settings: changes.settings ? changes.settings.newValue : state.settings });
  });
  render(state);
  chrome.storage.local.get({ hideTests: false, settings: DEFAULT_SETTINGS }).then(render).catch(error => status('readError', { error: error.message }, true));
})();
