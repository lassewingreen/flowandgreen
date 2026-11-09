/* Booking interactions stay functional independently of optional analytics. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) api.init(root);
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  const occasions = ['wedding', 'corporate', 'private', 'reception', 'other'];
  const pages = ['home', 'wedding', 'corporate', 'privacy'];
  const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const moreVideoIds = ['nTXc2jLasTk', 'tmO2kSr5Z-A', '55hYRbOOsTs', 'Hxuq_dIlwbg', 'RbwEQH1w2vY', 'cQWwQzBzzdM', 'ONgc1nw_E80', 'OGhZqn3MN5k', 'R6Y3tNKzxrA', 'wGW2uoGRiz4', 'cpNLeynOz6w'];
  const invoke = (fn, ...args) => { try { return typeof fn === 'function' ? fn(...args) : undefined; } catch (_) { return undefined; } };
  const cleanOccasion = value => occasions.includes(value) ? value : 'other';
  const safeCampaign = value => typeof value === 'string' && /^[a-zA-Z0-9_.-]{1,100}$/.test(value) && !/\d{12,}/.test(value) ? value : '';

  // Transport can be tested without sending a message or loading an analytics tag.
  function createSubmissionController(options) {
    let pending = false;
    let completed = false;
    let started = false;
    let reference = '';
    const track = (event, extra) => invoke(options.track, event, Object.assign({}, options.baseParams, extra || {}));
    function start() {
      if (started || completed) return;
      started = true;
      track('form_start');
    }
    async function submit() {
      if (pending || completed || invoke(options.shouldIgnore)) return { ignored: true };
      start();
      pending = true;
      reference = reference || options.createReference();
      const occasion = cleanOccasion(invoke(options.getOccasion));
      const controller = new options.AbortController();
      let timedOut = false;
      const timeout = options.setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs || 20000);
      invoke(options.onState, { type: 'pending', reference });
      let result;
      try {
        const response = await options.fetch(options.action, {
          method: 'POST', body: options.buildPayload(reference),
          headers: { Accept: 'application/json' }, signal: controller.signal
        });
        if (!response.ok) throw { kind: 'server' };
        let body;
        try { body = await response.json(); } catch (_) { throw { kind: 'server' }; }
        if (!body || body.ok === false || body.error || (Array.isArray(body.errors) && body.errors.length)) throw { kind: 'server' };
        completed = true;
        track('generate_lead', { occasion });
        invoke(options.onState, { type: 'success', reference });
        result = { success: true, reference };
      } catch (error) {
        const errorType = timedOut || (error && error.name === 'AbortError') ? 'timeout' : error && error.kind === 'server' ? 'server' : 'network';
        track('form_error', { error_type: errorType });
        invoke(options.onState, { type: 'error', errorType, reference });
        result = { success: false, errorType, reference };
      } finally {
        options.clearTimeout(timeout);
        pending = false;
        invoke(options.onState, { type: 'complete', success: completed });
      }
      return result;
    }
    function reset() {
      if (pending) return false;
      reference = ''; completed = false; started = false;
      return true;
    }
    return { submit, start, reset, isPending: () => pending, getReference: () => reference };
  }

  function init(win) {
    const doc = win.document;
    const english = doc.documentElement.lang === 'en';
    const language = english ? 'en' : 'da';
    const page = pages.includes(doc.body.dataset.pageId) ? doc.body.dataset.pageId : 'home';
    const baseParams = { page_id: page, language, form_id: 'booking' };
    const track = (name, params) => invoke(win.FlowGreenAnalytics && win.FlowGreenAnalytics.track, name, Object.assign({ page_id: page, language }, params || {}));
    const year = doc.querySelector('#year');
    if (year) year.textContent = String(new Date().getFullYear());
    const date = doc.querySelector('input[type="date"]');
    if (date) {
      const today = new Date();
      date.min = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
    }

    const form = doc.querySelector('#booking-form');
    if (form) {
      const button = form.querySelector('button[type="submit"]');
      const status = doc.querySelector('#form-status');
      const success = doc.querySelector('#form-success');
      const originalText = button ? button.textContent : '';
      const makeReference = () => 'FG-' + (win.crypto && typeof win.crypto.randomUUID === 'function' ? win.crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12));
      const messages = {
        pending: english ? 'Sending …' : 'Sender …',
        success: english ? 'Thanks — your enquiry has been received. We usually reply within 24 hours. Your date is only reserved once we have agreed on the booking.' : 'Tak — vi har modtaget jeres forespørgsel. Vi svarer typisk inden for 24 timer. Datoen er først reserveret, når vi har lavet en aftale.',
        error: english ? 'We could not confirm that your enquiry was sent. Your details are still here. Please try again or email flowandgreen@gmail.com.' : 'Vi kunne ikke bekræfte afsendelsen. Jeres oplysninger er stadig her. Prøv igen, eller skriv til flowandgreen@gmail.com.'
      };
      const controller = createSubmissionController({
        action: form.action, baseParams,
        fetch: (...args) => win.fetch(...args),
        AbortController: win.AbortController,
        setTimeout: win.setTimeout.bind(win), clearTimeout: win.clearTimeout.bind(win),
        createReference: makeReference,
        getOccasion: () => form.elements.namedItem('occasion') && form.elements.namedItem('occasion').value,
        shouldIgnore: () => { const trap = form.elements.namedItem('_gotcha'); return trap && String(trap.value || '').trim(); },
        buildPayload(reference) {
          const data = new win.FormData(form);
          // Remove any old campaign values if consent has since been withdrawn.
          [...data.keys()].filter(key => /^utm_/.test(key)).forEach(key => data.delete(key));
          data.set('landing_page', page);
          data.set('page_language', language);
          data.set('enquiry_reference', reference);
          if (win.FlowGreenConsent && win.FlowGreenConsent.has('analytics')) {
            const source = invoke(win.FlowGreenAnalytics && win.FlowGreenAnalytics.attribution) || {};
            campaignKeys.forEach(key => { const value = safeCampaign(source[key]); if (value) data.set(key, value); });
          }
          return data;
        },
        track,
        onState(state) {
          if (state.type === 'pending') {
            if (button) { button.disabled = true; button.textContent = messages.pending; }
            form.setAttribute('aria-busy', 'true');
            if (status) status.textContent = '';
          } else if (state.type === 'error') {
            if (status) status.textContent = messages.error;
          } else if (state.type === 'success') {
            form.reset();
            if (success) {
              const copy = success.querySelector('[data-success-message]');
              if (copy) copy.textContent = messages.success;
              const reference = success.querySelector('[data-enquiry-reference]');
              if (reference) reference.textContent = state.reference;
              success.hidden = false;
              form.hidden = true;
              success.focus({ preventScroll: true });
              success.scrollIntoView({ behavior: 'auto', block: 'center' });
            } else if (status) status.textContent = messages.success;
          } else if (state.type === 'complete') {
            if (button) { button.disabled = false; button.textContent = originalText; }
            form.removeAttribute('aria-busy');
          }
        }
      });
      const meaningfulInput = event => {
        const input = event.target;
        if (!input || !input.matches('input,select,textarea') || input.type === 'hidden' || input.name === '_gotcha') return;
        if (input.type === 'checkbox' ? input.checked : String(input.value || '').trim()) controller.start();
      };
      form.addEventListener('input', meaningfulInput);
      form.addEventListener('change', meaningfulInput);
      form.addEventListener('submit', event => {
        event.preventDefault();
        if (typeof form.checkValidity === 'function' && !form.checkValidity()) { form.reportValidity(); return; }
        controller.submit();
      });
      doc.querySelectorAll('[data-new-enquiry]').forEach(control => control.addEventListener('click', () => {
        if (!controller.reset()) return;
        form.reset(); form.hidden = false;
        if (success) success.hidden = true;
        if (status) status.textContent = '';
        const firstInput = form.querySelector('input[name="name"]');
        if (firstInput) firstInput.focus();
      }));
    }

    const contact = doc.querySelector('#kontakt');
    if (contact && 'IntersectionObserver' in win) {
      const contactObserver = new win.IntersectionObserver(entries => {
        entries.forEach(entry => doc.body.classList.toggle('booking-visible', entry.isIntersecting));
      }, { threshold: 0 });
      contactObserver.observe(contact);
    }

    // Normal links continue to work if tracking is unavailable or declined.
    doc.addEventListener('click', event => {
      const link = event.target.closest && event.target.closest('a');
      if (!link) return;
      if (link.hasAttribute('data-booking-cta')) {
        const placement = /^[a-z_]{1,40}$/.test(link.dataset.placement || '') ? link.dataset.placement : 'page';
        track('booking_cta_click', { placement });
      }
      const href = link.getAttribute('href') || '';
      let method;
      if (href.startsWith('mailto:')) method = 'email';
      else if (/^https:\/\/(m\.me|www\.messenger\.com)\//i.test(href)) method = 'messenger';
      else if (/^https:\/\/(www\.)?eventzonen\.dk\//i.test(href) && (link.closest('#kontakt') || link.dataset.contactMethod === 'eventzonen')) method = 'eventzonen';
      if (method) track('contact_click', { method });
      if (link.hasAttribute('data-repertoire') || /saetliste[^/]*\.pdf/i.test(href)) track('repertoire_download', { content_id: 'repertoire' });
    });
    doc.querySelectorAll('audio').forEach(audio => {
      let played = false;
      audio.addEventListener('play', () => {
        if (!played) { played = true; track('audio_start', { content_id: 'medley' }); }
      });
    });

    function validVideoId(id) { return typeof id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(id); }
    function placeholder(wrapper) {
      const id = wrapper.dataset.videoId;
      if (!validVideoId(id)) return;
      wrapper.classList.remove('is-loaded');
      const holder = doc.createElement('div'); holder.className = 'video-placeholder';
      const cover = doc.createElement('div'); cover.className = 'video-cover';
      const poster = doc.createElement('img'); poster.className = 'video-poster';
      poster.src = 'assets/video-poster.webp'; poster.width = 1280; poster.height = 720; poster.alt = ''; poster.loading = 'lazy';
      const play = doc.createElement('button'); play.type = 'button'; play.className = 'video-play'; play.setAttribute('data-load-video', '');
      play.setAttribute('aria-label', english ? 'Play Flow & Green on YouTube' : 'Afspil Flow & Green på YouTube');
      const icon = doc.createElement('span'); icon.setAttribute('aria-hidden', 'true'); icon.textContent = '▶';
      const label = doc.createElement('span'); label.textContent = english ? 'Play live video' : 'Afspil livevideo';
      play.append(icon, label); cover.append(poster, play);
      const notice = doc.createElement('p'); notice.className = 'video-notice';
      notice.append(doc.createTextNode(english ? 'Press play to allow this site to load videos from YouTube. YouTube will receive information about your visit. ' : 'Tryk afspil for at tillade, at siden indlæser videoer fra YouTube. YouTube modtager oplysninger om dit besøg. '));
      const external = doc.createElement('a'); external.href = 'https://www.youtube.com/watch?v=' + id; external.target = '_blank'; external.rel = 'noopener';
      external.textContent = english ? 'Watch on YouTube ↗' : 'Se på YouTube ↗';
      notice.append(external); holder.append(cover, notice); wrapper.replaceChildren(holder);
    }
    function setupVideos() {
      doc.querySelectorAll('.video[data-video-id]').forEach(wrapper => {
        if (!wrapper.querySelector('[data-load-video]') && !wrapper.querySelector('iframe')) placeholder(wrapper);
      });
    }
    setupVideos();
    const more = doc.querySelector('.more-videos');
    const grid = doc.querySelector('#more-videos');
    if (more && grid) more.addEventListener('toggle', () => {
      if (!more.open || more.dataset.loaded) return;
      more.dataset.loaded = 'true';
      moreVideoIds.forEach(id => {
        const wrapper = doc.createElement('div'); wrapper.className = 'video'; wrapper.dataset.videoId = id;
        placeholder(wrapper); grid.append(wrapper);
      });
    });
    doc.addEventListener('click', event => {
      const button = event.target.closest && event.target.closest('[data-load-video]');
      if (!button) return;
      const wrapper = button.closest('.video[data-video-id]');
      const id = wrapper && wrapper.dataset.videoId;
      if (!wrapper || !validVideoId(id) || wrapper.classList.contains('is-loaded')) return;
      const consent = win.FlowGreenConsent;
      // A missing consent script must never silently enable an external embed.
      if (!consent) return;
      if (!consent.has('media')) consent.set(Object.assign({}, consent.get(), { media: true }));
      if (!consent.has('media')) return;
      const frame = doc.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&autoplay=1' + (english ? '&hl=en' : '');
      frame.title = english ? 'Flow & Green — live performance' : 'Flow & Green — liveoptagelse';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      const cover = wrapper.querySelector('.video-cover');
      if (!cover) return;
      wrapper.classList.add('is-loaded');
      cover.replaceChildren(frame);
      track('video_start', { content_id: id });
    });
    if (win.FlowGreenConsent && typeof win.FlowGreenConsent.subscribe === 'function') {
      win.FlowGreenConsent.subscribe(() => {
        if (win.FlowGreenConsent.has('media')) return;
        doc.querySelectorAll('.video[data-video-id]').forEach(wrapper => {
          if (wrapper.querySelector('iframe')) placeholder(wrapper);
        });
      });
    }
  }
  return { createSubmissionController, safeCampaign, cleanOccasion, init };
});
