(() => {
  'use strict';
  if (globalThis.__fukkSpecsLoaded) return;
  globalThis.__fukkSpecsLoaded = true;

  const hiddenAttribute = 'data-fukk-specs-hidden';
  const diffAttribute = 'data-fukk-specs-diff';
  const ownedAttribute = 'data-fukk-specs-owned';
  const { DEFAULT_SETTINGS, normalizeSettings, createMatcher } = globalThis.FukkSpecs;
  const menuBindings = new WeakSet();
  const treeBindings = new WeakSet();
  let hideTests = false;
  let settings = normalizeSettings(DEFAULT_SETTINGS);
  let shouldHide = createMatcher(settings, hideTests);
  let wasActive = false;
  let pending = false;
  let lastPath = location.pathname;

  const observer = new MutationObserver(schedule);
  const observerOptions = {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['aria-expanded', 'hidden', 'class', 'style', 'data-path', 'aria-label'],
  };

  function activePage() {
    return location.hostname === 'github.com'
      && /^\/[^/]+\/[^/]+\/pull\/\d+\/(?:files|changes)(?:\/|$)/.test(location.pathname);
  }

  function schedule() {
    if (pending) return;
    pending = true;
    setTimeout(() => { pending = false; reconcile(); }, 16);
  }

  function setHideTests(value) {
    hideTests = value;
    shouldHide = createMatcher(settings, hideTests);
    reconcile();
    try { chrome.storage.local.set({hideTests}).catch(() => {}); } catch { /* Current page remains usable after an extension reload. */ }
  }

  function setEnabled(value) {
    settings = normalizeSettings({...settings, enabled: value});
    shouldHide = createMatcher(settings, hideTests);
    reconcile();
    try { chrome.storage.local.set({settings}).catch(() => {}); } catch { /* Extension was reloaded. */ }
  }

  function text(key) { return globalThis.FukkSpecsI18n.t(key, settings.language); }

  function openSettings() {
    try { chrome.runtime.sendMessage({type: 'OPEN_OPTIONS'}).catch(() => {}); } catch { /* Extension was reloaded. */ }
  }

  function visible(element) {
    for (let current = element; current; current = current.parentElement) {
      if (current.hasAttribute(hiddenAttribute) || current.hidden || current.getAttribute('aria-hidden') === 'true') return false;
      const style = getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (current.getAttribute('role') === 'group') {
        const parent = current.closest('[role="treeitem"]');
        if (parent && expanded(parent) === false) return false;
      }
    }
    return true;
  }

  function expanded(row) {
    const value = row.getAttribute('aria-expanded')
      ?? row.querySelector(':scope > button[aria-expanded], :scope > div > button[aria-expanded]')?.getAttribute('aria-expanded');
    return value === null || value === undefined ? null : value === 'true';
  }

  function ownElement(row, selector) {
    return [...row.querySelectorAll(selector)].find(el => el.closest('[role="treeitem"]') === row);
  }

  function rowLabel(row) {
    const labelledBy = row.getAttribute('aria-labelledby');
    if (labelledBy) {
      const label = labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ').trim();
      if (label) return label;
    }
    const link = ownElement(row, 'a');
    return row.getAttribute('aria-label')
      || ownElement(row, '.ActionList-item-label, [data-component="TreeView.ItemLabel"]')?.textContent.trim()
      || link?.getAttribute('title') || link?.textContent.trim()
      || row.querySelector(':scope > div, :scope > button, :scope > span')?.textContent.trim() || '';
  }

  function filePath(row) {
    const filterText = ownElement(row, '[data-filterable-item-text]');
    const explicit = row.getAttribute('data-path') || row.getAttribute('data-file-path') || filterText?.textContent.trim();
    if (explicit) return explicit;
    // Current GitHub React trees use the full repository path as the item ID.
    if (row.id.includes('/') && row.classList.contains('PRIVATE_TreeView-item')) return row.id;
    const link = ownElement(row, 'a');
    const titledPath = link?.getAttribute('title');
    if (titledPath?.includes('/')) return titledPath;
    const parts = [rowLabel(row)];
    for (let parent = row.parentElement?.closest('[role="treeitem"]'); parent; parent = parent.parentElement?.closest('[role="treeitem"]')) {
      parts.unshift(rowLabel(parent));
    }
    return parts.join('/');
  }

  function directory(row) {
    return expanded(row) !== null || row.getAttribute('data-tree-entry-type') === 'directory'
      || !!row.querySelector(':scope > [role="group"]');
  }

  function focusTarget(row) {
    if (row.hasAttribute('tabindex')) return row;
    return ownElement(row, 'a, button, [tabindex]') || row;
  }

  function focusRow(row) {
    const target = focusTarget(row);
    row.closest('[role="tree"]')?.querySelectorAll('[tabindex="0"]').forEach(element => {
      if (element !== target) element.setAttribute('tabindex', '-1');
    });
    target.setAttribute('tabindex', '0');
    target.focus();
  }

  function bindTree(tree) {
    if (treeBindings.has(tree)) return;
    treeBindings.add(tree);
    tree.addEventListener('keydown', event => {
      if (!settings.enabled || !settings.hideInTree || !tree.querySelector(`[${hiddenAttribute}]`) || !activePage() || !['ArrowUp', 'ArrowDown', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const rows = [...tree.querySelectorAll('[role="treeitem"]')].filter(visible);
      if (!rows.length) return;
      const current = event.target.closest('[role="treeitem"]');
      const index = rows.indexOf(current);
      if (index < 0) return;
      if (event.key === 'ArrowRight') {
        if (expanded(current) !== true) return; // Let GitHub expand collapsed folders.
        const child = rows.find(row => row.parentElement.closest('[role="treeitem"]') === current);
        if (!child) return;
        event.preventDefault(); event.stopImmediatePropagation(); focusRow(child); return;
      }
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1
        : Math.max(0, Math.min(rows.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
      event.preventDefault(); event.stopImmediatePropagation();
      focusTarget(current).setAttribute('tabindex', '-1');
      focusRow(rows[next]);
    }, true);
  }

  function filterTree(tree) {
    bindTree(tree);
    const rows = [...tree.querySelectorAll('[role="treeitem"]')];
    for (const row of rows) {
      row.toggleAttribute(hiddenAttribute, settings.hideInTree && !directory(row) && shouldHide(filePath(row)));
    }
    for (const row of rows.toReversed()) {
      if (!directory(row)) continue;
      const children = [...row.querySelectorAll('[role="treeitem"]')].filter(child => child.parentElement.closest('[role="treeitem"]') === row);
      const allHidden = children.some(child => child.hasAttribute(hiddenAttribute))
        && children.every(child => child.hasAttribute(hiddenAttribute) || !visible(child));
      row.toggleAttribute(hiddenAttribute, settings.enabled && settings.hideInTree && expanded(row) !== false && allHidden);
    }
    if (tree.contains(document.activeElement) && document.activeElement.closest(`[${hiddenAttribute}]`)) {
      const first = rows.find(visible);
      if (first) focusRow(first);
      else document.querySelector('[data-fukk-specs-toggle], [data-fukk-specs-fallback]')?.focus();
    }
    if (settings.enabled && settings.hideInTree) {
      const stops = [...tree.querySelectorAll('[tabindex="0"]')];
      stops.filter(element => !visible(element)).forEach(element => element.setAttribute('tabindex', '-1'));
      if (!stops.some(visible)) {
        const first = rows.find(visible);
        if (first) focusTarget(first).setAttribute('tabindex', '0');
      }
    }
    const previous = tree.parentElement.querySelector(':scope > [data-fukk-specs-empty]');
    const allHidden = rows.length > 0 && rows.filter(row => !row.parentElement.closest('[role="treeitem"]')).every(row => row.hasAttribute(hiddenAttribute));
    if (!settings.enabled || !settings.hideInTree || !allHidden) { previous?.remove(); return; }
    const message = previous || document.createElement('div');
    message.className = 'fukk-specs-empty'; message.setAttribute('data-fukk-specs-empty', ''); message.setAttribute(ownedAttribute, '');
    message.setAttribute('role', 'status'); message.textContent = text('allHidden');
    const restore = document.createElement('button'); restore.type = 'button'; restore.textContent = text('disableFilter');
    restore.addEventListener('click', () => setEnabled(false)); message.append(restore); if (!previous) tree.after(message);
  }

  function findMenus() {
    const menus = new Set(document.querySelectorAll('details-menu.js-file-filter'));
    // GitHub's portalled ActionList uses a span heading and nested ARIA group.
    for (const menu of document.querySelectorAll('[role="menu"], [role="listbox"]')) {
      if (menu.querySelector('[role="group"][aria-label="File extensions"]')) menus.add(menu);
    }
    for (const trigger of document.querySelectorAll('button, summary')) {
      if (!/^(?:Filter options|File filter)$/.test(trigger.getAttribute('aria-label') || trigger.textContent.trim())) continue;
      const controlled = document.getElementById(trigger.getAttribute('aria-controls'));
      if (controlled) {
        const menu = controlled.matches('[role="menu"], [role="listbox"]') ? controlled : controlled.querySelector('[role="menu"], [role="listbox"]');
        if (menu) menus.add(menu);
      }
    }
    for (const heading of document.querySelectorAll('h2, h3, [role="heading"]')) {
      if (!/^(?:File extensions|Filter by extension)$/.test(heading.textContent.trim())) continue;
      const menu = heading.closest('[role="menu"], [role="listbox"], .SelectMenu-modal');
      if (menu) menus.add(menu.closest('details-menu') || menu);
      else {
        const sibling = heading.parentElement.parentElement?.querySelector('[role="menu"], [role="listbox"]');
        if (sibling) menus.add(sibling);
      }
    }
    return [...menus];
  }

  function filterDiffs() {
    const blocks = new Map();
    for (const file of document.querySelectorAll('.file[data-path]')) {
      blocks.set(file, file.getAttribute('data-path'));
    }
    for (const region of document.querySelectorAll('[role="region"][id^="diff-"]')) {
      const heading = (region.getAttribute('aria-labelledby') || '').split(/\s+/)
        .map(id => document.getElementById(id)).find(element => element && region.contains(element))
        || region.querySelector('h3');
      const path = region.getAttribute('data-path') || heading?.querySelector('a')?.textContent.trim() || heading?.textContent.trim();
      // Hide the progressive entry too: its content-visibility placeholder reserves height.
      const entry = region.parentElement?.parentElement?.matches('[data-testid="progressive-diffs-list"]')
        ? region.parentElement : region;
      blocks.set(entry, path);
    }
    for (const previous of document.querySelectorAll(`[${diffAttribute}]`)) {
      if (!blocks.has(previous)) {
        previous.removeAttribute(hiddenAttribute); previous.removeAttribute(diffAttribute);
      }
    }
    const focused = document.activeElement;
    let moveFocus = false;
    for (const [block, path] of blocks) {
      const hide = settings.hideInDiff && shouldHide(path);
      if (hide && block.contains(focused)) moveFocus = true;
      block.toggleAttribute(hiddenAttribute, hide);
      block.toggleAttribute(diffAttribute, hide);
    }
    if (moveFocus) {
      const target = [...document.querySelectorAll('[data-fukk-specs-toggle], [data-fukk-specs-fallback], input')]
        .find(element => visible(element) && (element.hasAttribute('data-fukk-specs-toggle')
          || element.hasAttribute('data-fukk-specs-fallback') || /^Filter files/.test(element.getAttribute('placeholder') || '')));
      if (target) target.focus();
      else focused?.blur();
    }
  }

  function menuFocusTarget(item) {
    if (item.matches('button, input, a, [tabindex]')) return item;
    return item.querySelector('button, input:not([type="hidden"]), a, [tabindex]') || item;
  }

  function bindMenu(menu) {
    if (menuBindings.has(menu)) return;
    menuBindings.add(menu);
    menu.addEventListener('keydown', event => {
      if (!activePage() || !menu.querySelector('[data-fukk-specs-toggle]')) return;
      const toggle = event.target.closest('[data-fukk-specs-toggle], [data-fukk-specs-enable], [data-fukk-specs-settings]');
      if (toggle && [' ', 'Enter'].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation(); toggle.click(); return;
      }
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      const items = [...menu.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"]')].filter(visible);
      const current = items.findIndex(item => item === event.target || item.contains(event.target));
      if (current < 0) return;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      event.preventDefault(); event.stopImmediatePropagation(); menuFocusTarget(items[next]).focus();
    }, true);
  }

  function injectMenu(menu) {
    let toggle = menu.querySelector('[data-fukk-specs-toggle]');
    if (!toggle) {
      const container = document.createElement(menu.tagName === 'UL' ? 'li' : 'div');
      container.setAttribute(ownedAttribute, ''); container.setAttribute('role', 'none'); container.className = 'fukk-specs-separator';
      toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'fukk-specs-option';
      toggle.setAttribute('data-fukk-specs-toggle', ''); toggle.setAttribute('role', menu.getAttribute('role') === 'listbox' ? 'option' : 'menuitemcheckbox');
      toggle.setAttribute('tabindex', '-1');
      const check = document.createElement('span'); check.className = 'fukk-specs-check'; check.setAttribute('aria-hidden', 'true'); check.textContent = '✓';
      const label = document.createElement('span'); label.setAttribute('data-fukk-specs-label', ''); toggle.append(check, label);
      const enable = document.createElement('button'); enable.type = 'button'; enable.className = 'fukk-specs-option';
      enable.setAttribute('data-fukk-specs-enable', ''); enable.setAttribute('role', toggle.getAttribute('role')); enable.tabIndex = -1;
      const enableCheck = check.cloneNode(true); const enableLabel = document.createElement('span'); enableLabel.setAttribute('data-fukk-specs-label', ''); enable.append(enableCheck, enableLabel);
      enable.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); setEnabled(!settings.enabled); });
      const options = document.createElement('button'); options.type = 'button'; options.className = 'fukk-specs-option'; options.tabIndex = -1;
      options.setAttribute('data-fukk-specs-settings', ''); options.setAttribute('role', menu.getAttribute('role') === 'listbox' ? 'option' : 'menuitem');
      options.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); openSettings(); });
      container.append(enable, toggle, options);
      toggle.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); setHideTests(!hideTests); });
      (menu.querySelector('.SelectMenu-modal') || menu).append(container);
    }
    toggle.querySelector('[data-fukk-specs-label]').textContent = text('hideTests');
    toggle.setAttribute('aria-checked', String(hideTests));
    if (toggle.getAttribute('role') === 'option') toggle.setAttribute('aria-selected', String(hideTests));
    const enable = menu.querySelector('[data-fukk-specs-enable]');
    enable.querySelector('[data-fukk-specs-label]').textContent = text('enableFilter');
    enable.setAttribute('aria-checked', String(settings.enabled));
    if (enable.getAttribute('role') === 'option') enable.setAttribute('aria-selected', String(settings.enabled));
    menu.querySelector('[data-fukk-specs-settings]').textContent = text('settings');
    bindMenu(menu);
  }

  function injectFallback(menus) {
    const search = [...document.querySelectorAll('input')].find(input => /^Filter files(?:…|\.\.\.)?$/.test(input.getAttribute('placeholder') || input.getAttribute('aria-label') || ''));
    let fallback = document.querySelector('[data-fukk-specs-fallback]');
    // Once the native menu has been identified, keep all controls inside it.
    if (menus.length) { fallback?.remove(); return; }
    if (!search) return;
    if (!fallback) {
      fallback = document.createElement('button'); fallback.type = 'button'; fallback.className = 'fukk-specs-fallback';
      fallback.setAttribute('data-fukk-specs-fallback', ''); fallback.setAttribute(ownedAttribute, '');
      fallback.addEventListener('click', () => setHideTests(!hideTests));
      (search.closest('label')?.parentElement || search.parentElement).append(fallback);
    }
    fallback.textContent = text('hideTests');
    fallback.setAttribute('aria-pressed', String(hideTests));
  }

  function reconcile() {
    observer.disconnect();
    try {
      const active = activePage();
      if (!active) {
        if (wasActive) {
          document.querySelectorAll(`[${hiddenAttribute}]`).forEach(row => row.removeAttribute(hiddenAttribute));
          document.querySelectorAll(`[${diffAttribute}]`).forEach(block => block.removeAttribute(diffAttribute));
          document.querySelectorAll(`[${ownedAttribute}]`).forEach(element => element.remove());
        }
        wasActive = false; return;
      }
      wasActive = true;
      const menus = findMenus(); menus.forEach(injectMenu); injectFallback(menus);
      for (const tree of document.querySelectorAll('[role="tree"]')) {
        const name = tree.getAttribute('aria-label') || (tree.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ');
        if (/file/i.test(name) || tree.closest('file-tree')) filterTree(tree);
      }
      filterDiffs();
    } finally { observer.observe(document.documentElement, observerOptions); }
  }

  for (const event of ['turbo:load', 'turbo:render', 'pjax:end', 'filterable:change']) document.addEventListener(event, schedule);
  window.addEventListener('popstate', schedule);
  // React navigation can change history without firing popstate or Turbo events.
  setInterval(() => { if (location.pathname !== lastPath) { lastPath = location.pathname; schedule(); } }, 1000);
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || (!changes.hideTests && !changes.settings)) return;
      if (changes.hideTests) hideTests = changes.hideTests.newValue === true;
      if (changes.settings) settings = normalizeSettings(changes.settings.newValue);
      shouldHide = createMatcher(settings, hideTests); schedule();
    });
    chrome.storage.local.get({hideTests: false, settings: null}).then(value => {
      hideTests = value.hideTests === true;
      settings = normalizeSettings(value.settings);
      shouldHide = createMatcher(settings, hideTests); schedule();
    }).catch(schedule);
  } catch { schedule(); }
  reconcile();
})();
