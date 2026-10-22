const LETTERS = ["A", "B", "C", "D", "E"];
const COLS = [
  { row: 21, n: 11, p: 1 }, { row: 22, n: 10, p: 2 }, { row: 23, n: 10, p: 3 }, { row: 24, n: 10, p: 4 },
  { row: 31, n: 8, p: 1 }, { row: 32, n: 8, p: 2 }, { row: 33, n: 7, p: 3 }, { row: 34, n: 7, p: 4 },
  { row: 41, n: 7, p: 1 }, { row: 42, n: 6, p: 2 }, { row: 43, n: 6, p: 3 }, { row: 44, n: 5, p: 4 },
  { row: 51, n: 5, p: 1 }, { row: 52, n: 5, p: 2 }, { row: 53, n: 4, p: 3 }, { row: 54, n: 4, p: 4 },
  { row: 61, n: 3, p: 1 }, { row: 62, n: 3, p: 2 }, { row: 63, n: 2, p: 3 }, { row: 64, n: 2, p: 4 },
  { row: 71, n: 1, p: 1 }, { row: 72, n: 1, p: 2 }
];
const NAILS = [];
function addNails(row, n, elevs, len) {
  for (let i = 1; i <= n; i++) {
    const angle = i <= n - 3 ? 0 : [10, 15, 25][i - (n - 2)];
    NAILS.push({ id: row + "-" + i, kind: "nail", row: row, no: i, elev: elevs[i - 1], length: len, angle: angle });
  }
}
addNails("A", 8, [48, 48, 47.5, 47.5, 47.5, 47, 47, 47], 11.2);
addNails("B", 9, [46, 46, 45.5, 45.5, 45.5, 45, 45, 45, 45], 10.2);
addNails("C", 9, [45, 45, 43.5, 43.5, 43.5, 43, 43, 43, 43], 9.2);

