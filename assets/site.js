document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('#menu-btn');
  const menu = document.querySelector('#mobile-menu');
  if (btn && menu) {
    btn.addEventListener('click', () => {
      menu.classList.toggle('hidden');
    });
  }
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href && href.length > 1) {
        const el = document.querySelector(href);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth' });
        }
        if (menu) menu.classList.add('hidden');
      }
    });
  });

  // --- HERO SLIDER ---
  const slider = document.getElementById('hero-slider');
  if (slider) {
    const slides = Array.from(slider.querySelectorAll('.slide'));
    const dotsWrap = slider.querySelector('.slider-dots');
    const prevBtn = slider.querySelector('.slider-prev');
    const nextBtn = slider.querySelector('.slider-next');

    let index = 0;
    let timer = null;
    const delay = parseInt(slider.getAttribute('data-autoplay') || '5000', 10);

    function setActive(i) {
      slides.forEach((s, idx) => {
        s.classList.toggle('is-active', idx === i);
        s.style.opacity = idx === i ? '1' : '0';
        s.style.transform = idx === i ? 'scale(1)' : 'scale(1.01)';
        s.style.transition = 'opacity 700ms ease, transform 700ms ease';
        s.style.position = 'absolute';
        s.style.inset = '0';
      });
      if (dotsWrap) {
        dotsWrap.querySelectorAll('button').forEach((d, di) => {
          d.className = (di === i) ? 'h-2.5 w-2.5 rounded-full bg-white' : 'h-2.5 w-2.5 rounded-full bg-white/50 hover:bg-white/70';
        });
      }
    }

    function go(dir) {
      index = (index + dir + slides.length) % slides.length;
      setActive(index);
      restart();
    }

    function restart() {
      if (timer) clearInterval(timer);
      timer = setInterval(() => go(1), delay);
    }

    // Dots
    if (dotsWrap) {
      slides.forEach((_, i) => {
        const b = document.createElement('button');
        b.setAttribute('aria-label', 'Gå til slide ' + (i + 1));
        b.className = 'h-2.5 w-2.5 rounded-full bg-white/50 hover:bg-white/70';
        b.addEventListener('click', () => { index = i; setActive(index); restart(); });
        dotsWrap.appendChild(b);
      });
    }

    // Buttons (optional; add if present)
    if (prevBtn) prevBtn.addEventListener('click', () => go(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => go(1));

    // Init
    setActive(index);
    restart();
  }
});
