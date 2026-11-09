'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSubmissionController, safeCampaign, cleanOccasion } = require('../assets/redesign.js');
function harness(fetchImpl, overrides = {}) {
  const events = [], states = [], payloads = [], timers = [];
  let serial = 0;
  const formValues = { name: 'Test Name', email: 'test@example.invalid', message: 'A private message' };
  const controller = createSubmissionController({
    action: 'https://formspree.invalid/test', baseParams: { page_id: 'wedding', language: 'da', form_id: 'booking' },
    fetch: fetchImpl, AbortController,
    setTimeout(fn) { timers.push(fn); return timers.length - 1; }, clearTimeout() {},
    createReference() { return `FG-test-${++serial}`; },
    getOccasion() { return 'wedding'; },
    buildPayload(reference) { const data = { ...formValues, reference }; payloads.push(data); return data; },
    track(name, params) { events.push({ name, params }); },
    onState(state) { states.push(state); },
    ...overrides
  });
  return { controller, events, states, payloads, timers, formValues };
}
const success = () => Promise.resolve({ ok: true, json: async () => ({ ok: true }) });

test('one confirmed server response creates exactly one lead, including double clicks', async () => {
  let resolve, calls = 0;
  const h = harness(() => { calls++; return new Promise(r => { resolve = r; }); });
  const first = h.controller.submit();
  assert.equal(h.events.filter(e => e.name === 'generate_lead').length, 0);
  assert.deepEqual(await h.controller.submit(), { ignored: true });
  resolve({ ok: true, json: async () => ({ ok: true }) });
  assert.equal((await first).success, true);
  assert.equal(calls, 1);
  assert.equal(h.events.filter(e => e.name === 'generate_lead').length, 1);
  assert.deepEqual(await h.controller.submit(), { ignored: true });
  assert.equal(h.events.filter(e => e.name === 'generate_lead').length, 1);
  assert.equal(h.states.some(s => s.type === 'success'), true);
});

test('a rejected response never creates a lead and retry preserves values/reference', async () => {
  let calls = 0;
  const h = harness(() => ++calls === 1 ? Promise.resolve({ ok: false }) : success());
  const before = { ...h.formValues };
  const failed = await h.controller.submit();
  assert.equal(failed.errorType, 'server');
  assert.deepEqual(h.formValues, before);
  assert.equal(h.events.some(e => e.name === 'generate_lead'), false);
  const retried = await h.controller.submit();
  assert.equal(retried.success, true);
  assert.equal(retried.reference, failed.reference);
  assert.deepEqual(h.payloads[0], h.payloads[1]);
  assert.equal(h.events.filter(e => e.name === 'form_start').length, 1);
});

test('JSON error bodies and malformed successful responses are not confirmed leads', async () => {
  for (const response of [
    { ok: true, json: async () => ({ errors: [{ message: 'Secret backend detail' }] }) },
    { ok: true, json: async () => ({ ok: false }) },
    { ok: true, json: async () => { throw new Error('Invalid JSON'); } }
  ]) {
    const h = harness(async () => response);
    assert.equal((await h.controller.submit()).errorType, 'server');
    assert.equal(h.events.some(e => e.name === 'generate_lead'), false);
  }
});

test('network failures and timeouts retain data, recover submit state and use safe error enums', async () => {
  const network = harness(async () => { throw new Error('Contact test@example.invalid failed'); });
  assert.equal((await network.controller.submit()).errorType, 'network');
  assert.equal(network.controller.isPending(), false);
  assert.equal(network.formValues.email, 'test@example.invalid');
  const timeout = harness((_, init) => new Promise((resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(Object.assign(new Error('timeout'), { name: 'AbortError' })));
  }));
  const pending = timeout.controller.submit();
  timeout.timers[0]();
  assert.equal((await pending).errorType, 'timeout');
  assert.equal(timeout.controller.isPending(), false);
  assert.equal(timeout.states.at(-1).type, 'complete');
  assert.equal(timeout.events.at(-1).params.error_type, 'timeout');
  assert.equal(timeout.events.some(e => e.name === 'generate_lead'), false);
});

test('analytics payloads never include form values or backend errors', async () => {
  const h = harness(success);
  await h.controller.submit();
  const data = JSON.stringify(h.events);
  for (const privateValue of Object.values(h.formValues)) assert.equal(data.includes(privateValue), false);
  assert.deepEqual(h.events.find(e => e.name === 'generate_lead').params, { page_id: 'wedding', language: 'da', form_id: 'booking', occasion: 'wedding' });
});

test('tracking failures cannot turn a successful enquiry into an error', async () => {
  const h = harness(success, { track() { throw new Error('Analytics blocked'); } });
  assert.equal((await h.controller.submit()).success, true);
  assert.equal(h.states.some(s => s.type === 'error'), false);
});

test('new enquiry resets reference and one-time start/lead state', async () => {
  const h = harness(success);
  h.controller.start(); h.controller.start();
  const first = await h.controller.submit();
  assert.equal(h.controller.reset(), true);
  const second = await h.controller.submit();
  assert.notEqual(first.reference, second.reference);
  assert.equal(h.events.filter(e => e.name === 'form_start').length, 2);
  assert.equal(h.events.filter(e => e.name === 'generate_lead').length, 2);
});

