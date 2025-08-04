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
      if (href.length > 1) {
        e.preventDefault();
        document.querySelector(href).scrollIntoView({ behavior: 'smooth' });
        menu && menu.classList.add('hidden');
      }
    });
  });
});