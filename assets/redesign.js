'use strict';
document.querySelector('#year').textContent = new Date().getFullYear();
const dateInput = document.querySelector('input[type=date]');
const today = new Date();
dateInput.min = [today.getFullYear(), String(today.getMonth()+1).padStart(2,'0'), String(today.getDate()).padStart(2,'0')].join('-');
const videos = ['nTXc2jLasTk','tmO2kSr5Z-A','55hYRbOOsTs','Hxuq_dIlwbg','RbwEQH1w2vY','cQWwQzBzzdM','ONgc1nw_E80','OGhZqn3MN5k','R6Y3tNKzxrA','wGW2uoGRiz4','cpNLeynOz6w'];
document.querySelector('.more-videos').addEventListener('toggle', function () {
  if (!this.open || this.dataset.loaded) return;
  this.dataset.loaded = 'true';
  videos.forEach((id, i) => {
    const wrapper = document.createElement('div'); wrapper.className = 'video';
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
    frame.title = `Flow & Green – livevideo ${i+2}`;
    frame.loading = 'lazy'; frame.allowFullscreen = true;
    frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
    wrapper.append(frame); document.querySelector('#more-videos').append(wrapper);
  });
});
const form = document.querySelector('form');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button[type=submit]');
  const status = document.querySelector('#form-status');
  const originalText = button.textContent;
  button.disabled = true; button.textContent = 'Sender …'; status.textContent = '';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(form.action, {method: 'POST', body: new FormData(form), headers: {Accept:'application/json'}, signal:controller.signal});
    if (!response.ok) throw new Error('Submission failed');
    status.textContent = 'Tak for jeres forespørgsel! Vi vender typisk tilbage inden for 24 timer. Datoen er først reserveret, når vi har lavet en aftale.';
    form.reset();
  } catch (error) {
    status.textContent = 'Vi kunne ikke bekræfte afsendelsen. Jeres oplysninger er stadig her. Prøv igen, eller skriv til flowandgreen@gmail.com.';
  } finally {
    clearTimeout(timeout); button.disabled = false; button.textContent = originalText;
  }
});