test('campaign labels and occasion values cannot transport email, URLs or arbitrary values', () => {
  assert.equal(safeCampaign('bryllup_search_2026'), 'bryllup_search_2026');
  for (const unsafe of ['test@example.invalid', 'https://example.invalid', '1234567890123', 'a'.repeat(101), 'line\nbreak', '<script>']) assert.equal(safeCampaign(unsafe), '');
  assert.equal(cleanOccasion('corporate'), 'corporate');
  assert.equal(cleanOccasion('A private message'), 'other');
});


test('honeypot submissions produce no request and no lead event', async () => {
  let calls = 0;
  const h = harness(async () => { calls++; return success(); }, { shouldIgnore: () => true });
  assert.deepEqual(await h.controller.submit(), { ignored: true });
  assert.equal(calls, 0);
  assert.deepEqual(h.events, []);
  assert.deepEqual(h.states, []);
});

// Minimal inert DOM: it records iframe creation without a browser or remote requests.
function mediaFixture(withConsent = true) {
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.attributes = {}; this.className = ''; this.parentElement = null; }
    get classList() {
      return {
        contains: name => this.className.split(/\s+/).includes(name),
        add: name => { if (!this.classList.contains(name)) this.className += ' ' + name; },
        remove: name => { this.className = this.className.split(/\s+/).filter(x => x !== name).join(' '); },
        toggle: (name, yes) => yes ? this.classList.add(name) : this.classList.remove(name)
      };
    }
    setAttribute(name, value) { this.attributes[name] = value; if (name === 'data-load-video') this.dataset.loadVideo = value; }
    getAttribute(name) { return this.attributes[name] || null; }
    hasAttribute(name) { return Object.hasOwn(this.attributes, name); }
    append(...nodes) { for (const node of nodes) { this.children.push(node); node.parentElement = this; } }
    replaceChildren(...nodes) { this.children.forEach(x => { x.parentElement = null; }); this.children = []; this.append(...nodes); }
    matches(selector) {
      if (selector === 'iframe' || selector === 'a') return this.tagName === selector;
      if (selector === '[data-load-video]') return this.hasAttribute('data-load-video');
      if (selector === '.video[data-video-id]') return this.classList.contains('video') && !!this.dataset.videoId;
      if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
      return false;
    }
    closest(selector) { return this.matches(selector) ? this : this.parentElement ? this.parentElement.closest(selector) : null; }
    querySelector(selector) {
      for (const child of this.children) { if (child.matches(selector)) return child; const nested = child.querySelector(selector); if (nested) return nested; }
      return null;
    }
  }
  const wrapper = new Element('div'); wrapper.className = 'video'; wrapper.dataset.videoId = 'V8LUhAyzS6U';
  const listeners = {};
  const body = new Element('body'); body.dataset.pageId = 'home'; body.append(wrapper);
  const doc = {
    documentElement: { lang: 'da' }, body,
    querySelector() { return null; },
    querySelectorAll(selector) { return selector === '.video[data-video-id]' ? [wrapper] : []; },
    createElement: tag => new Element(tag),
    createTextNode: text => Object.assign(new Element('#text'), { textContent: text }),
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); }
  };
  let prefs = { analytics: false, marketing: false, media: false };
  const subscribers = [], events = [];
  const win = {
    document: doc,
    FlowGreenAnalytics: { track: (name, params) => events.push({ name, params }) }
  };
  if (withConsent) win.FlowGreenConsent = {
    get: () => ({ ...prefs }), has: key => prefs[key] === true,
    set(value) { prefs = { ...value }; subscribers.forEach(fn => fn()); },
    subscribe(fn) { subscribers.push(fn); }
  };
  require('../assets/redesign.js').init(win);
  return {
    wrapper, win, events,
    clickPlay() { const button = wrapper.querySelector('[data-load-video]'); for (const fn of listeners.click || []) fn({ target: button }); }
  };
}

test('YouTube stays unloaded until an informed play click, and withdrawal removes it', () => {
  const h = mediaFixture();
  assert.equal(h.wrapper.querySelector('iframe'), null);
  assert.equal(h.wrapper.querySelector('.video-poster').src, 'assets/video-poster.webp');
  assert.equal(h.events.length, 0);
  h.clickPlay();
  const frame = h.wrapper.querySelector('iframe');
  assert.equal(frame.src, 'https://www.youtube-nocookie.com/embed/V8LUhAyzS6U?rel=0&autoplay=1');
  assert.deepEqual(h.win.FlowGreenConsent.get(), { analytics: false, marketing: false, media: true });
  assert.equal(h.events[0].name, 'video_start');
  h.win.FlowGreenConsent.set({ analytics: false, marketing: false, media: false });
  assert.equal(h.wrapper.querySelector('iframe'), null);
  assert.ok(h.wrapper.querySelector('[data-load-video]'));
});

test('a missing consent script fails closed and leaves the local video placeholder', () => {
  const h = mediaFixture(false);
  h.clickPlay();
  assert.equal(h.wrapper.querySelector('iframe'), null);
  assert.ok(h.wrapper.querySelector('.video-poster'));
  assert.equal(h.events.length, 0);
});
