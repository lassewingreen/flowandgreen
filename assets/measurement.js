/* Allowlisted, consent-gated events. No form values enter this module. */
(() => {
  'use strict';
  const consent = window.FlowGreenConsent;
  const config = window.FlowGreenConfig || {};
  const gaId = /^G-[A-Z0-9]{5,20}$/.test(config.measurementId || '') ? config.measurementId : '';
  const adsId = /^AW-\d{5,30}$/.test(config.googleAdsId || '') ? config.googleAdsId : '';
  const adsLabel = /^[A-Za-z0-9_-]{3,128}$/.test(config.googleAdsLeadLabel || '') ? config.googleAdsLeadLabel : '';
  const metaId = /^\d{5,30}$/.test(config.metaPixelId || '') ? config.metaPixelId : '';
  const CAMPAIGN_KEY = 'fg_campaign_v1';
  const SESSION_AGE = 30 * 60 * 1000;
  const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const eventNames = new Set(['booking_cta_click', 'form_start', 'generate_lead', 'form_error', 'contact_click', 'video_start', 'audio_start', 'repertoire_download']);
  const enums = {
    page_id: ['home', 'wedding', 'corporate', 'privacy', 'thank_you'],
    language: ['da', 'en'],
    placement: ['header', 'hero', 'after_video', 'after_review', 'mobile', 'sticky', 'form', 'footer', 'inline', 'landing', 'contact', 'success', 'review', 'music', 'primary', 'secondary', 'top', 'page'],
    occasion: ['wedding', 'corporate', 'private', 'birthday', 'reception', 'other', 'undecided'],
    form_id: ['booking', 'booking-form', 'booking_enquiry', 'enquiry', 'contact'],
    method: ['email', 'messenger', 'form', 'youtube', 'eventzonen', 'external', 'phone', 'submit', 'audio', 'pdf', 'button', 'link'],
    error_type: ['network', 'timeout', 'server', 'invalid_response', 'unknown', 'http_error', 'validation', 'submission_failed'],
    content_id: ['medley', 'repertoire', 'featured_video', 'youtube_main', 'V8LUhAyzS6U', 'nTXc2jLasTk', 'tmO2kSr5Z-A', '55hYRbOOsTs', 'Hxuq_dIlwbg', 'RbwEQH1w2vY', 'cQWwQzBzzdM', 'ONgc1nw_E80', 'OGhZqn3MN5k', 'R6Y3tNKzxrA', 'wGW2uoGRiz4', 'cpNLeynOz6w']
  };
  const route = location.pathname.split('/').filter(Boolean).pop() || '';
  const language = document.documentElement.lang === 'en' ? 'en' : 'da';
  const routes = {
    'bryllup.html': ['wedding', '/bryllup.html'], 'bryllup-en.html': ['wedding', '/bryllup-en.html'],
    'firmafest.html': ['corporate', '/firmafest.html'], 'firmafest-en.html': ['corporate', '/firmafest-en.html'],
    'privatliv.html': ['privacy', '/privatliv.html'], 'privacy.html': ['privacy', '/privacy.html'],
    'tak.html': ['thank_you', '/tak.html'], 'thanks.html': ['thank_you', '/thanks.html'],
    'en.html': ['home', '/en.html']
  };
  const page = routes[route] || ['home', '/'];
  const pageTitles = {home: 'Flow & Green', wedding: 'Flow & Green - Wedding music', corporate: 'Flow & Green - Company events', privacy: 'Flow & Green - Privacy', thank_you: 'Flow & Green - Thank you'};
  const safeLocation = location.origin + page[1];
  // Even the referring path could contain an identifier; no referrer is sent.
  const safePage = {page_location: safeLocation, page_referrer: '', page_title: pageTitles[page[0]], page_id: page[0], language};
  let googleState = 'not_requested';
  let metaState = 'not_requested';
  let googleStarted = false;
  let gaConfigured = false;
  let adsConfigured = false;
  let metaConfigured = false;
  let pageViewQueued = false;
  let previous = {analytics: false, marketing: false, media: false};
  const counts = Object.create(null);
  function has(key) { return Boolean(consent?.has(key)); }
  function cleanLabel(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value) ||
        /\d{7,}|https?|www\.|(?:@|%40)/i.test(value) || !/[A-Za-z]/.test(value)) return '';
    return value;
  }
  function readLabels(input) {
    const result = {};
    campaignKeys.forEach(key => { const value = cleanLabel(input?.[key]); if (value) result[key] = value; });
    return result;
  }
  const search = new URLSearchParams(location.search);
  const initialCampaign = readLabels(Object.fromEntries(campaignKeys.map(key => [key, search.get(key)])));
  let campaign = {};
  let campaignSavedAt = 0;
  function clearAttribution() {
    campaign = {};
    campaignSavedAt = 0;
    try { sessionStorage.removeItem(CAMPAIGN_KEY); } catch (_) { /* Storage may be blocked. */ }
  }
  function updateAttribution() {
    if (!has('analytics')) { clearAttribution(); return; }
    if (campaignSavedAt) {
      if (Date.now() - campaignSavedAt >= SESSION_AGE) clearAttribution();
      return;
    }
    let stored = {};
    let savedAt = 0;
    try {
      const item = JSON.parse(sessionStorage.getItem(CAMPAIGN_KEY));
      if (item && Number.isFinite(item.savedAt) && item.savedAt <= Date.now() && Date.now() - item.savedAt < SESSION_AGE) {
        stored = readLabels(item.labels); savedAt = item.savedAt;
      } else sessionStorage.removeItem(CAMPAIGN_KEY);
    } catch (_) { /* An invalid stored campaign is ignored. */ }
    campaign = Object.keys(initialCampaign).length ? {...initialCampaign} : stored;
    if (Object.keys(campaign).length) {
      campaignSavedAt = Object.keys(initialCampaign).length ? Date.now() : savedAt;
      try { sessionStorage.setItem(CAMPAIGN_KEY, JSON.stringify({savedAt: campaignSavedAt, labels: campaign})); } catch (_) { /* In-memory attribution still works. */ }
    }
  }
  function attribution() {
    if (!has('analytics')) return {};
    if (campaignSavedAt && Date.now() - campaignSavedAt >= SESSION_AGE) clearAttribution();
    return {...campaign};
  }
  function gaCampaign() {
    const names = {utm_source: 'campaign_source', utm_medium: 'campaign_medium', utm_campaign: 'campaign_name', utm_content: 'campaign_content', utm_term: 'campaign_term'};
    return Object.fromEntries(Object.entries(attribution()).map(([key, value]) => [names[key], value]));
  }
  function safeParams(params) {
    const output = {page_id: page[0], language};
    Object.entries(enums).forEach(([key, values]) => {
      if (typeof params?.[key] === 'string' && values.includes(params[key])) output[key] = params[key];
    });
    return output;
  }
  function tag() { window.dataLayer.push(arguments); }
  function googleConsent(state) {
    return {analytics_storage: state.analytics ? 'granted' : 'denied', ad_storage: state.marketing ? 'granted' : 'denied', ad_user_data: state.marketing ? 'granted' : 'denied', ad_personalization: state.marketing ? 'granted' : 'denied'};
  }
  function script(id, src, onload, onerror) {
    const node = document.createElement('script'); node.id = id; node.async = true; node.src = src; node.referrerPolicy = 'origin';
    node.onload = onload; node.onerror = onerror; document.head.append(node);
  }
  function queueGoogleEvent(name, params, target) {
    if (!googleStarted || googleState === 'blocked') return false;
    tag('event', name, {...safePage, ...gaCampaign(), ...params, send_to: target});
    counts[name] = (counts[name] || 0) + 1;
    return true;
  }
  function syncGoogle(state) {
    const gaAllowed = Boolean(gaId && state.analytics);
    const adsAllowed = Boolean(adsId && state.marketing);
    if (gaId) window['ga-disable-' + gaId] = !gaAllowed;
    const revoked = (previous.analytics && !state.analytics) || (previous.marketing && !state.marketing);
    if (revoked && googleStarted && Array.isArray(window.dataLayer)) {
      window.dataLayer.length = 0;
      // Pending permitted events are discarded, never replayed after withdrawal.
      if (googleState === 'loading') { gaConfigured = false; adsConfigured = false; pageViewQueued = false; }
    }
    if (!googleStarted && (gaAllowed || adsAllowed)) {
      window.dataLayer = [];
      window.gtag = tag;
      tag('consent', 'default', googleConsent({analytics: false, marketing: false}));
      tag('set', 'url_passthrough', false);
      tag('set', 'ads_data_redaction', true);
      tag('set', safePage);
      tag('js', new Date());
      googleStarted = true;
      googleState = 'loading';
      script('fg-google-tag', 'https://www.googletagmanager.com/gtag/js?id=' + (gaAllowed ? gaId : adsId), () => { googleState = 'loaded'; }, () => { googleState = 'blocked'; window.dataLayer.length = 0; });
    }
    if (!googleStarted) return;
    tag('consent', 'update', googleConsent(state));
    tag('set', {allow_google_signals: false, allow_ad_personalization_signals: state.marketing, ...safePage, ...gaCampaign()});
    if (gaAllowed && !gaConfigured) {
      tag('config', gaId, {send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: state.marketing, cookie_expires: 180 * 24 * 60 * 60, cookie_update: false, ...safePage, ...gaCampaign()});
      gaConfigured = true;
    }
    if (adsAllowed && !adsConfigured) {
      tag('config', adsId, {send_page_view: false, allow_ad_personalization_signals: true, ...safePage});
      adsConfigured = true;
    }
    if (gaAllowed && !pageViewQueued) {
      pageViewQueued = queueGoogleEvent('page_view', {}, gaId);
    }
  }
  function syncMeta(state) {
    if (!metaId) return;
    if (!state.marketing) {
      if (metaConfigured && typeof window.fbq === 'function') {
        if (Array.isArray(window.fbq.queue)) {
          window.fbq.queue = [['consent', 'revoke'], ['set', 'autoConfig', false, metaId], ['init', metaId]];
        }
        window.fbq('consent', 'revoke');
      }
      return;
    }
    if (!metaConfigured) {
      // No automatic PageView or automatic form/button event collection.
      const pixel = function () {
        if (pixel.callMethod) pixel.callMethod.apply(pixel, arguments);
        else pixel.queue.push(Array.from(arguments));
      };
      pixel.queue = []; pixel.loaded = true; pixel.version = '2.0'; pixel.push = pixel;
      window.fbq = pixel; window._fbq = pixel;
      pixel('consent', 'grant'); pixel('set', 'autoConfig', false, metaId); pixel('init', metaId);
      metaConfigured = true; metaState = 'loading';
      script('fg-meta-pixel', 'https://connect.facebook.net/en_US/fbevents.js', () => { metaState = 'loaded'; }, () => { metaState = 'blocked'; pixel.queue.length = 0; });
    } else window.fbq('consent', 'grant');
  }
  function track(name, params = {}) {
    if (!eventNames.has(name)) return false;
    const gaAllowed = Boolean(gaId && has('analytics') && googleStarted && googleState !== 'blocked');
    const adsAllowed = Boolean(name === 'generate_lead' && adsId && adsLabel && has('marketing') && googleStarted && googleState !== 'blocked');
    const metaAllowed = Boolean(name === 'generate_lead' && metaId && has('marketing') && metaConfigured && metaState !== 'blocked');
    if (!gaAllowed && !adsAllowed && !metaAllowed) return false;
    const safe = safeParams(params);
    // The form controller owns submission deduplication and calls this only once
    // after a confirmed success. A deliberate new enquiry must count separately.
    let queued = false;
    if (gaAllowed) queued = queueGoogleEvent(name, safe, gaId) || queued;
    if (adsAllowed) queued = queueGoogleEvent('conversion', safe, adsId + '/' + adsLabel) || queued;
    if (metaAllowed) {
      window.fbq('trackSingle', metaId, 'Lead', {content_name: safe.page_id, content_category: safe.occasion || 'undecided'});
      counts.meta_lead = (counts.meta_lead || 0) + 1; queued = true;
    }
    return queued;
  }
  window.FlowGreenAnalytics = Object.freeze({
    track,
    attribution,
    inspect: () => ({configured: {ga4: Boolean(gaId), googleAds: Boolean(adsId && adsLabel), meta: Boolean(metaId)}, consent: consent?.get() || {analytics: false, marketing: false, media: false, decided: false}, googleScript: googleState, metaScript: metaState, eventsQueued: {...counts}})
  });
  consent?.subscribe(state => {
    updateAttribution();
    syncGoogle(state);
    syncMeta(state);
    previous = {...state};
  });
})();
