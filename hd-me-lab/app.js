/* ME Lab hash SPA — GitHub Pages /hd-me-lab/ */
(function () {
  const ME = window.ME;
  const NAV = [
    { href: "#/", key: "/", zh: "總覽", en: "Home" },
    { href: "#/curriculum", key: "/curriculum", zh: "課程", en: "Course" },
    { href: "#/tools", key: "/tools", zh: "軟件", en: "CAD" },
    { href: "#/auto", key: "/auto", zh: "自動化", en: "Auto" },
    { href: "#/electives", key: "/electives", zh: "選修", en: "Electives" },
    { href: "#/lab", key: "/lab", zh: "計算台", en: "Lab" },
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
  const LK = "me-lab-lang";
  function loadLang() {
    try { return localStorage.getItem(LK) === "en" ? "en" : "zh"; } catch { return "zh"; }
  }
  function saveLang(l) {
    localStorage.setItem(LK, l);
    document.documentElement.lang = l === "en" ? "en" : "zh-Hant";
  }
  function t(bi) {
    if (bi == null) return "";
    if (typeof bi === "string") return bi;
    return loadLang() === "en" ? (bi.en || bi.zh) : (bi.zh || bi.en);
  }
  function langHtml() {
    const l = loadLang();
    return `<div class="seg">
      <button type="button" data-lang="zh" class="${l === "zh" ? "on" : ""}" aria-pressed="${l === "zh"}" aria-label="中文（繁體）">中</button>
      <button type="button" data-lang="en" class="${l === "en" ? "on" : ""}" aria-pressed="${l === "en"}" aria-label="English">EN</button>
    </div>
    <button type="button" data-lang="zh" class="trad ${l === "zh" ? "on" : ""}" aria-label="繁體中文">繁體</button>`;
  }
  function bindLang(root) {
    if (!root) return;
    root.querySelectorAll("[data-lang]").forEach((btn) => {
      btn.addEventListener("click", () => {
        saveLang(btn.getAttribute("data-lang"));
        render({ keepScroll: true });
      });
    });
  }
  const GH = "https://github.com/yip-lgtm/hd-mech-eng/blob/main/";
  const NK = "me-lab-page-notes";
  const TK = "me-lab-gh-token";
  const GH_API = "https://api.github.com/repos/yip-lgtm/hd-mech-eng/contents/";
  const GH_NEW = "https://github.com/settings/tokens/new?scopes=public_repo&description=ME-Lab-notes";
  function loadTok() { try { return (localStorage.getItem(TK) || "").trim(); } catch { return ""; } }
  function saveTok(v) { try { if (!v) localStorage.removeItem(TK); else localStorage.setItem(TK, v.trim()); } catch (_) {} }
  function b64enc(text) {
    const bytes = new TextEncoder().encode(text);
    let bin = "";
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  function b64dec(b64) {
    const bin = atob(String(b64 || "").replace(/\n/g, ""));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  function mergeNotes(existing, personal) {
    const m = existing.search(/^## Personal notes/m);
    const body = (m >= 0 ? existing.slice(0, m) : existing).replace(/\s+$/, "");
    const note = String(personal || "").trim();
    if (!note) return body + "\n";
    return body + "\n\n## Personal notes 個人筆記\n\n" + note + "\n";
  }
  async function pushGh(path, personal) {
    const token = loadTok();
    if (!token) throw new Error("notoken");
    const api = GH_API + path.replace(/^\/+/, "");
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
    };
    let sha, existing = "# " + path + "\n";
    const got = await fetch(api + "?ref=main", { headers });
    if (got.status === 200) {
      const json = await got.json();
      sha = json.sha;
      if (json.content) existing = b64dec(json.content);
    } else if (got.status === 401 || got.status === 403) {
      throw new Error("token");
    } else if (got.status !== 404) {
      throw new Error("read-" + got.status);
    }
    const next = mergeNotes(existing, personal);
    const put = await fetch(api, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: JSON.stringify({
        message: "notes: " + path,
        content: b64enc(next),
        branch: "main",
        sha: sha,
      }),
    });
    if (put.status === 401 || put.status === 403) throw new Error("token");
    if (!put.ok) throw new Error("put-" + put.status);
    const out = await put.json();
    return (out.content && out.content.html_url) || (GH.replace("/blob/main/", "/blob/main/") + path);
  }
  const GH_MOD = {
    LAN3003: "modules/LAN3003-vocational-chinese-I.md",
    LAN3107: "modules/LAN3107-workplace-oral-english.md",
    EME3210: "modules/EME3210-fundamental-mathematics.md",
    EME3211: "modules/EME3211-mathematics-I.md",
    EME3212: "modules/EME3212-drawing-cad.md",
  };
  function kebab(s) {
    return String(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function moduleGh(m) {
    return GH_MOD[m.code] || ("modules/" + m.code + "-" + kebab(m.titleEn) + ".md");
  }
  function loadN() { try { return JSON.parse(localStorage.getItem(NK) || "{}"); } catch { return {}; } }
  function saveN(n) { localStorage.setItem(NK, JSON.stringify(n)); }
  function fileBar(repoPath, label) {
    return `<aside class="card" style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;margin:1rem 0">
      <span class="code">${esc(repoPath)}</span>
      <span>${esc(label || "")}</span>
      <a class="btn sec" href="${GH}${esc(repoPath)}" target="_blank" rel="noreferrer" style="margin-left:auto">開 file</a>
    </aside>`;
  }
  function noteBox(id, repoPath) {
    const v = loadN()[id] || "";
    const tok = loadTok();
    const connect = tok
      ? `<p class="subtle">GitHub · hd-mech-eng <button type="button" class="btn sec" data-drop-tok style="height:2.2rem;padding:0 0.7rem">解除</button></p>`
      : `<form class="btns" data-tok-form>
          <input type="password" autocomplete="off" spellcheck="false" class="notepad" style="min-height:2.75rem;width:auto;flex:1;min-width:12rem" placeholder="ghp_… / github_pat_…" data-tok-input>
          <button type="submit" class="btn pri">${esc(t({ zh: "接駁 GitHub", en: "Connect GitHub" }))}</button>
          <a class="btn sec" href="${GH_NEW}" target="_blank" rel="noreferrer">${esc(t({ zh: "開 token", en: "Create token" }))}</a>
        </form>`;
    return `<section class="sec"><h2>${esc(t({ zh: "個人筆記", en: "Notes" }))}</h2>
      <textarea id="note-${esc(id)}" rows="8" class="notepad" data-repo="${esc(repoPath || "")}">${esc(v)}</textarea>
      <div class="btns">
        <button type="button" class="btn pri" data-save-note="${esc(id)}" data-repo-path="${esc(repoPath || "")}">${esc(t({ zh: "儲存 Save", en: "Save" }))}</button>
        <button type="button" class="btn sec" data-dl-note="${esc(id)}">${esc(t({ zh: "下載 .md", en: "Download .md" }))}</button>
        <a class="subtle" id="save-link-${esc(id)}" href="#" target="_blank" rel="noreferrer" hidden></a>
        <span class="subtle" id="save-status-${esc(id)}"></span>
      </div>
      ${connect}
      <p class="subtle">${esc(t({ zh: "接駁一次 token。之後撳儲存就自動放去 GitHub。Sem 1 原文唔會覆蓋。", en: "Connect a token once. Later, Save uploads to GitHub. Sem 1 originals stay." }))}</p></section>`;
  }
  function bindNotes(root) {
    root.querySelectorAll("textarea.notepad").forEach((el) => {
      el.addEventListener("input", () => {
        const id = el.id.replace(/^note-/, "");
        const n = loadN();
        n[id] = el.value;
        saveN(n);
        const st = document.getElementById("save-status-" + id);
        if (st) st.textContent = "";
      });
      el.addEventListener("keydown", (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          saveOneNote(el.id.replace(/^note-/, ""), el.getAttribute("data-repo") || "");
        }
      });
    });
    root.querySelectorAll("[data-save-note]").forEach((btn) => {
      btn.addEventListener("click", () => saveOneNote(btn.getAttribute("data-save-note"), btn.getAttribute("data-repo-path") || ""));
    });
    root.querySelectorAll("[data-dl-note]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-dl-note");
        const el = document.getElementById("note-" + id);
        const blob = new Blob([(el && el.value) || ""], { type: "text/markdown" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = id + "-notes.md";
        a.click();
        URL.revokeObjectURL(a.href);
      });
    });
    root.querySelectorAll("[data-tok-form]").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const inp = form.querySelector("[data-tok-input]");
        const val = inp ? inp.value.trim() : "";
        if (!val) return;
        saveTok(val);
        const ta = root.querySelector("textarea.notepad");
        const id = ta ? ta.id.replace(/^note-/, "") : "";
        const path = ta ? ta.getAttribute("data-repo") || "" : "";
        render({ keepScroll: true });
        if (id) saveOneNote(id, path);
      });
    });
    root.querySelectorAll("[data-drop-tok]").forEach((btn) => {
      btn.addEventListener("click", () => {
        saveTok("");
        render({ keepScroll: true });
      });
    });
  }
  function saveOneNote(id, repoPath) {
    const el = document.getElementById("note-" + id);
    const n = loadN();
    n[id] = el ? el.value : n[id] || "";
    saveN(n);
    localStorage.setItem(NK + "-at", String(Date.now()));
    const st = document.getElementById("save-status-" + id);
    const link = document.getElementById("save-link-" + id);
    const btn = document.querySelector('[data-save-note="' + id + '"]');
    const path = repoPath || (btn && btn.getAttribute("data-repo-path")) || (el && el.getAttribute("data-repo")) || "";
    function flash(label) {
      if (btn) {
        const prev = btn.getAttribute("data-label") || t({ zh: "儲存 Save", en: "Save" });
        btn.setAttribute("data-label", prev);
        btn.textContent = label;
        window.setTimeout(() => { btn.textContent = prev; }, 1600);
      }
    }
    if (!loadTok()) {
      if (st) st.textContent = t({ zh: "已存瀏覽器。下面接駁 GitHub 先會自動 upload。", en: "Saved locally. Connect GitHub below to upload." });
      flash(t({ zh: "已儲存", en: "Saved" }));
      return;
    }
    if (!path) {
      if (st) st.textContent = t({ zh: "冇 repo path", en: "Missing path" });
      return;
    }
    if (st) st.textContent = t({ zh: "上傳緊 GitHub…", en: "Uploading…" });
    if (btn) btn.disabled = true;
    pushGh(path, n[id]).then((url) => {
      if (st) st.textContent = t({ zh: "已放上 GitHub", en: "Uploaded to GitHub" });
      if (link && url) {
        link.hidden = false;
        link.href = url;
        link.textContent = t({ zh: "開 GitHub file", en: "Open GitHub file" });
      }
      flash(t({ zh: "已上傳", en: "Uploaded" }));
    }).catch((err) => {
      const code = String(err && err.message || err);
      if (st) st.textContent = code === "token"
        ? t({ zh: "Token 無效，請重新接駁。", en: "Token invalid — reconnect." })
        : t({ zh: "上傳失敗（" + code + "）", en: "Upload failed (" + code + ")" });
    }).finally(() => { if (btn) btn.disabled = false; });
  }

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
          : n.key === "/curriculum"
            ? (p === "/curriculum" || p === "/files" || p.startsWith("/modules"))
          : p === n.key || p.startsWith(n.key + "/");
      const softOn = n.key === "/tools" && SOFT.some((s) => p === "/" + s.slug);
      return `<a href="${n.href}" class="${on || softOn ? "on" : ""}">${esc(t({ zh: n.zh, en: n.en }))}</a>`;
    }).join("");
  }

  function subnav() {
    const p = path();
    const el = document.getElementById("subnav");
    let items = [];
    if (p === "/tools" || SOFT.some((s) => p === "/" + s.slug)) {
      items = [{ href: "#/tools", label: t({ zh: "總覽", en: "Overview" }), on: p === "/tools" }].concat(
        SOFT.map((s) => ({ href: "#/" + s.slug, label: s.label, on: p === "/" + s.slug }))
      );
    } else if (p === "/auto" || p.startsWith("/auto/")) {
      items = [{ href: "#/auto", label: t({ zh: "總綱", en: "Overview" }), on: p === "/auto" }].concat(
        ME.auto.map((c) => ({ href: "#/auto/" + c.slug, label: t({ zh: c.short, en: c.en }), on: p === "/auto/" + c.slug }))
      );
    } else if (p === "/electives" || p.startsWith("/electives/")) {
      items = [{ href: "#/electives", label: t({ zh: "全部", en: "All" }), on: p === "/electives" }].concat(
        (ME.electives || []).map((c) => ({ href: "#/electives/" + c.slug, label: t({ zh: c.short, en: c.en }), on: p === "/electives/" + c.slug }))
      );
    } else if (p === "/curriculum" || p === "/files" || p.startsWith("/modules")) {
      items = [
        { href: "#/curriculum", label: t({ zh: "九學期", en: "Semesters" }), on: p === "/curriculum" },
        { href: "#/files", label: t({ zh: "檔案庫", en: "Files" }), on: p === "/files" || p.startsWith("/modules") },
      ];
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
      const label = bilingual ? esc(t(st)) : esc(st);
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
          <h1 class="big">${esc(t({ zh: "機械工程自學台", en: "Mechanical Engineering Lab" }))}</h1>
          <p class="muted">${esc(t({ zh: "IVE 青衣 EG524701 PTE。機械五大 CAD、MATLAB／Simulink、自動化七科、選修 13 科全讀。", en: "IVE Tsing Yi EG524701 PTE. Five mechanical CAD packages, MATLAB/Simulink, seven automation courses, all 13 electives." }))}</p>
          <div class="btns">
            <a class="btn pri" href="#/solidworks">${esc(t({ zh: "今日學 SolidWorks Cut", en: "Learn SolidWorks Cut today" }))}</a>
            <a class="btn sec" href="#/files">${esc(t({ zh: "檔案庫 · GitHub", en: "Files · GitHub" }))}</a>
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
          <a class="card" href="#/files"><p class="subtle">03</p><h3>開 file</h3><p class="muted">全課程／軟件／自動化／選修。接 hd-mech-eng。</p></a>
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
        <a class="mod-row" href="#/modules/${encodeURIComponent(m.code)}">
          <div class="code">${esc(m.code)}</div>
          <div>
            <strong>${esc(loadLang() === "en" ? m.titleEn : m.title)}</strong>
            <p class="muted" style="margin:0.3rem 0 0">${esc(m.why)}</p>
            <p class="subtle" style="margin:0.4rem 0 0">${esc(t({ zh: "開 file →", en: "Open file →" }))}</p>
          </div>
          <div><span class="pill ${esc(m.track)}">${esc(m.track)}</span> <span class="subtle">${m.credits} cr</span></div>
        </a>`).join("");
      return `<details class="sem" ${s.id === 1 ? "open" : ""}><summary>Semester ${s.id} · Y${s.year} · ${esc(s.weeks)} · ${s.credits} cr</summary>${mods}</details>`;
    }).join("<div style='height:0.75rem'></div>");
    return `
      <p class="kicker">EG524701</p>
      <h1>${esc(t({ zh: "課程", en: "Curriculum" }))}</h1>
      <p class="muted">${esc(t({ zh: "撳單元開 file。接私人筆記庫 hd-mech-eng。工場 I 唔好豁。IA 畢業前必須申請。", en: "Open a module file. Notes live in private repo hd-mech-eng. Do not exempt Workshop I. Apply for IA before graduation." }))}</p>\n      <p><a class="btn sec" href="#/files">${esc(t({ zh: "檔案庫 · backup / upload", en: "Files · backup / upload" }))}</a></p>
      <div class="grid" style="margin-top:1.25rem">${blocks}</div>
      <section class="sec">
        <h2>${esc(t({ zh: "選修池 · 13 科全讀", en: "Elective pool · all 13" }))}</h2>
        <p class="muted">${esc(t({ zh: "官方 Sem 8 揀 2 科（各 14 cr）。你要讀全部，自學台全開。", en: "Award Sem 8 picks 2 (14 cr each). You want every module, so all 13 are open." }))}</p>
        <div class="grid g2">${(ME.electives || []).map((c) => `<a class="card" href="#/electives/${c.slug}"><p class="subtle">${esc(c.code)}</p><h3>${esc(t({ zh: c.zh, en: c.en }))}</h3></a>`).join("")}</div>
      </section>
      <a class="card" style="margin-top:1rem;display:block" href="#/modules/${encodeURIComponent(ME.ia.code)}">
        <p class="code">${esc(ME.ia.code)}</p>
        <h3>${esc(ME.ia.title)} · ${ME.ia.credits} cr</h3>
        <p class="muted">${esc(ME.ia.note)}</p>
      </a>
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
      ${fileBar("cad/" + slug + ".md", t.name)}
      <p class="muted">${esc(t.why)}</p>
      <p><span class="pill core">${esc(t.role)}</span></p>
      ${bench}
      <section class="sec path"><h2>路徑</h2><ol>${t.path.map((p) => `<li>${esc(p)}</li>`).join("")}</ol></section>
      <section class="sec"><h2>課</h2><div class="grid">${t.lessons.map((l) => lessonBlock(l.id, l.title, l.minutes, l.steps, false)).join("")}</div></section>
      <section class="sec"><h2>指令</h2><div class="cmds">${(t.commands || []).map((c) => `<span>${esc(c.cmd)} · ${esc(c.does)}</span>`).join("")}</div></section>
      ${noteBox("cad-" + slug, "cad/" + slug + ".md")}
      ${footer()}
    `;
  }

  function autoHub() {
    return `
      <p class="kicker">${esc(t({ zh: "07 科 · EME3228 → EME4273", en: "7 courses · EME3228 → EME4273" }))}</p>
      <h1>${esc(t({ zh: "自動化", en: "Automation" }))}</h1>
      <p class="muted">${esc(t({ zh: "順序：電路 → 訊號 → 微機／控制論 → 自控原理 → 工程控制論 → 卡爾曼。Wiener 控制論 ≠ 自控教科書；錢學森工程控制論 ≈ 狀態空間。", en: "Order: circuits → signals → MCU / cybernetics → automatic control → engineering cybernetics → Kalman. Wiener cybernetics ≠ a control textbook; Tsien ≈ state space." }))}</p>
      <div class="grid g2" style="margin-top:1.25rem">
        ${ME.auto.map((c) => `<a class="card" href="#/auto/${c.slug}"><p class="subtle">0${c.order} · ${esc(c.hd)}</p><h3>${esc(t({ zh: c.zh, en: c.en }))}</h3><p class="muted">${esc(t(c.why))}</p></a>`).join("")}
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
      <p class="kicker">${esc(c.hd)}</p>
      <h1>${esc(t({ zh: c.zh, en: c.en }))}</h1>
      ${fileBar("automation/" + slug + ".md", t({ zh: c.zh, en: c.en }))}
      <p class="muted">${esc(t(c.why))}</p>
      <section class="sec"><h2>${esc(t({ zh: "路徑", en: "Path" }))}</h2>
        <ol class="path">${c.path.map((p) => `<li>${esc(t(p))}</li>`).join("")}</ol>
      </section>
      <section class="sec"><h2>${esc(t({ zh: "公式", en: "Formulae" }))}</h2><div class="grid">${c.formulas.map((f) => `<div class="formula">${esc(f.eq)}<div class="subtle">${esc(t(f.mean))}</div></div>`).join("")}</div></section>
      ${bench}
      <section class="sec"><h2>${esc(t({ zh: "課", en: "Lessons" }))}</h2><div class="grid">${c.lessons.map((l) => lessonBlock(l.id, t(l.title), l.minutes, l.steps, true)).join("")}</div></section>
      <section class="sec"><h2>MATLAB</h2><pre class="cmd">${esc(c.matlab)}</pre></section>
      ${noteBox("auto-" + slug, "automation/" + slug + ".md")}
      ${footer()}
    `;
  }

  function electiveHub() {
    return `
      <p class="kicker">${esc(t({ zh: "官方揀 2 · 自學全開", en: "Pick 2 for the award · all 13 open" }))}</p>
      <h1>${esc(t({ zh: "選修 13 科", en: "13 electives" }))}</h1>
      <p class="muted">${esc(t({ zh: "VTC EG524701 Sem 8 選修單元。畢業揀兩科；呢度 13 科全讀。海事處遠洋：輪機 + 應用熱流體。鐵路：車輛 → 軌道 → RST I／II。", en: "VTC EG524701 Sem 8 electives. Award picks two; all 13 are here. Mardep seagoing: marine + thermofluids. Rail: stock → track → RST I/II." }))}</p>
      <div class="grid g2" style="margin-top:1.25rem">
        ${(ME.electives || []).map((c) => `<a class="card" href="#/electives/${c.slug}"><p class="subtle">${String(c.order).padStart(2,"0")} · ${esc(c.code)}</p><h3>${esc(t({ zh: c.zh, en: c.en }))}</h3><p class="muted">${esc(t(c.why))}</p></a>`).join("")}
      </div>
      ${footer()}
    `;
  }

  function electiveCourse(slug) {
    const c = (ME.electives || []).find((x) => x.slug === slug);
    if (!c) return `<h1>${esc(t({ zh: "未找到", en: "Not found" }))}</h1><p><a class="btn sec" href="#/electives">${esc(t({ zh: "返回選修池", en: "Back to electives" }))}</a></p>`;
    const jump = c.jump ? `<p><a class="btn pri" href="#${c.jump.to}">${esc(c.jump.label)}</a></p>` : "";
    return `
      <p class="kicker">${esc(c.code)} · ${esc(c.hd)}</p>
      <h1>${esc(t({ zh: c.zh, en: c.en }))}</h1>
      ${fileBar("electives/" + slug + ".md", t({ zh: c.zh, en: c.en }))}
      <p class="muted">${esc(t(c.why))}</p>
      ${jump}
      <section class="sec"><h2>${esc(t({ zh: "路徑", en: "Path" }))}</h2>
        <ol class="path">${c.path.map((p) => `<li>${esc(t(p))}</li>`).join("")}</ol>
      </section>
      <section class="sec"><h2>${esc(t({ zh: "公式", en: "Formulae" }))}</h2><div class="grid">${c.formulas.map((f) => `<div class="formula">${esc(f.eq)}<div class="subtle">${esc(t(f.mean))}</div></div>`).join("")}</div></section>
      <section class="sec"><h2>${esc(t({ zh: "課", en: "Lessons" }))}</h2><div class="grid">${c.lessons.map((l) => lessonBlock(l.id, t(l.title), l.minutes, l.steps, true)).join("")}</div></section>
      <section class="sec"><h2>MATLAB</h2><pre class="cmd">${esc(c.matlab)}</pre></section>
      ${noteBox("el-" + slug, "electives/" + slug + ".md")}
      ${footer()}
    `;
  }

  function lab() {
    return `
      <p class="kicker">Interactive</p>
      <h1>${esc(t({ zh: "計算台", en: "Lab" }))}</h1>
      <p class="muted">${esc(t({ zh: "RC 一階、一階植物 PID、質量–彈簧、一維卡爾曼。拉 slider 即時重繪。", en: "First-order RC, PID on a first-order plant, mass-spring, 1-D Kalman. Sliders redraw live." }))}</p>
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


  function filesHub() {
    const mods = [];
    ME.semesters.forEach((s) => s.modules.forEach((m) => mods.push({ m, sem: s.id })));
    const cad = ME.tools.map((x) => `<a class="card" href="#/${x.slug}"><p class="subtle">cad/${esc(x.slug)}.md</p><h3>${esc(x.name)}</h3></a>`).join("");
    const auto = ME.auto.map((c) => `<a class="card" href="#/auto/${c.slug}"><p class="subtle">automation/${esc(c.slug)}.md</p><h3>${esc(c.zh)}</h3><p class="subtle">${esc(c.en)}</p></a>`).join("");
    const els = (ME.electives || []).map((c) => `<a class="card" href="#/electives/${c.slug}"><p class="subtle">electives/${esc(c.slug)}.md</p><h3>${esc(c.zh)}</h3><p class="subtle">${esc(c.en)}</p></a>`).join("");
    const mhtml = mods.map(({ m, sem }) => `<a class="card" href="#/modules/${encodeURIComponent(m.code)}"><p class="subtle">${esc(m.code)} · Sem ${sem}</p><h3>${esc(m.title)}</h3><p class="subtle">${esc(m.titleEn)}</p></a>`).join("");
    return `
      <p class="kicker">${mods.length + ME.tools.length + ME.auto.length + (ME.electives || []).length} files · hd-mech-eng</p>
      <h1>檔案庫</h1>
      <p class="muted">課程、軟件、自動化、選修每一項都係一個 file。撳開有內容。私人筆記自動存瀏覽器；GitHub 每週自動補齊缺檔。</p>
      <p><a class="btn pri" href="https://github.com/yip-lgtm/hd-mech-eng" target="_blank" rel="noreferrer">開 GitHub 庫</a></p>
      <section class="sec"><h2>全課程</h2><div class="grid g2">${mhtml}</div></section>
      <section class="sec"><h2>全軟件</h2><div class="grid g2">${cad}</div></section>
      <section class="sec"><h2>全自動化</h2><div class="grid g2">${auto}</div></section>
      <section class="sec"><h2>全選修</h2><div class="grid g2">${els}</div></section>
      ${footer()}
    `;
  }

  function modulePage(code) {
    let m = null, sem = null;
    ME.semesters.forEach((s) => {
      const hit = s.modules.find((x) => x.code === code);
      if (hit) { m = hit; sem = s; }
    });
    if (!m && ME.ia && code === ME.ia.code) {
      m = { code: ME.ia.code, title: ME.ia.title, titleEn: "Industrial Attachment", why: ME.ia.note, study: [ME.ia.note], credits: ME.ia.credits, hours: 0, track: "ia" };
    }
    if (!m) return `<h1>搵唔到呢個 file</h1><p><a class="btn sec" href="#/files">返回檔案庫</a></p>`;
    const gh = moduleGh(m);
    return `
      <p class="kicker">${esc(m.code)}${sem ? " · Sem " + sem.id : ""} · ${m.credits} cr</p>
      <h1>${esc(loadLang() === "en" ? m.titleEn : m.title)}</h1>
      ${fileBar(gh, m.code)}
      <p class="muted">${esc(m.why)}</p>
      <section class="sec path"><h2>${esc(t({ zh: "內容", en: "Contents" }))}</h2><ol>${(m.study || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ol></section>
      <p><a class="btn sec" href="#/curriculum">${esc(t({ zh: "九學期", en: "Semesters" }))}</a> <a class="btn sec" href="#/files">${esc(t({ zh: "檔案庫", en: "Files" }))}</a></p>
      ${noteBox(m.code, gh)}
      ${footer()}
    `;
  }

  function render(opts) {
    document.getElementById("nav-main").innerHTML = navHtml();
    document.getElementById("nav-bot").innerHTML = navHtml();
    document.getElementById("lang-toggle").innerHTML = langHtml();
    bindLang(document.getElementById("lang-toggle"));
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
    else if (p === "/files") html = filesHub();
    else if (p.startsWith("/modules/")) html = modulePage(decodeURIComponent(p.slice("/modules/".length)));
    else if (p.startsWith("/auto/")) html = autoCourse(p.slice(6));
    else if (p.startsWith("/electives/")) html = electiveCourse(p.slice("/electives/".length));
    else if (SOFT.some((s) => p === "/" + s.slug)) html = software(p.slice(1));
    else html = `<h1>${esc(t({ zh: "呢頁冇嘢", en: "Nothing here" }))}</h1><p><a class="btn sec" href="#/">${esc(t({ zh: "返總覽", en: "Home" }))}</a></p>`;
    view.innerHTML = html;
    bindChecks(view);
    bindBenches(view);
    bindNotes(view);
    if (!opts || !opts.keepScroll) window.scrollTo(0, 0);
    document.title = loadLang() === "en" ? "ME Lab · Mechanical Engineering" : "ME Lab · 機械工程自學台";
    document.documentElement.lang = loadLang() === "en" ? "en" : "zh-Hant";
  }

  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "#/";
  else render();
})();
