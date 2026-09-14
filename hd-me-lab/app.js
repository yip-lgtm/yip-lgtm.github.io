/* ME Lab hash SPA — GitHub Pages /hd-me-lab/ */
(function () {
  const ME = window.ME;
  const NAV = [
    { href: "#/", key: "/", label: "總覽" },
    { href: "#/curriculum", key: "/curriculum", label: "課程" },
    { href: "#/tools", key: "/tools", label: "軟件" },
    { href: "#/auto", key: "/auto", label: "自動化" },
    { href: "#/electives", key: "/electives", label: "選修" },
    { href: "#/lab", key: "/lab", label: "計算台" },
  ];
  const SOFT = [
    { slug: "autocad", label: "AutoCAD" },
    { slug: "solidworks", label: "SolidWorks" },
    { slug: "catia", label: "CATIA" },
    { slug: "nx", label: "NX (UG)" },
    { slug: "creo", label: "Creo" },
    { slug: "matlab", label: "MATLAB" },
  ];
  const PK = "me-lab-pages-progress";

  function loadP() {
    try { return JSON.parse(localStorage.getItem(PK) || "{}"); } catch { return {}; }
  }
  function saveP(p) { localStorage.setItem(PK, JSON.stringify(p)); }
  function allLessonKeys() {
    const keys = [];
    ME.tools.forEach((t) => t.lessons.forEach((l) => l.steps.forEach((_, i) => keys.push(l.id + ":" + i))));
    ME.auto.forEach((c) => c.lessons.forEach((l) => l.steps.forEach((_, i) => keys.push(l.id + ":" + i))));
    (ME.electives || []).forEach((c) => c.lessons.forEach((l) => l.steps.forEach((_, i) => keys.push(l.id + ":" + i))));
    return keys;
  }
  function ratio() {
    const p = loadP();
    const keys = allLessonKeys();
    const n = keys.filter((k) => p[k]).length;
    return keys.length ? n / keys.length : 0;
  }

  function esc(s) {
    const map = {
      "&": "&" + "amp;",
      "<": "&" + "lt;",
      ">": "&" + "gt;",
      '"': "&" + "quot;",
      "'": "&#39;"
    };
    return String(s ?? "").replace(/[&<>"']/g, (c) => map[c]);
  }

  function path() {
    let h = location.hash.replace(/^#/, "");
    if (!h || h === "") return "/";
    if (h[0] !== "/") h = "/" + h;
    if (h.length > 1 && h.endsWith("/")) h = h.slice(0, -1);
    return h;
  }

  function navHtml(id) {
    const p = path();
    return NAV.map((n) => {
      const on =
        n.key === "/"
          ? p === "/"
          : p === n.key || p.startsWith(n.key + "/");
      const softOn = n.key === "/tools" && SOFT.some((s) => p === "/" + s.slug);
      return `<a href="${n.href}" class="${on || softOn ? "on" : ""}">${n.label}</a>`;
    }).join("");
  }

  function subnav() {
    const p = path();
    const el = document.getElementById("subnav");
    let items = [];
    if (p === "/tools" || SOFT.some((s) => p === "/" + s.slug)) {
      items = [{ href: "#/tools", label: "總覽", on: p === "/tools" }].concat(
        SOFT.map((s) => ({ href: "#/" + s.slug, label: s.label, on: p === "/" + s.slug }))
      );
    } else if (p === "/auto" || p.startsWith("/auto/")) {
      items = [{ href: "#/auto", label: "總覽", on: p === "/auto" }].concat(
        ME.auto.map((c) => ({ href: "#/auto/" + c.slug, label: c.short, on: p === "/auto/" + c.slug }))
      );
    } else if (p === "/electives" || p.startsWith("/electives/")) {
      items = [{ href: "#/electives", label: "全部", on: p === "/electives" }].concat(
        (ME.electives || []).map((c) => ({ href: "#/electives/" + c.slug, label: c.short, on: p === "/electives/" + c.slug }))
      );
    }
    if (!items.length) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;
    el.innerHTML = items.map((i) => `<a href="${i.href}" class="${i.on ? "on" : ""}">${esc(i.label)}</a>`).join("");
  }

  function isoSvg() {
    return `<svg class="iso" viewBox="0 0 320 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="320" height="220" fill="#0c0e11"/>
      <g fill="none" stroke="#8aa4b8" stroke-width="1.4">
        <path d="M70 150 L70 90 L150 50 L230 90 L230 150 L150 190 Z"/>
        <path d="M70 90 L150 130 L230 90"/>
        <path d="M150 130 L150 190"/>
        <path d="M150 130 L198 106 L198 78 L150 102"/>
        <path d="M198 78 L230 90"/>
      </g>
      <g fill="#8aa4b8" font-family="IBM Plex Mono,monospace" font-size="10">
        <text x="88" y="208">80 × 50 × 15 · cut 33 × 25</text>
      </g>
    </svg>`;
  }

  function lessonBlock(id, title, minutes, steps, bilingual) {
    const p = loadP();
    const rows = steps.map((st, i) => {
      const key = id + ":" + i;
      const label = bilingual ? `<span>${esc(st.zh)}</span><span class="subtle">${esc(st.en)}</span>` : esc(st);
      return `<label class="chk"><input type="checkbox" data-k="${esc(key)}" ${p[key] ? "checked" : ""}><span>${label}</span></label>`;
    }).join("");
    return `<article class="lesson"><h3>${esc(title)} <span class="subtle">${minutes} min</span></h3>${rows}</article>`;
  }

  function bindChecks(root) {
    root.querySelectorAll("input[data-k]").forEach((inp) => {
      inp.addEventListener("change", () => {
        const p = loadP();
        if (inp.checked) p[inp.dataset.k] = true;
        else delete p[inp.dataset.k];
        saveP(p);
      });
    });
  }

  function home() {
    const nMod = ME.semesters.reduce((a, s) => a + s.modules.length, 0);
    const cr = ME.semesters.reduce((a, s) => a + s.credits, 0);
    const pct = Math.round(ratio() * 100);
    return `
      <section class="hero">
        <div>
          <p class="kicker">Higher Diploma · Mechanical Engineering</p>
          <h1 class="big">機械工程自學台</h1>
          <p class="muted">IVE 青衣 EG524701 PTE。機械五大 CAD、MATLAB／Simulink、自動化七科、選修 13 科全讀。</p>
          <div class="btns">
            <a class="btn pri" href="#/solidworks">今日學 SolidWorks Cut</a>
            <a class="btn sec" href="#/electives">選修 13 科全讀</a>
          </div>
        </div>
        <div class="card" style="padding:0;overflow:hidden">
          <p class="subtle" style="padding:0.6rem 1rem;border-bottom:1px solid var(--border);font-family:var(--mono)">件 2 · Boss 15 再 Cut 33×25</p>
          ${isoSvg()}
        </div>
      </section>
      <section class="grid g3" style="margin-top:2rem">
        <div class="card"><p class="subtle">課進度</p><v>${pct}%</v></div>
        <div class="card"><p class="subtle">課程結構</p><v>${ME.semesters.length} Sem</v><p class="muted" style="margin:0.4rem 0 0">${nMod} 單元 · ${cr} QF cr</p></div>
        <div class="card"><p class="subtle">而家</p><v>Sem 1</v><p class="muted" style="margin:0.4rem 0 0">70% 出席 · EA 同總分都要過 40</p></div>
      </section>
      <section class="sec">
        <h2>今日三步</h2>
        <div class="grid g3">
          <a class="card" href="#/solidworks"><p class="subtle">01</p><h3>SolidWorks Cut</h3><p class="muted">80×50×15 再剪 33×25。</p></a>
          <a class="card" href="#/matlab"><p class="subtle">02</p><h3>Simulink 彈簧</h3><p class="muted">調 m、c、k，睇欠阻尼同過阻尼。</p></a>
          <a class="card" href="#/electives"><p class="subtle">03</p><h3>選修全讀</h3><p class="muted">官方揀 2；你讀 13 科。</p></a>
        </div>
      </section>
      <section class="sec">
        <h2>軟件</h2>
        <div class="grid g3">
          ${ME.tools.map((t) => `<a class="card" href="#/${t.slug}"><p class="subtle">${esc(t.origin)}</p><h3>${esc(t.name)}</h3><p class="muted">${esc(t.role)}</p></a>`).join("")}
        </div>
      </section>
      ${footer()}
    `;
  }

  function curriculum() {
    const blocks = ME.semesters.map((s) => {
      const mods = s.modules.map((m) => `
        <div class="mod-row">
          <div class="code">${esc(m.code)}</div>
          <div>
            <strong>${esc(m.title)}</strong>
            <p class="subtle" style="margin:0">${esc(m.titleEn)}</p>
            <p class="muted" style="margin:0.3rem 0 0">${esc(m.why)}</p>
          </div>
          <div><span class="pill ${esc(m.track)}">${esc(m.track)}</span> <span class="subtle">${m.credits} cr</span></div>
        </div>`).join("");
      return `<details class="sem" ${s.id === 1 ? "open" : ""}><summary>Semester ${s.id} · Y${s.year} · ${esc(s.weeks)} · ${s.credits} cr</summary>${mods}</details>`;
    }).join("<div style='height:0.75rem'></div>");
    return `
      <p class="kicker">EG524701</p>
      <h1>課程</h1>
      <p class="muted">AY2026/27 Student Handbook。Sem 1 已交 00965（3210／3211／3212／LAN3003）。工場 I 唔好豁。IA 畢業前必須申請。</p>
      <div class="grid" style="margin-top:1.25rem">${blocks}</div>
      <section class="sec">
        <h2>選修池 · 13 科全讀</h2>
        <p class="muted">官方 Sem 8 揀 2 科（各 14 cr）。你要讀全部，自學台全開。</p>
        <div class="grid g2">${(ME.electives || []).map((c) => `<a class="card" href="#/electives/${c.slug}"><p class="subtle">${esc(c.code)}</p><h3>${esc(c.zh)}</h3><p class="subtle">${esc(c.en)}</p></a>`).join("")}</div>
      </section>
      <div class="card" style="margin-top:1rem">
        <p class="code">${esc(ME.ia.code)}</p>
        <h3>${esc(ME.ia.title)} · ${ME.ia.credits} cr</h3>
        <p class="muted">${esc(ME.ia.note)}</p>
      </div>
      ${footer()}
    `;
  }

  function toolsHub() {
    return `
      <p class="kicker">五大 CAD + MATLAB</p>
      <h1>軟件</h1>
      <p class="muted">每個分頁獨立課。SolidWorks 先 Boss 再 Cut；NX 用 Subtract；CATIA 用 Pocket。</p>
      <div class="grid g2" style="margin-top:1.25rem">
        ${ME.tools.map((t) => `<a class="card" href="#/${t.slug}"><p class="subtle">${esc(t.hdLink)}</p><h3>${esc(t.name)}</h3><p class="muted">${esc(t.why)}</p></a>`).join("")}
      </div>
      ${footer()}
    `;
  }

  function software(slug) {
    const t = ME.tools.find((x) => x.slug === slug);
    if (!t) return `<h1>未找到</h1>`;
    const bench = slug === "matlab" ? springBench() : slug === "solidworks" ? `<div class="card" style="padding:0;overflow:hidden;margin:1rem 0">${isoSvg()}</div>` : "";
    return `
      <p class="kicker">${esc(t.origin)} · ${esc(t.hdLink)}</p>
      <h1>${esc(t.name)}</h1>
      <p class="muted">${esc(t.why)}</p>
      <p><span class="pill core">${esc(t.role)}</span></p>
      ${bench}
      <section class="sec path"><h2>路徑</h2><ol>${t.path.map((p) => `<li>${esc(p)}</li>`).join("")}</ol></section>
      <section class="sec"><h2>課</h2><div class="grid">${t.lessons.map((l) => lessonBlock(l.id, l.title, l.minutes, l.steps, false)).join("")}</div></section>
      <section class="sec"><h2>指令</h2><div class="cmds">${(t.commands || []).map((c) => `<span>${esc(c.cmd)} · ${esc(c.does)}</span>`).join("")}</div></section>
      ${footer()}
    `;
  }

  function autoHub() {
    return `
      <p class="kicker">Bilingual · 中英對照</p>
      <h1>自動化</h1>
      <p class="muted">順序：電路 → 訊號 → 微機／控制論 → 自控原理 → 工程控制論 → 卡爾曼。Wiener 控制論 ≠ 自控教科書；錢學森工程控制論 ≈ 狀態空間。</p>
      <div class="grid g2" style="margin-top:1.25rem">
        ${ME.auto.map((c) => `<a class="card" href="#/auto/${c.slug}"><p class="subtle">0${c.order} · ${esc(c.hd)}</p><h3>${esc(c.zh)}</h3><p class="subtle">${esc(c.en)}</p><p class="muted">${esc(c.why.zh)}</p></a>`).join("")}
      </div>
      ${footer()}
    `;
  }

  function autoCourse(slug) {
    const c = ME.auto.find((x) => x.slug === slug);
    if (!c) return `<h1>未找到</h1>`;
    let bench = "";
    if (slug === "circuits") bench = rcBench();
    if (slug === "control") bench = pidBench();
    if (slug === "kalman") bench = kfBench();
    if (slug === "signals") bench = sigBench();
    return `
      <p class="kicker">${esc(c.en)} · ${esc(c.hd)}</p>
      <h1>${esc(c.zh)}</h1>
      <div class="bi">
        <p class="muted">${esc(c.why.zh)}</p>
        <p class="muted">${esc(c.why.en)}</p>
      </div>
      <section class="sec"><h2>路徑 Path</h2>
        <ol class="path">${c.path.map((p) => `<li><strong>${esc(p.zh)}</strong> · <span class="subtle">${esc(p.en)}</span></li>`).join("")}</ol>
      </section>
      <section class="sec"><h2>公式</h2><div class="grid">${c.formulas.map((f) => `<div class="formula">${esc(f.eq)}<div class="subtle">${esc(f.mean.zh)} · ${esc(f.mean.en)}</div></div>`).join("")}</div></section>
      ${bench}
      <section class="sec"><h2>課 Lessons</h2><div class="grid">${c.lessons.map((l) => lessonBlock(l.id, l.title.zh + " / " + l.title.en, l.minutes, l.steps, true)).join("")}</div></section>
      <section class="sec"><h2>MATLAB</h2><pre class="cmd">${esc(c.matlab)}</pre></section>
      ${footer()}
    `;
  }

  function electiveHub() {
    return `
      <p class="kicker">官方揀 2 · 自學全開</p>
      <h1>選修 13 科</h1>
      <p class="muted">VTC EG524701 Sem 8 選修單元。畢業揀兩科；呢度 13 科中英對照全讀。海事處遠洋：輪機 + 應用熱流體。鐵路：車輛 → 軌道 → RST I／II。</p>
      <div class="grid g2" style="margin-top:1.25rem">
        ${(ME.electives || []).map((c) => `<a class="card" href="#/electives/${c.slug}"><p class="subtle">${String(c.order).padStart(2,"0")} · ${esc(c.code)}</p><h3>${esc(c.zh)}</h3><p class="subtle">${esc(c.en)}</p><p class="muted">${esc(c.why.zh)}</p></a>`).join("")}
      </div>
      ${footer()}
    `;
  }

  function electiveCourse(slug) {
    const c = (ME.electives || []).find((x) => x.slug === slug);
    if (!c) return `<h1>未找到</h1><p><a class="btn sec" href="#/electives">返回選修池</a></p>`;
    const jump = c.jump ? `<p><a class="btn pri" href="#${c.jump.to}">${esc(c.jump.label)}</a></p>` : "";
    return `
      <p class="kicker">${esc(c.en)} · ${esc(c.code)} · ${esc(c.hd)}</p>
      <h1>${esc(c.zh)}</h1>
      <div class="bi">
        <p class="muted">${esc(c.why.zh)}</p>
        <p class="muted">${esc(c.why.en)}</p>
      </div>
      ${jump}
      <section class="sec"><h2>路徑 Path</h2>
        <ol class="path">${c.path.map((p) => `<li><strong>${esc(p.zh)}</strong> · <span class="subtle">${esc(p.en)}</span></li>`).join("")}</ol>
      </section>
      <section class="sec"><h2>公式</h2><div class="grid">${c.formulas.map((f) => `<div class="formula">${esc(f.eq)}<div class="subtle">${esc(f.mean.zh)} · ${esc(f.mean.en)}</div></div>`).join("")}</div></section>
      <section class="sec"><h2>課 Lessons</h2><div class="grid">${c.lessons.map((l) => lessonBlock(l.id, l.title.zh + " / " + l.title.en, l.minutes, l.steps, true)).join("")}</div></section>
      <section class="sec"><h2>MATLAB</h2><pre class="cmd">${esc(c.matlab)}</pre></section>
      ${footer()}
    `;
  }

  function lab() {
    return `
      <p class="kicker">Interactive</p>
      <h1>計算台</h1>
      <p class="muted">RC 一階、一階植物 PID、質量–彈簧、一維卡爾曼。拉 slider 即時重繪。</p>
      ${rcBench()}
      ${pidBench()}
      ${springBench()}
      ${kfBench()}
      ${footer()}
    `;
  }

  function footer() {
    return `<footer class="site">ME Lab · IVE Tsing Yi EG524701 PTE · 進度存在你部瀏覽器 · <a href="https://github.com/yip-lgtm/hd-me-lab">GitHub</a></footer>`;
  }

  function slider(id, label, min, max, step, val) {
    return `<label class="sl"><em>${esc(label)}</em><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"><span id="${id}_v">${val}</span></label>`;
  }

  function rcBench() {
    return `<section class="sec card" data-bench="rc"><h2>RC 階躍</h2><p class="subtle">v_C(t) = 1 − e^{−t/τ} · τ = RC</p>
      <canvas class="scope" width="640" height="220"></canvas>
      ${slider("rc_R", "R kΩ", 0.2, 10, 0.1, 1)}
      ${slider("rc_C", "C µF", 0.2, 10, 0.1, 1)}
    </section>`;
  }
  function pidBench() {
    return `<section class="sec card" data-bench="pid"><h2>PID on first-order plant</h2><p class="subtle">ẏ = (u − y)/τ · u = Kp e + Ki ∫e + Kd ė</p>
      <canvas class="scope" width="640" height="220"></canvas>
      ${slider("pid_kp", "Kp", 0, 8, 0.1, 2)}
      ${slider("pid_ki", "Ki", 0, 4, 0.05, 1.2)}
      ${slider("pid_kd", "Kd", 0, 1.5, 0.01, 0.15)}
      ${slider("pid_tau", "τ", 0.2, 4, 0.05, 0.8)}
    </section>`;
  }
  function springBench() {
    return `<section class="sec card" data-bench="spring"><h2>質量–彈簧–阻尼</h2><p class="subtle">mẍ + cẋ + kx = 0 · x(0)=1</p>
      <canvas class="scope" width="640" height="220"></canvas>
      ${slider("sp_m", "m", 0.2, 5, 0.1, 1)}
      ${slider("sp_c", "c", 0, 8, 0.1, 0.4)}
      ${slider("sp_k", "k", 0.5, 20, 0.1, 4)}
    </section>`;
  }
  function kfBench() {
    return `<section class="sec card" data-bench="kf"><h2>一維卡爾曼</h2><p class="subtle">x⁻ = x · P⁻ = P+Q · K = P⁻/(P⁻+R) · x = x⁻ + K(z−x⁻)</p>
      <canvas class="scope" width="640" height="220"></canvas>
      ${slider("kf_q", "Q", 0.001, 0.2, 0.001, 0.01)}
      ${slider("kf_r", "R", 0.05, 2, 0.01, 0.8)}
    </section>`;
  }
  function sigBench() {
    return `<section class="sec card" data-bench="sig"><h2>正弦 + 一階 LTI</h2>
      <canvas class="scope" width="640" height="220"></canvas>
      ${slider("sg_f", "f Hz", 1, 12, 0.1, 4)}
      ${slider("sg_tau", "τ", 0.01, 0.4, 0.01, 0.08)}
    </section>`;
  }

  function plot(canvas, series, tEnd) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 640;
    const h = 220;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0c0e11";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#2a323c";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (h * i) / 4;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    let ymin = 0, ymax = 1;
    series.forEach((s) => s.y.forEach((v) => { if (v < ymin) ymin = v; if (v > ymax) ymax = v; }));
    if (ymax === ymin) ymax = ymin + 1;
    const pad = 0.08 * (ymax - ymin);
    ymin -= pad; ymax += pad;
    const n = series[0].y.length;
    series.forEach((s) => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      s.y.forEach((v, i) => {
        const x = (i / (n - 1)) * w;
        const y = h - ((v - ymin) / (ymax - ymin)) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
    ctx.fillStyle = "#6d7680";
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText("0", 6, h - 6);
    ctx.fillText((tEnd || "").toString(), w - 40, h - 6);
  }

  function num(id) { return parseFloat(document.getElementById(id).value); }
  function tag(id) { const el = document.getElementById(id + "_v"); if (el) el.textContent = document.getElementById(id).value; }

  function runRc(root) {
    const R = num("rc_R") * 1e3, C = num("rc_C") * 1e-6, tau = R * C;
    tag("rc_R"); tag("rc_C");
    const N = 400, T = 5 * tau, y = [];
    for (let i = 0; i < N; i++) {
      const t = (i / (N - 1)) * T;
      y.push(1 - Math.exp(-t / tau));
    }
    plot(root.querySelector("canvas"), [{ y, color: "#8aa4b8" }], "5τ");
  }
  function runPid(root) {
    const kp = num("pid_kp"), ki = num("pid_ki"), kd = num("pid_kd"), tau = num("pid_tau");
    tag("pid_kp"); tag("pid_ki"); tag("pid_kd"); tag("pid_tau");
    const dt = 0.002, T = 8, N = Math.floor(T / dt);
    const y = [], r = [];
    let yy = 0, integ = 0, ePrev = 1;
    for (let i = 0; i < N; i++) {
      const e = 1 - yy;
      integ += e * dt;
      const de = (e - ePrev) / dt;
      ePrev = e;
      let u = kp * e + ki * integ + kd * de;
      if (u > 10) u = 10; if (u < -10) u = -10;
      yy += ((u - yy) / tau) * dt;
      if (i % 4 === 0) { y.push(yy); r.push(1); }
    }
    plot(root.querySelector("canvas"), [{ y: r, color: "#2a323c" }, { y, color: "#8aa4b8" }], "8s");
  }
  function runSpring(root) {
    const m = num("sp_m"), c = num("sp_c"), k = num("sp_k");
    tag("sp_m"); tag("sp_c"); tag("sp_k");
    const dt = 0.002, T = 8, N = Math.floor(T / dt);
    let x = 1, v = 0;
    const y = [];
    for (let i = 0; i < N; i++) {
      const a = (-c * v - k * x) / m;
      v += a * dt; x += v * dt;
      if (i % 4 === 0) y.push(x);
    }
    plot(root.querySelector("canvas"), [{ y, color: "#8aa4b8" }], "8s");
  }
  function runKf(root) {
    const Q = num("kf_q"), R = num("kf_r");
    tag("kf_q"); tag("kf_r");
    const N = 180;
    let xt = 0, x = 0, P = 1;
    const truth = [], meas = [], est = [];
    let s = 1;
    function rnd() { s = (s * 16807) % 2147483647; return (s / 2147483647) * 2 - 1; }
    for (let i = 0; i < N; i++) {
      xt += 0.08 * rnd();
      const z = xt + Math.sqrt(R) * rnd() * 1.7;
      const xp = x, Pp = P + Q;
      const K = Pp / (Pp + R);
      x = xp + K * (z - xp);
      P = (1 - K) * Pp;
      truth.push(xt); meas.push(z); est.push(x);
    }
    plot(root.querySelector("canvas"), [
      { y: meas, color: "#2a323c" },
      { y: truth, color: "#6d7680" },
      { y: est, color: "#8aa4b8" },
    ], "n");
  }
  function runSig(root) {
    const f = num("sg_f"), tau = num("sg_tau");
    tag("sg_f"); tag("sg_tau");
    const N = 500, T = 1.5, dt = T / (N - 1);
    const u = [], y = [];
    let yy = 0;
    for (let i = 0; i < N; i++) {
      const t = i * dt;
      const uu = Math.sin(2 * Math.PI * f * t);
      yy += ((uu - yy) / tau) * dt;
      u.push(uu); y.push(yy);
    }
    plot(root.querySelector("canvas"), [{ y: u, color: "#2a323c" }, { y, color: "#8aa4b8" }], "1.5s");
  }

  function bindBenches(root) {
    root.querySelectorAll("[data-bench]").forEach((el) => {
      const kind = el.getAttribute("data-bench");
      const run = { rc: runRc, pid: runPid, spring: runSpring, kf: runKf, sig: runSig }[kind];
      if (!run) return;
      el.querySelectorAll("input[type=range]").forEach((inp) => inp.addEventListener("input", () => run(el)));
      run(el);
    });
  }

  function render() {
    document.getElementById("nav-main").innerHTML = navHtml();
    document.getElementById("nav-bot").innerHTML = navHtml();
    subnav();
    const p = path();
    const view = document.getElementById("view");
    let html = "";
    if (p === "/") html = home();
    else if (p === "/curriculum") html = curriculum();
    else if (p === "/tools") html = toolsHub();
    else if (p === "/auto") html = autoHub();
    else if (p === "/electives") html = electiveHub();
    else if (p === "/lab") html = lab();
    else if (p.startsWith("/auto/")) html = autoCourse(p.slice(6));
    else if (p.startsWith("/electives/")) html = electiveCourse(p.slice("/electives/".length));
    else if (SOFT.some((s) => p === "/" + s.slug)) html = software(p.slice(1));
    else html = `<h1>呢頁冇嘢</h1><p><a class="btn sec" href="#/">返總覽</a></p>`;
    view.innerHTML = html;
    bindChecks(view);
    bindBenches(view);
    window.scrollTo(0, 0);
    document.title = "ME Lab · 機械工程自學台";
  }

  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "#/";
  else render();
})();