const PITS = [];
const seen = {};
COLS.forEach(function (col, ci) {
  for (let i = 0; i < col.n; i++) {
    const letter = LETTERS[i % 5];
    const mk = col.p + letter;
    const key = col.row + "-" + mk;
    seen[key] = (seen[key] || 0) + 1;
    PITS.push({
      id: "R" + col.row + "-" + mk + "-" + seen[key],
      kind: "pit", row: col.row, marker: mk, letter: letter,
      col: ci, stack: i, n: seen[key]
    });
  }
});
const ALL = PITS.concat(NAILS);
const STATUS = [
  { v: "none", t: "未開始" },
  { v: "exc", t: "已開挖" },
  { v: "nfc", t: "已灌" },
  { v: "done", t: "已核實" }
];
function esc(s) {
  return String(s || "").split("&").join("&" + "amp;").split('"').join("&" + "quot;").split("<").join("&" + "lt;");
}
function db() {
  return new Promise(function (res, rej) {
    const r = indexedDB.open("ylc-grid", 1);
    r.onupgradeneeded = function () {
      const d = r.result;
      if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta");
      if (!d.objectStoreNames.contains("photos")) d.createObjectStore("photos");
    };
    r.onsuccess = function () { res(r.result); };
    r.onerror = function () { rej(r.error); };
  });
}
function get(store, key) {
  return db().then(function (d) {
    return new Promise(function (res, rej) {
      const q = d.transaction(store).objectStore(store).get(key);
      q.onsuccess = function () { res(q.result); };
      q.onerror = function () { rej(q.error); };
    });
  });
}
function put(store, key, val) {
  return db().then(function (d) {
    return new Promise(function (res, rej) {
      const tx = d.transaction(store, "readwrite");
      tx.objectStore(store).put(val, key);
      tx.oncomplete = function () { res(); };
      tx.onerror = function () { rej(tx.error); };
    });
  });
}
function allStore(store) {
  return db().then(function (d) {
    return new Promise(function (res, rej) {
      const tx = d.transaction(store);
      const q = tx.objectStore(store).getAll();
      const k = tx.objectStore(store).getAllKeys();
      q.onsuccess = function () {
        k.onsuccess = function () {
          const o = {};
          k.result.forEach(function (id, i) { o[id] = q.result[i]; });
          res(o);
        };
      };
      q.onerror = function () { rej(q.error); };
    });
  });
}
function loadMeta() {
  try { return JSON.parse(localStorage.getItem("ylc-meta") || "{}"); } catch (e) { return {}; }
}
function saveMeta() {
  try {
    localStorage.setItem("ylc-meta", JSON.stringify(META));
    const el = document.getElementById("saved");
    if (el) el.textContent = "已儲存";
    return true;
  } catch (e) {
    const el = document.getElementById("saved");
    if (el) el.textContent = "儲存失敗";
    return false;
  }
}
let META = loadMeta();
let PHOTOS = {};
function meta(id) { return META[id] || { status: "none", excavate: "", nfc: "", note: "" }; }
function show(item) {
  const q = document.getElementById("q").value.trim().toLowerCase();
  const f = document.getElementById("filter").value;
  const m = meta(item.id);
  if (f === "pit" && item.kind !== "pit") return false;
  if (f === "nail" && item.kind !== "nail") return false;
  if (["none", "exc", "nfc", "done"].indexOf(f) >= 0 && m.status !== f) return false;
  if (q && (item.id + " " + (item.marker || "") + " " + item.row).toLowerCase().indexOf(q) < 0) return false;
  return true;
}
function opts(cur) {
  return STATUS.map(function (s) {
    return '<option value="' + s.v + '"' + (s.v === cur ? " selected" : "") + ">" + s.t + "</option>";
  }).join("");
}
function cellBtn(item, top, mid) {
  const m = meta(item.id);
  const has = (PHOTOS[item.id] || []).length;
  const cls = item.kind === "nail" ? "nail" : "letter-" + item.letter;
  return '<div class="cell ' + cls + " " + m.status + (has ? " has" : "") + '" data-id="' + item.id + '">' +
    '<div class="mk" data-open="' + item.id + '">' + top + "</div>" +
    '<div class="sub">' + mid + "</div>" +
    '<select data-status="' + item.id + '">' + opts(m.status) + "</select></div>";
}
function render() {
  const c = { none: 0, exc: 0, nfc: 0, done: 0, photo: 0 };
  ALL.forEach(function (it) {
    const m = meta(it.id);
    c[m.status] = (c[m.status] || 0) + 1;
    if ((PHOTOS[it.id] || []).length) c.photo++;
  });
  document.getElementById("stats").innerHTML =
    '<span class="chip">坑 <b>' + PITS.length + "</b></span>" +
    '<span class="chip">釘 <b>' + NAILS.length + "</b></span>" +
    '<span class="chip">未開始 <b>' + (c.none || 0) + "</b></span>" +
    '<span class="chip">已開挖 <b>' + (c.exc || 0) + "</b></span>" +
    '<span class="chip">已灌 <b>' + (c.nfc || 0) + "</b></span>" +
    '<span class="chip">已核實 <b>' + (c.done || 0) + "</b></span>" +
    '<span class="chip">有相 <b>' + c.photo + "</b></span>";

  let html = '<section class="band"><h3>Soil nails · left of pits · C / B / A down the slope</h3><div class="nailgrid">';
  html += '<div class="nhead">C</div><div class="nhead">B</div><div class="nhead">A</div>';
  for (let i = 1; i <= 9; i++) {
    ["C", "B", "A"].forEach(function (row) {
      const n = NAILS.filter(function (x) { return x.row === row && x.no === i; })[0];
      if (!n || !show(n)) { html += '<div class="empty"></div>'; return; }
      html += cellBtn(n, n.id, n.elev);
    });
  }
  html += "</div></section>";

  html += '<section class="band"><h3>NFC pits · 124 · columns = Row · rows downslope A-B-C-D-E</h3><div class="tri">';
  html += '<div class="heads"><div></div>';
  COLS.forEach(function (col) {
    html += '<div class="head">' + col.row + "</div>";
  });
  html += "</div>";
  const max = 11;
  for (let r = 0; r < max; r++) {
    html += '<div class="grid"><div class="rlabel">' + LETTERS[r % 5] + "</div>";
    COLS.forEach(function (col, ci) {
      const pit = PITS.filter(function (p) { return p.col === ci && p.stack === r; })[0];
      if (!pit || !show(pit)) {
        html += '<div class="empty"></div>';
        return;
      }
      html += cellBtn(pit, pit.marker, "");
    });
    html += "</div>";
  }
  html += "</div></section>";
  document.getElementById("plan").innerHTML = html;
  document.querySelectorAll(".cell").forEach(function (el) {
    el.onclick = function (ev) {
      if (ev.target.tagName === "SELECT") return;
      edit(el.getAttribute("data-id"));
    };
  });
  document.querySelectorAll("[data-status]").forEach(function (el) {
    el.onchange = function (ev) {
      ev.stopPropagation();
      const id = el.getAttribute("data-status");
      const cur = meta(id);
      META[id] = { status: el.value, excavate: cur.excavate || "", nfc: cur.nfc || "", note: cur.note || "" };
      saveMeta();
      put("meta", "all", META).catch(function () {});
      render();
    };
  });
}
function edit(id) {
  const item = ALL.filter(function (x) { return x.id === id; })[0];
  if (!item) return;
  location.hash = id;
  const m = meta(id);
  const photos = PHOTOS[id] || [];
  const info = item.kind === "nail"
    ? "elev " + item.elev + " mPD / " + item.angle + " deg / " + item.length + " m"
    : "Row " + item.row + " / " + item.marker + " / stack " + (item.stack + 1);
  const opts = STATUS.map(function (s) {
    return '<option value="' + s.v + '"' + (s.v === m.status ? " selected" : "") + ">" + s.t + "</option>";
  }).join("");
  document.getElementById("card").innerHTML =
    "<h2>" + item.id + "</h2>" +
    '<div class="note">' + (item.kind === "nail" ? "Soil nail" : "NFC pit") + " · " + info + "</div>" +
    '<div class="grid2">' +
    '<div class="field"><label>狀態</label><select id="f-status">' + opts + "</select></div>" +
    '<div class="field"><label>開始日期</label><input id="f-exc" type="date" value="' + (m.excavate || "") + '"></div>' +
    '<div class="field"><label>完成日期</label><input id="f-nfc" type="date" value="' + (m.nfc || "") + '"></div>' +
    '<div class="field"><label>備註</label><input id="f-note" type="text" value="' + esc(m.note) + '"></div>' +
    "</div>" +
    '<div class="field"><label>上載相片</label><input id="f-photo" type="file" accept="image/*" multiple><div class="photos" id="photoBox"></div></div>' +
    '<div class="actions"><button class="primary" id="saveBtn">儲存</button><button id="dlBtn">下載 HTML</button><button id="closeBtn">關閉</button></div>' +
    '<div class="note">#' + id + "</div>";
  const box = document.getElementById("photoBox");
  photos.forEach(function (src, i) {
    const fig = document.createElement("figure");
    const img = document.createElement("img");
    img.src = src;
    const btn = document.createElement("button");
    btn.textContent = "移除";
    btn.onclick = function () {
      photos.splice(i, 1);
      PHOTOS[id] = photos;
      put("photos", id, photos).then(function () { edit(id); });
    };
    fig.appendChild(img);
    fig.appendChild(btn);
    box.appendChild(fig);
  });
  document.getElementById("f-photo").onchange = function (e) {
    const files = Array.prototype.slice.call(e.target.files);
    Promise.all(files.map(readFile)).then(function (urls) {
      urls.forEach(function (u) { photos.push(u); });
      PHOTOS[id] = photos;
      put("photos", id, photos).then(function () { edit(id); });
    });
  };
  document.getElementById("saveBtn").onclick = function () {
    META[id] = {
      status: document.getElementById("f-status").value,
      excavate: document.getElementById("f-exc").value,
      nfc: document.getElementById("f-nfc").value,
      note: document.getElementById("f-note").value
    };
    saveMeta();
    put("meta", "all", META).catch(function () {});
    document.getElementById("overlay").classList.remove("open");
    document.getElementById("saved").textContent = "已儲存 " + id;
    render();
  };
  document.getElementById("dlBtn").onclick = function () {
    const html = "<!DOCTYPE html><meta charset=UTF-8><title>" + item.id + "</title><body><h1>" + item.id + "</h1><p>" + info + "</p>" + photos.map(function (s) { return '<img src="' + s + '" style="max-width:100%">'; }).join("") + "</body>";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = item.id + ".html";
    a.click();
  };
  document.getElementById("closeBtn").onclick = function () {
    document.getElementById("overlay").classList.remove("open");
    history.replaceState(null, "", location.pathname);
  };
  document.getElementById("overlay").classList.add("open");
}
function readFile(f) {
  return new Promise(function (res, rej) {
    const r = new FileReader();
    r.onload = function () { res(r.result); };
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}
document.getElementById("q").oninput = render;
document.getElementById("filter").onchange = render;
document.getElementById("overlay").onclick = function (e) {
  if (e.target.id === "overlay") document.getElementById("overlay").classList.remove("open");
};
document.getElementById("exportBtn").onclick = function () {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ meta: META, photos: PHOTOS })], { type: "application/json" }));
  a.download = "YLC-grid.json";
  a.click();
};
document.getElementById("importBtn").onclick = function () { document.getElementById("importFile").click(); };
document.getElementById("importFile").onchange = function (e) {
  const file = e.target.files[0];
  if (!file) return;
  file.text().then(function (text) {
    const data = JSON.parse(text);
    META = data.meta || {};
    PHOTOS = data.photos || {};
    saveMeta();
    put("meta", "all", META).catch(function () {});
    Promise.all(Object.keys(PHOTOS).map(function (k) { return put("photos", k, PHOTOS[k]); })).then(render);
  });
};
render();
Promise.all([get("meta", "all").catch(function () { return {}; }), allStore("photos").catch(function () { return {}; })]).then(function (pair) {
  if (!Object.keys(META).length && pair[0]) META = pair[0];
  PHOTOS = pair[1] || {};
  saveMeta();
  render();
  const h = location.hash.slice(1);
  if (h && ALL.some(function (x) { return x.id === h; })) edit(h);
}).catch(function () {});
