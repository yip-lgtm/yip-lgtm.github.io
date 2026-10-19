// Temporary patch so #/roadmap works even if SOFT list is not updated yet
(function () {
  const original = window.render;
  if (typeof original !== 'function') return;
  window.render = function (opts) {
    const h = location.hash.replace(/^#/, '') || '/';
    if (h === '/roadmap' || h === '/roadmap/') {
      // Force render the roadmap tool if it exists
      const t = (window.ME && window.ME.tools || []).find(x => x.slug === 'roadmap');
      if (t && window.renderTool) {
        document.getElementById('view').innerHTML = window.renderTool(t);
        return;
      }
    }
    return original(opts);
  };
})();
