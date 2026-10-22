const SEQUENCE = {
  21: ["1A","1A","1C","1C","1E","1E","1B","1B","1D","1D"],
  22: ["2A","2A","2C","2C","2E","2E","2B","2B","2D","2D"],
  23: ["3A","3A","3C","3C","3E","3E","3B","3B","3D","3D"],
  24: ["4A","4A","4C","4C","4E","4E","4B","4B","4D","4D"],
  31: ["1A","1A","1C","1C","1E","1B","1D","1D"],
  32: ["2A","2A","2C","2C","2E","2B","2D","2D"],
  33: ["3A","3A","3C","3E","3B","3B","3D"],
  34: ["4A","4A","4C","4E","4B","4B","4D"],
  41: ["1A","1A","1C","1E","1B","1B","1D"],
  42: ["2A","2A","2C","2E","2B","2D"],
  43: ["3A","3A","3C","3E","3B","3D"],
  44: ["4A","4C","4E","4B","4D"],
  51: ["1A","1C","1E","1B","1D"],
  52: ["2A","2C","2E","2B","2D"],
  53: ["3A","3C","3B","3D"],
  54: ["4A","4C","4B","4D"],
  61: ["1A","1C","1B"],
  62: ["2A","2C","2B"],
  63: ["3A","3B"],
  64: ["4A","4B"],
  71: ["1A"],
  72: ["2A"]
};
const BANDS = [
  ["Row 21-24", [21,22,23,24]],
  ["Row 31-34", [31,32,33,34]],
  ["Row 41-44", [41,42,43,44]],
  ["Row 51-54", [51,52,53,54]],
  ["Row 61-64", [61,62,63,64]],
  ["Row 71-72", [71,72]]
];
const NAILS = [];
function addNails(row, n, elevs, len) {
  for (let i = 1; i <= n; i++) {
    const angle = i <= n - 3 ? 0 : [10, 15, 25][i - (n - 2)];
    NAILS.push({ id: row + "-" + i, kind: "nail", row: row, no: i, elev: elevs[i - 1], length: len, angle: angle, dia: 150, bar: 40, load: 256.3, socket: 2 });
  }
}
addNails("A", 8, [48, 48, 47.5, 47.5, 47.5, 47, 47, 47], 11.2);
addNails("B", 9, [46, 46, 45.5, 45.5, 45.5, 45, 45, 45, 45], 10.2);
addNails("C", 9, [45, 45, 43.5, 43.5, 43.5, 43, 43, 43, 43], 9.2);
const PITS = [];
const seen = {};
Object.keys(SEQUENCE).map(Number).forEach(function (row) {
  SEQUENCE[row].forEach(function (mk, i) {
    const k = row + "-" + mk;
    seen[k] = (seen[k] || 0) + 1;
    PITS.push({ id: "R" + row + "-" + mk + "-" + seen[k], kind: "pit", row: row, marker: mk, letter: mk.slice(-1), seq: i + 1, n: seen[k] });
  });
});
const ALL = PITS.concat(NAILS);
const STATUS = [
  { v: "none", t: "not started" },
  { v: "exc", t: "excavated" },
  { v: "nfc", t: "filled" },
  { v: "done", t: "verified" }
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
let META = {};
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
function cell(item) {
  const m = meta(item.id);
  const st = STATUS.filter(function (s) { return s.v === m.status; })[0] || STATUS[0];
  const has = (PHOTOS[item.id] || []).length;
  const cls = item.kind === "nail" ? "nail" : "letter-" + item.letter;
  const top = item.kind === "nail" ? item.id : item.marker;
  const mid = item.kind === "nail" ? item.elev + " mPD" : item.id;
  return '<button class="cell ' + cls + " " + m.status + (has ? " has" : "") + '" data-id="' + item.id + '"><div class="mk">' + top + '</div><div class="sub">' + mid + '</div><div class="sub">' + st.t + (has ? " / " + has + " photo" : "") + "</div></button>";
}
function render() {
  const c = { none: 0, exc: 0, nfc: 0, done: 0, photo: 0 };
  ALL.forEach(function (it) {
    const m = meta(it.id);
    c[m.status] = (c[m.status] || 0) + 1;
    if ((PHOTOS[it.id] || []).length) c.photo++;
  });
  document.getElementById("stats").innerHTML =
    '<span class="chip">pits <b>' + PITS.length + "</b></span>" +
    '<span class="chip">nails <b>' + NAILS.length + "</b></span>" +
    '<span class="chip">none <b>' + (c.none || 0) + "</b></span>" +
    '<span class="chip">exc <b>' + (c.exc || 0) + "</b></span>" +
    '<span class="chip">filled <b>' + (c.nfc || 0) + "</b></span>" +
    '<span class="chip">done <b>' + (c.done || 0) + "</b></span>" +
    '<span class="chip">photo <b>' + c.photo + "</b></span>";
  let html = '<section class="band"><h3>Soil nails 26 · A 11.2 m / B 10.2 m / C 9.2 m · dia 150 · 20 deg · Y40 · 256.3 kN</h3>';
  ["A", "B", "C"].forEach(function (row) {
    const list = NAILS.filter(function (n) { return n.row === row && show(n); });
    html += '<div class="line"><div class="lbl">Row ' + row + "<br>" + NAILS.filter(function (n) { return n.row === row; }).length + '</div><div class="cells">' + (list.map(cell).join("") || "-") + "</div></div>";
  });
  html += "</section>";
  BANDS.forEach(function (band) {
    html += '<section class="band"><h3>NFC pits · ' + band[0] + "</h3>";
    band[1].forEach(function (row) {
      const pits = PITS.filter(function (p) { return p.row === row && show(p); });
      html += '<div class="line"><div class="lbl">Row ' + row + "<br>" + SEQUENCE[row].length + '</div><div class="cells">' + (pits.map(cell).join("") || "-") + "</div></div>";
    });
    html += "</section>";
  });
  document.getElementById("plan").innerHTML = html;
  document.querySelectorAll(".cell").forEach(function (el) {
    el.onclick = function () { edit(el.getAttribute("data-id")); };
  });
}
function edit(id) {
  const item = ALL.filter(function (x) { return x.id === id; })[0];
  if (!item) return;
  location.hash = id;
  const m = meta(id);
  const photos = PHOTOS[id] || [];
  const info = item.kind === "nail"
    ? "elev " + item.elev + " mPD / " + item.angle + " deg / " + item.length + " m / dia " + item.dia + " / Y" + item.bar
    : "Row " + item.row + " / " + item.marker + " / no." + item.seq;
  const opts = STATUS.map(function (s) {
    return '<option value="' + s.v + '"' + (s.v === m.status ? " selected" : "") + ">" + s.t + "</option>";
  }).join("");
  document.getElementById("card").innerHTML =
    "<h2>" + item.id + "</h2>" +
    '<div class="note">' + (item.kind === "nail" ? "Soil nail" : "NFC pit") + " · " + info + "</div>" +
    '<div class="grid2">' +
    '<div class="field"><label>status</label><select id="f-status">' + opts + "</select></div>" +
    '<div class="field"><label>start date</label><input id="f-exc" type="date" value="' + (m.excavate || "") + '"></div>' +
    '<div class="field"><label>finish date</label><input id="f-nfc" type="date" value="' + (m.nfc || "") + '"></div>' +
    '<div class="field"><label>note</label><input id="f-note" type="text" value="' + esc(m.note) + '"></div>' +
    "</div>" +
    '<div class="field"><label>upload photos</label><input id="f-photo" type="file" accept="image/*" multiple><div class="photos" id="photoBox"></div></div>' +
    '<div class="actions"><button class="primary" id="saveBtn">save</button><button id="dlBtn">download html</button><button id="closeBtn">close</button></div>' +
    '<div class="note">#' + id + " · photos stay in this browser</div>";
  const box = document.getElementById("photoBox");
  photos.forEach(function (src, i) {
    const fig = document.createElement("figure");
    const img = document.createElement("img");
    img.src = src;
    const btn = document.createElement("button");
    btn.textContent = "remove";
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
    put("meta", "all", META).then(function () {
      document.getElementById("overlay").classList.remove("open");
      render();
    });
  };
  document.getElementById("dlBtn").onclick = function () {
    const html = "<!DOCTYPE html><meta charset=UTF-8><title>" + item.id + "</title><body><h1>" + item.id + "</h1><p>" + info + "</p><p>" + (m.note || "") + "</p>" + photos.map(function (s) { return '<img src="' + s + '" style="max-width:100%">'; }).join("") + "</body>";
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
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ meta: META, photos: PHOTOS, exported: new Date().toISOString() })], { type: "application/json" }));
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
    put("meta", "all", META).then(function () {
      const jobs = Object.keys(PHOTOS).map(function (k) { return put("photos", k, PHOTOS[k]); });
      return Promise.all(jobs);
    }).then(render);
  });
};
render();
Promise.all([get("meta", "all").catch(function () { return {}; }), allStore("photos").catch(function () { return {}; })]).then(function (pair) {
  META = pair[0] || {};
  PHOTOS = pair[1] || {};
  render();
  const h = location.hash.slice(1);
  if (h && ALL.some(function (x) { return x.id === h; })) edit(h);
}).catch(function () {});
