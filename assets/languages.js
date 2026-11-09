/* Matching language pages keep safe campaign context in the URL, not pre-consent storage. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root || !root.document) return;
  const links = Array.from(root.document.querySelectorAll('.locale-switch a'), link => ({link, original: link.getAttribute('href')}));
  const update = () => {
    const state = root.FlowGreenConsent ? root.FlowGreenConsent.get() : {decided: false, analytics: false};
    const stored = root.FlowGreenAnalytics ? root.FlowGreenAnalytics.attribution() : {};
    links.forEach(({link, original}) => { link.href = api.buildLanguageURL(original, root.location.href, state, stored); });
  };
  update(); root.addEventListener('hashchange', update);
  if (root.FlowGreenConsent) root.FlowGreenConsent.subscribe(update);
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  function safeLabel(value) {
    return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value) && !/\d{7,}|https?|www\.|(?:@|%40)/i.test(value) && /[A-Za-z]/.test(value) ? value : '';
  }
  function buildLanguageURL(original, currentURL, state = {}, stored = {}) {
    const current = new URL(currentURL); const target = new URL(original, current);
    if (target.origin !== current.origin) return target.href;
    target.search = '';
    target.hash = /^#[a-z][a-z0-9_-]{0,50}$/i.test(current.hash) ? current.hash : '';
    if (!(state.decided && !state.analytics)) {
      keys.forEach(key => {
        const value = safeLabel(current.searchParams.get(key)) || (state.analytics ? safeLabel(stored[key]) : '');
        if (value) target.searchParams.set(key, value);
      });
    }
    return target.href;
  }
  return {safeLabel,buildLanguageURL};
});
