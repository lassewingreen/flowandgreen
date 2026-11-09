/* Run with Node: node tests/measurement.test.cjs. No network or real analytics. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const consentSource = fs.readFileSync(path.join(root, 'assets/consent.js'), 'utf8');
const measurementSource = fs.readFileSync(path.join(root, 'assets/measurement.js'), 'utf8');
const configSource = fs.readFileSync(path.join(root, 'assets/analytics-config.js'), 'utf8');
const normalized = value => JSON.parse(JSON.stringify(value));

function boot({config, url = 'https://flowandgreen.dk/bryllup.html', storedConsent, storedCampaign, blockedStorage = false, cookies = ''} = {}) {
  class Target {
    constructor() { this.handlers = new Map(); this.attrs = {}; this.hidden = true; this.open = false; }
    addEventListener(type, fn) { if (!this.handlers.has(type)) this.handlers.set(type, []); this.handlers.get(type).push(fn); }
    dispatchEvent(event) { (this.handlers.get(event.type) || []).forEach(fn => fn(event)); }
    setAttribute(key, value) { this.attrs[key] = value; }
    removeAttribute(key) { delete this.attrs[key]; }
    focus() { document.activeElement = this; }
    querySelector() { return inputs.analytics; }
    showModal() { this.open = true; }
    close() { this.open = false; this.dispatchEvent({type: 'close'}); }
  }
  const inputs = Object.fromEntries(['analytics', 'marketing', 'media'].map(key => [key, new Target()]));
  const nodes = Object.fromEntries(['consent-banner', 'consent-settings', 'consent-form'].map(id => [id, new Target()]));
  nodes['consent-form'].elements = {namedItem: name => inputs[name]};
  const buttons = Object.fromEntries(['open', 'close', 'accept', 'reject'].map(key => [`[data-consent-${key}]`, new Target()]));
  const insertedScripts = [];
  const deletedCookies = [];
  const cookieJar = new Map(cookies.split(';').filter(Boolean).map(part => part.trim().split('=')));
  const document = new Target();
  document.documentElement = {lang: 'da'};
  document.activeElement = buttons['[data-consent-open]'];
  document.referrer = 'https://other.example/people/alice?email=alice@example.com';
  document.title = 'Untrusted alice@example.com';
  document.head = {append(node) { insertedScripts.push(node); }};
  document.createElement = () => new Target();
  document.getElementById = id => nodes[id] || null;
  document.querySelectorAll = selector => buttons[selector] ? [buttons[selector]] : [];
  Object.defineProperty(document, 'cookie', {
    get: () => [...cookieJar].map(([key, value]) => `${key}=${value}`).join('; '),
    set: value => { const name = value.split('=')[0]; if (value.includes('Max-Age=0')) { cookieJar.delete(name); deletedCookies.push(name); } }
  });
  function storage(initial) {
    const values = new Map(Object.entries(initial));
    const calls = {get: [], set: [], remove: []};
    return {
      calls, values,
      getItem(key) { calls.get.push(key); if (blockedStorage) throw new Error('blocked'); return values.get(key) || null; },
      setItem(key, value) { calls.set.push([key, value]); if (blockedStorage) throw new Error('blocked'); values.set(key, value); },
      removeItem(key) { calls.remove.push(key); if (blockedStorage) throw new Error('blocked'); values.delete(key); }
    };
  }
  const localStorage = storage(storedConsent ? {fg_consent_v1: storedConsent} : {});
  const sessionStorage = storage(storedCampaign ? {fg_campaign_v1: storedCampaign} : {});
  let now = Date.now();
  class TestDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const context = {document, location: new URL(url), localStorage, sessionStorage, URLSearchParams, URL, Date: TestDate, console,
    CustomEvent: class { constructor(type, detail) { this.type = type; Object.assign(this, detail); } }};
  context.window = context;
  const windowEvents = new Target();
  context.addEventListener = windowEvents.addEventListener.bind(windowEvents);
  context.dispatchEvent = windowEvents.dispatchEvent.bind(windowEvents);
  vm.createContext(context);
  if (config) context.FlowGreenConfig = config; else vm.runInContext(configSource, context);
  vm.runInContext(consentSource, context);
  vm.runInContext(measurementSource, context);
  return {w: context, scripts: insertedScripts, localStorage, sessionStorage, nodes, inputs, buttons, deletedCookies,
    advance: ms => { now += ms; }, commands: () => (context.dataLayer || []).map(args => Array.from(args))};
}
const accepted = {analytics: true, marketing: true, media: true};
const analyticsOnly = {analytics: true, marketing: false, media: false};
const refused = {analytics: false, marketing: false, media: false};
const configured = {measurementId: 'G-TEST12345', googleAdsId: 'AW-1234567', googleAdsLeadLabel: 'safe_label', metaPixelId: '123456789'};
let passed = 0;
function test(name, callback) { callback(); passed++; console.log('ok - ' + name); }

test('empty account configuration never loads a vendor, even after consent', () => {
  const b = boot();
  b.w.FlowGreenConsent.set(accepted);
  assert.equal(b.scripts.length, 0);
  assert.equal(b.w.FlowGreenAnalytics.track('generate_lead', {form_id: 'booking'}), false);
  assert.equal(b.w.FlowGreenAnalytics.inspect().configured.ga4, false);
});
test('configured vendors and supplied UTM parameters stay inactive before opt-in', () => {
  const b = boot({config: configured, url: 'https://flowandgreen.dk/?utm_source=instagram&utm_campaign=bryllup-2027&gclid=12345'});
  assert.equal(b.scripts.length, 0);
  assert.equal(b.commands().length, 0);
  assert.equal(b.sessionStorage.calls.get.length, 0);
  assert.equal(b.sessionStorage.calls.set.length, 0);
  assert.equal(b.nodes['consent-banner'].hidden, false);
  assert.equal(b.w.FlowGreenAnalytics.track('booking_cta_click', {placement: 'hero'}), false);
  b.w.FlowGreenConsent.set(refused);
  assert.equal(b.scripts.length, 0);
  assert.equal(b.commands().length, 0);
  assert.equal(b.nodes['consent-banner'].hidden, true);
});
test('media-only consent loads no analytics or marketing vendor', () => {
  const b = boot({config: configured});
  b.w.FlowGreenConsent.set({media: true});
  assert.equal(b.scripts.length, 0);
  assert.equal(b.w.FlowGreenConsent.has('media'), true);
  assert.deepEqual(normalized(b.w.FlowGreenAnalytics.attribution()), {});
});
test('Google consent defaults precede configuration and only explicit GA pageview is queued', () => {
  const b = boot({config: configured}); b.w.FlowGreenConsent.set(analyticsOnly);
  assert.equal(b.scripts.length, 1); assert.match(b.scripts[0].src, /gtag\/js\?id=G-TEST12345$/);
  const cmds = b.commands();
  assert.equal(cmds[0][0], 'consent'); assert.equal(cmds[0][1], 'default');
  assert.equal(cmds[0][2].analytics_storage, 'denied');
  const cfg = cmds.find(c => c[0] === 'config');
  assert.equal(cfg[1], 'G-TEST12345'); assert.equal(cfg[2].send_page_view, false);
  assert.equal(cfg[2].cookie_expires, 180 * 86400); assert.equal(cfg[2].allow_google_signals, false);
  assert.equal(cfg[2].allow_ad_personalization_signals, false);
  assert.equal(cmds.filter(c => c[0] === 'event' && c[1] === 'page_view').length, 1);
  b.w.FlowGreenConsent.set(analyticsOnly);
  assert.equal(b.scripts.length, 1);
  assert.equal(b.commands().filter(c => c[0] === 'config' && c[1] === 'G-TEST12345').length, 1);
  assert.equal(b.commands().filter(c => c[0] === 'event' && c[1] === 'page_view').length, 1);
});
test('no raw query, referrer, title, form fields or unknown values enter GA payloads', () => {
  const b = boot({config: configured, url: 'https://flowandgreen.dk/bryllup.html?utm_source=instagram&utm_campaign=bryllup-2027&utm_medium=paid_social&utm_content=clip-01&utm_term=alice%40example.com&email=alice%40example.com&gclid=very-private#name=Alice'});
  b.w.FlowGreenConsent.set(analyticsOnly);
  assert.equal(b.w.FlowGreenAnalytics.track('generate_lead', {form_id: 'booking', occasion: 'wedding', placement: 'form', name: 'Alice', email: 'alice@example.com', message: 'Private message', page_location: 'https://bad.example/?email=Alice', content_id: 'alice@example.com', method: 'alice@example.com'}), true);
  const serialized = JSON.stringify(b.commands());
  for (const secret of ['alice', 'Private message', 'gclid', 'very-private', 'bad.example', 'other.example', '#name']) assert.ok(!serialized.includes(secret), secret);
  const lead = b.commands().find(c => c[0] === 'event' && c[1] === 'generate_lead')[2];
  assert.equal(lead.page_location, 'https://flowandgreen.dk/bryllup.html'); assert.equal(lead.page_referrer, '');
  assert.equal(lead.campaign_name, 'bryllup-2027'); assert.equal(lead.campaign_source, 'instagram');
  assert.equal(lead.occasion, 'wedding'); assert.equal(lead.content_id, undefined);
  assert.deepEqual(normalized(b.w.FlowGreenAnalytics.attribution()), {utm_source: 'instagram', utm_medium: 'paid_social', utm_campaign: 'bryllup-2027', utm_content: 'clip-01'});
});
test('unsafe campaign values and arbitrary event names are discarded', () => {
  const b = boot({config: configured, url: 'https://flowandgreen.dk/?utm_source=https%3A%2F%2Fexample.com&utm_medium=1234567890&utm_campaign=Anne%20Jensen&utm_content=alice%40example.com&utm_term=1234567890'});
  b.w.FlowGreenConsent.set(analyticsOnly);
  assert.deepEqual(normalized(b.w.FlowGreenAnalytics.attribution()), {});
  assert.equal(b.w.FlowGreenAnalytics.track('form_input', {name: 'Alice'}), false);
  assert.equal(b.w.FlowGreenAnalytics.track('alice@example.com'), false);
});
test('campaign context expires after thirty minutes even while the page remains open', () => {
  const b = boot({config: configured, url: 'https://flowandgreen.dk/?utm_source=google&utm_campaign=bryllup-2027'});
  b.w.FlowGreenConsent.set(analyticsOnly);
  assert.equal(b.w.FlowGreenAnalytics.attribution().utm_source, 'google');
  b.advance(30 * 60 * 1000 + 1);
  assert.deepEqual(normalized(b.w.FlowGreenAnalytics.attribution()), {});
  assert.equal(b.sessionStorage.values.has('fg_campaign_v1'), false);
});
test('withdrawal clears attribution, optional cookies and pending hits; future sends are refused', () => {
  const b = boot({config: configured, url: 'https://flowandgreen.dk/?utm_source=google', cookies: '_ga=old; _ga_TEST=old; _gcl_au=old; _fbp=old; necessary=yes'});
  b.w.FlowGreenConsent.set(analyticsOnly);
  assert.ok(b.sessionStorage.values.has('fg_campaign_v1'));
  b.w.FlowGreenAnalytics.track('form_start', {form_id: 'booking'});
  b.w.FlowGreenConsent.set(refused);
  assert.deepEqual(normalized(b.w.FlowGreenAnalytics.attribution()), {});
  assert.equal(b.sessionStorage.values.has('fg_campaign_v1'), false);
  assert.equal(b.w['ga-disable-G-TEST12345'], true);
  assert.equal(b.commands().filter(c => c[0] === 'event').length, 0);
  assert.equal(b.w.FlowGreenAnalytics.track('generate_lead', {form_id: 'booking'}), false);
  for (const name of ['_ga', '_ga_TEST', '_gcl_au', '_fbp']) assert.ok(b.deletedCookies.includes(name));
  assert.ok(!b.deletedCookies.includes('necessary'));
});
test('renewed consent during a pending script load restores config without replaying earlier actions', () => {
  const b = boot({config: configured}); b.w.FlowGreenConsent.set(analyticsOnly);
  b.w.FlowGreenAnalytics.track('form_start', {form_id: 'booking'});
  b.w.FlowGreenConsent.set(refused); b.w.FlowGreenConsent.set(analyticsOnly);
  assert.equal(b.scripts.length, 1);
  assert.equal(b.commands().filter(c => c[0] === 'config' && c[1] === 'G-TEST12345').length, 1);
  assert.equal(b.commands().filter(c => c[0] === 'event' && c[1] === 'form_start').length, 0);
  assert.equal(b.commands().filter(c => c[0] === 'event' && c[1] === 'page_view').length, 1);
});
test('valid stored consent is reused and expired or invalid preferences are rejected', () => {
  const valid = JSON.stringify({...analyticsOnly, version: 1, savedAt: Date.now()});
  const b = boot({config: configured, storedConsent: valid});
  assert.equal(b.scripts.length, 1); assert.equal(b.nodes['consent-banner'].hidden, true);
  for (const value of ['not json', JSON.stringify({...accepted, version: 1, savedAt: Date.now() - 181 * 86400000}), JSON.stringify({...accepted, version: 1, savedAt: Date.now() + 86400000})]) {
    const invalid = boot({config: configured, storedConsent: value});
    assert.equal(invalid.scripts.length, 0); assert.equal(invalid.nodes['consent-banner'].hidden, false);
  }
});
test('blocked storage and blocked scripts fail safely without preventing preferences', () => {
  const b = boot({config: configured, blockedStorage: true});
  b.w.FlowGreenConsent.set(analyticsOnly); assert.equal(b.w.FlowGreenConsent.has('analytics'), true);
  b.scripts[0].onerror();
  assert.equal(b.w.FlowGreenAnalytics.inspect().googleScript, 'blocked');
  assert.equal(b.w.FlowGreenAnalytics.track('form_start', {form_id: 'booking'}), false);
  b.w.FlowGreenConsent.set(refused); assert.equal(b.w.FlowGreenConsent.has('analytics'), false);
});
test('settings dialog can be opened, saved and reopened without initial focus stealing', () => {
  const b = boot(); const opener = b.w.document.activeElement;
  assert.equal(b.w.document.activeElement, opener);
  b.buttons['[data-consent-open]'].dispatchEvent({type: 'click'}); assert.equal(b.nodes['consent-settings'].open, true);
  b.inputs.analytics.checked = true; b.inputs.marketing.checked = false; b.inputs.media.checked = true;
  b.nodes['consent-form'].dispatchEvent({type: 'submit', preventDefault() {}});
  assert.equal(b.nodes['consent-settings'].open, false); assert.equal(b.w.document.activeElement, opener);
  assert.equal(b.w.FlowGreenConsent.has('analytics'), true); assert.equal(b.w.FlowGreenConsent.has('marketing'), false);
  b.w.FlowGreenConsent.open(); assert.equal(b.inputs.analytics.checked, true);
});
test('marketing adapters remain independent of GA and only confirmed lead calls become conversions', () => {
  const b = boot({config: configured}); b.w.FlowGreenConsent.set({marketing: true});
  assert.equal(b.scripts.length, 2);
  assert.equal(b.commands().filter(c => c[0] === 'config' && c[1] === 'G-TEST12345').length, 0);
  b.w.FlowGreenAnalytics.track('form_start', {form_id: 'booking'});
  assert.equal(b.commands().filter(c => c[0] === 'event').length, 0);
  b.w.FlowGreenAnalytics.track('generate_lead', {form_id: 'booking', occasion: 'private'});
  assert.equal(b.commands().filter(c => c[0] === 'event' && c[1] === 'conversion').length, 1);
  const metaLead = b.w.fbq.queue.find(c => c[0] === 'trackSingle');
  assert.equal(metaLead[2], 'Lead'); assert.equal(metaLead[3].content_category, 'private');
  b.w.FlowGreenConsent.set(refused);
  assert.equal(b.w.fbq.queue.filter(c => c[0] === 'trackSingle').length, 0);
  assert.equal(b.w.FlowGreenAnalytics.track('generate_lead'), false);
});
test('new confirmed enquiries can count; form controller owns submission deduplication', () => {
  const b = boot({config: configured}); b.w.FlowGreenConsent.set(analyticsOnly);
  assert.equal(b.w.FlowGreenAnalytics.track('generate_lead', {form_id: 'booking'}), true);
  assert.equal(b.w.FlowGreenAnalytics.track('generate_lead', {form_id: 'booking'}), true);
  assert.equal(b.commands().filter(c => c[0] === 'event' && c[1] === 'generate_lead').length, 2);
});
console.log(`${passed} measurement/consent checks passed; no network was used.`);
