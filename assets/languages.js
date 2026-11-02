// Keep the current section when changing language. Danish stays the default at /.
document.querySelectorAll('.locale-switch a').forEach(link => {
 const update = () => { const target = new URL(link.getAttribute('href'), location.href); target.hash = location.hash; link.href = target.href; };
 update(); window.addEventListener('hashchange', update);
});
