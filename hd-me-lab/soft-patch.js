// Patch SOFT list and force roadmap route after app.js loads
(function () {
  function patch() {
    // The SOFT array is closed over inside the IIFE; we cannot reach it directly.
    // Instead, intercept hashchange and render the roadmap page ourselves when needed.
    const view = document.getElementById('view');
    if (!view) return;

    function showRoadmap() {
      const t = (window.ME && window.ME.tools || []).find(x => x.slug === 'roadmap');
      if (!t) {
        view.innerHTML = '<section class="hero"><h1>知識地圖</h1><p>載入中…</p></section>';
        return;
      }
      const lessons = (t.lessons || []).map(l => {
        const steps = (l.steps || []).map(s => `<label class="chk"><input type="checkbox"><span>${s}</span></label>`).join('');
        return `<article class="lesson"><h3>${l.title} <span class="subtle">${l.minutes || ''} min</span></h3>${steps}</article>`;
      }).join('');
      const path = (t.path || []).map(p => `<li>${p}</li>`).join('');
      view.innerHTML = `
        <section class="hero">
          <p class="kicker">${t.origin || ''}</p>
          <h1 class="big">${t.name}</h1>
          <p class="muted">${t.why || ''}</p>
        </section>
        <section class="sec"><h2>路徑</h2><ul>${path}</ul></section>
        <section class="sec"><h2>課</h2>${lessons}</section>
        <p><a class="btn pri" href="roadmap.html">開獨立版面（yipmma 風格）</a></p>
      `;
    }

    function check() {
      const h = location.hash.replace(/^#/, '') || '/';
      if (h === '/roadmap' || h === '/roadmap/') {
        showRoadmap();
        return true;
      }
      return false;
    }

    const origHash = window.onhashchange;
    window.addEventListener('hashchange', () => {
      if (check()) return;
    });

    // Also patch subnav if possible by adding a link
    setTimeout(() => {
      const sub = document.getElementById('subnav');
      if (sub && !sub.innerHTML.includes('roadmap')) {
        const a = document.createElement('a');
        a.href = '#/roadmap';
        a.textContent = '知識地圖';
        sub.appendChild(a);
      }
      if (location.hash.includes('roadmap')) showRoadmap();
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patch);
  } else {
    setTimeout(patch, 100);
  }
})();
