(() => {
  'use strict';
  const { PRESETS, DEFAULT_SETTINGS, normalizeSettings, validateSettings, createMatcher } = globalThis.GitHubPrFileFilter;
  const { t, translate } = globalThis.GitHubPrFileFilterI18n;
  const byId = id => document.getElementById(id);
  const fields = ['enabled', 'hide-tests', 'hide-in-tree', 'hide-in-diff', 'excluded-extensions', 'exclude-patterns', 'include-patterns', 'case-sensitive', 'language'];
  let dirty = false;
  let currentLanguage = 'auto';
  let savedState;
  let statusMessage = '';
  let statusVariables = {};
  let statusError = false;

  PRESETS.forEach(preset => {
    const label = document.createElement('label'); label.className = 'preset'; label.dataset.presetId = preset.id;
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = preset.id; checkbox.name = 'preset';
    const details = document.createElement('span');
    const name = document.createElement('span'); name.className = 'preset-name'; name.textContent = preset.name;
    const description = document.createElement('span'); description.className = 'preset-description'; description.textContent = preset.description;
    const examples = document.createElement('span'); examples.className = 'preset-examples'; examples.textContent = preset.examples.join(' · ');
    details.append(name, description, examples); label.append(checkbox, details); byId('preset-list').append(label);
  });

  function lines(id) { return byId(id).value.split(/\r?\n/).map(line => line.trim()).filter(Boolean); }

  function readDraft() {
    return {
      hideTests: byId('hide-tests').checked,
      settings: {
        enabled: byId('enabled').checked,
        presets: Array.from(document.querySelectorAll('input[name="preset"]:checked'), item => item.value),
        excludedExtensions: lines('excluded-extensions'), excludePatterns: lines('exclude-patterns'), includePatterns: lines('include-patterns'),
        hideInTree: byId('hide-in-tree').checked, hideInDiff: byId('hide-in-diff').checked,
        caseSensitive: byId('case-sensitive').checked, language: byId('language').value,
      },
    };
  }

  function status(key, variables = {}, error = false) {
    statusMessage = key; statusVariables = variables; statusError = error;
    byId('status').textContent = key ? t(key, currentLanguage, variables) : '';
    byId('status').dataset.error = String(error);
  }

  function translatePage() {
    currentLanguage = byId('language').value;
    translate(document, currentLanguage);
    document.querySelectorAll('[data-preset-id]').forEach(label => {
      const preset = PRESETS.find(item => item.id === label.dataset.presetId);
      for (const part of ['name', 'description']) {
        const key = `preset_${preset.id}_${part}`;
        const translated = t(key, currentLanguage);
        label.querySelector(`.preset-${part}`).textContent = translated === key ? preset[part] : translated;
      }
    });
    document.title = `GitHub PR File Filter — ${t('settings', currentLanguage)}`;
    status(statusMessage, statusVariables, statusError);
  }

  function preview() {
    const path = byId('preview-path').value.trim();
    const result = byId('preview-result');
    delete result.dataset.hidden;
    if (!path) { result.textContent = t('previewEmpty', currentLanguage); return; }
    const draft = readDraft();
    if (validateSettings(draft.settings).length) { result.textContent = t('previewInvalid', currentLanguage); return; }
    const settings = normalizeSettings(draft.settings);
    let key;
    const hidden = createMatcher(settings, draft.hideTests)(path);
    if (!settings.enabled) key = 'previewDisabled';
    else if (!hidden) key = 'previewShown';
    else if (settings.hideInTree && settings.hideInDiff) key = 'previewTreeDiff';
    else if (settings.hideInTree) key = 'previewTree';
    else if (settings.hideInDiff) key = 'previewDiff';
    else key = 'previewTargetsDisabled';
    result.dataset.hidden = String(hidden && (settings.hideInTree || settings.hideInDiff));
    result.textContent = t(key, currentLanguage);
  }

  function render(state) {
    const settings = normalizeSettings(state.settings);
    byId('enabled').checked = settings.enabled; byId('hide-tests').checked = state.hideTests === true;
    byId('hide-in-tree').checked = settings.hideInTree; byId('hide-in-diff').checked = settings.hideInDiff;
    byId('case-sensitive').checked = settings.caseSensitive; byId('language').value = settings.language;
    byId('excluded-extensions').value = settings.excludedExtensions.join('\n');
    byId('exclude-patterns').value = settings.excludePatterns.join('\n');
    byId('include-patterns').value = settings.includePatterns.join('\n');
    document.querySelectorAll('input[name="preset"]').forEach(input => { input.checked = settings.presets.includes(input.value); });
    byId('reload-saved').hidden = true;
    translatePage(); preview();
  }

  function changed() {
    dirty = true; translatePage(); status('unsaved'); preview();
  }

  async function load() {
    try {
      const state = await chrome.storage.local.get({ hideTests: false, settings: DEFAULT_SETTINGS });
      savedState = { hideTests: state.hideTests === true, settings: normalizeSettings(state.settings) };
      render(savedState); dirty = false; status('');
    } catch (error) { status('readError', { error: error.message }, true); }
  }

  byId('settings-form').addEventListener('submit', async event => {
    event.preventDefault();
    const draft = readDraft(); const errors = validateSettings(draft.settings);
    if (errors.length) { status('saveError', { error: errors.join('\n') }, true); return; }
    const next = { hideTests: draft.hideTests, settings: normalizeSettings(draft.settings) };
    const submit = event.submitter; if (submit) submit.disabled = true;
    try {
      await chrome.storage.local.set(next);
      savedState = next; dirty = false; render(next); status('saved');
    } catch (error) { status('saveError', { error: error.message }, true); }
    finally { if (submit) submit.disabled = false; }
  });

  fields.forEach(id => { byId(id).addEventListener('input', changed); });
  byId('preset-list').addEventListener('change', changed);
  byId('preview-path').addEventListener('input', preview);
  byId('select-all').addEventListener('click', () => { document.querySelectorAll('input[name="preset"]').forEach(input => { input.checked = true; }); changed(); });
  byId('clear-all').addEventListener('click', () => { document.querySelectorAll('input[name="preset"]').forEach(input => { input.checked = false; }); changed(); });
  byId('reset-settings').addEventListener('click', () => { render({ hideTests: false, settings: DEFAULT_SETTINGS }); dirty = true; status('resetDraft'); });
  byId('reload-saved').addEventListener('click', load);

  byId('export-settings').addEventListener('click', () => {
    const draft = readDraft(); const errors = validateSettings(draft.settings);
    if (errors.length) { status('exportError', { error: errors.join('\n') }, true); return; }
    const blob = new Blob([JSON.stringify({ version: 1, hideTests: draft.hideTests, settings: normalizeSettings(draft.settings) }, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = 'github-pr-file-filter-settings.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  byId('import-settings').addEventListener('click', () => { byId('import-file').value = ''; byId('import-file').click(); });
  byId('import-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 100 * 1024) throw new Error(t('importSize', currentLanguage));
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1 || typeof data.hideTests !== 'boolean' || !data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) throw new Error(t('invalidImport', currentLanguage));
      const errors = validateSettings(data.settings); if (errors.length) throw new Error(errors.join('\n'));
      render({ hideTests: data.hideTests, settings: normalizeSettings(data.settings) }); dirty = true; status('imported');
    } catch (error) { status('importError', { error: error.message }, true); }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || (!changes.settings && !changes.hideTests)) return;
    const next = {
      hideTests: changes.hideTests ? changes.hideTests.newValue === true : savedState?.hideTests === true,
      settings: normalizeSettings(changes.settings ? changes.settings.newValue : savedState?.settings),
    };
    savedState = next;
    if (dirty) { byId('reload-saved').hidden = false; status('externalUpdate'); }
    else { render(next); status(''); }
  });

  translate(document, 'auto'); preview(); load();
})();
