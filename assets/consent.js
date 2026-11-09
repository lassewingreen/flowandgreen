/* Local preferences are necessary storage; optional services are loaded separately. */
(() => {
  'use strict';
  const KEY = 'fg_consent_v1';
  const VERSION = 1;
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  const categories = ['analytics', 'marketing', 'media'];
  const listeners = new Set();
  const empty = () => ({analytics: false, marketing: false, media: false, decided: false});
  let state = empty();
  let opener = null;
  const banner = document.getElementById('consent-banner');
  const dialog = document.getElementById('consent-settings');
  const form = document.getElementById('consent-form');
  const copy = () => ({...state});

  function decode(value) {
    try {
      const item = JSON.parse(value);
      if (!item || item.version !== VERSION || !Number.isFinite(item.savedAt) ||
          item.savedAt > Date.now() + 60000 || Date.now() - item.savedAt >= MAX_AGE ||
          !categories.every(key => typeof item[key] === 'boolean')) return empty();
      return Object.fromEntries([...categories.map(key => [key, item[key]]), ['decided', true]]);
    } catch (_) { return empty(); }
  }
  try {
    state = decode(localStorage.getItem(KEY));
    if (!state.decided) localStorage.removeItem(KEY);
  } catch (_) { /* Storage may be blocked. */ }

  function removeOptionalCookies() {
    const names = document.cookie.split(';').map(part => part.trim().split('=')[0]).filter(Boolean);
    const domains = [''];
    const host = location.hostname;
    if (host && host !== 'localhost' && !/^\d[\d.]*$/.test(host)) {
      const parts = host.split('.');
      for (let index = 0; index < parts.length - 1; index++) {
        const domain = parts.slice(index).join('.');
        domains.push(domain, '.' + domain);
      }
    }
    const paths = new Set(['/']);
    const segments = location.pathname.split('/').filter(Boolean);
    for (let index = 1; index <= segments.length; index++) paths.add('/' + segments.slice(0, index).join('/'));
    names.forEach(name => {
      const analytics = /^_ga(?:_|$)/.test(name);
      const marketing = /^(?:_gcl_|_fbp$|_fbc$)/.test(name);
      if (!((analytics && !state.analytics) || (marketing && !state.marketing))) return;
      paths.forEach(path => domains.forEach(domain => {
        document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}` +
          (domain ? `; domain=${domain}` : '') + '; SameSite=Lax';
      }));
    });
  }
  function render() {
    if (banner) banner.hidden = state.decided;
    if (form) categories.forEach(key => {
      const input = form.elements.namedItem(key);
      if (input) input.checked = state[key];
    });
  }
  function notify() {
    removeOptionalCookies();
    render();
    listeners.forEach(fn => { try { fn(copy()); } catch (_) { /* A consumer must not break consent. */ } });
    if (typeof CustomEvent === 'function') document.dispatchEvent(new CustomEvent('fg:consent-change', {detail: copy()}));
  }
  function close() {
    if (dialog) {
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      else { dialog.hidden = true; dialog.removeAttribute('open'); }
    }
    if (opener && typeof opener.focus === 'function') opener.focus();
  }
  function set(next) {
    state = {...Object.fromEntries(categories.map(key => [key, next?.[key] === true])), decided: true};
    try { localStorage.setItem(KEY, JSON.stringify({...state, version: VERSION, savedAt: Date.now()})); } catch (_) { /* Preferences still work for this page. */ }
    notify();
    return copy();
  }
  function open() {
    if (!dialog) return;
    opener = document.activeElement;
    render();
    dialog.hidden = false;
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
    }
    dialog.querySelector('input,button')?.focus();
  }
  window.FlowGreenConsent = Object.freeze({
    get: copy,
    has: key => categories.includes(key) && state[key] === true,
    set,
    open,
    subscribe(fn) {
      if (typeof fn !== 'function') return () => {};
      listeners.add(fn);
      fn(copy());
      return () => listeners.delete(fn);
    }
  });
  document.querySelectorAll('[data-consent-open]').forEach(button => button.addEventListener('click', open));
  document.querySelectorAll('[data-consent-close]').forEach(button => button.addEventListener('click', close));
  document.querySelectorAll('[data-consent-accept]').forEach(button => button.addEventListener('click', () => {
    set({analytics: true, marketing: true, media: true}); close();
  }));
  document.querySelectorAll('[data-consent-reject]').forEach(button => button.addEventListener('click', () => {
    set({analytics: false, marketing: false, media: false}); close();
  }));
  form?.addEventListener('submit', event => {
    event.preventDefault();
    set(Object.fromEntries(categories.map(key => [key, form.elements.namedItem(key)?.checked === true])));
    close();
  });
  dialog?.addEventListener('close', () => { if (opener && typeof opener.focus === 'function') opener.focus(); });
  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) { state = decode(event.newValue); notify(); }
  });
  removeOptionalCookies();
  render();
})();
