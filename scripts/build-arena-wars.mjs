#!/usr/bin/env node
/**
 * The daily pen-war board, second edition.
 *
 * Every day the board picks four wars that already have a full written dossier
 * on the site, and the weapons -- each with the real year and the real history
 * of the piece they personify -- argue about those wars.
 *
 * Facts come from the site's own data only: the war brief and theater from
 * feed.json, the weapon history from the catalog and the weapon library.
 * Nothing is invented; the arguments are opinions, the dates and places are
 * not.
 *
 * This script lives in the Pages repo and runs in CI (arena-wars.yml), so the
 * board keeps moving even when no local loop is alive. The other writer owns
 * cute/arena.json; this one owns cute/arena-daily.json.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CUTE = resolve(HERE, "../cute");
const OUT = `${CUTE}/arena-daily.json`;

const readJson = (p) => {
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    console.log(`  ${p} 讀唔到，當空檔`);
    return null;
  }
};

/* ---------- the roster ---------- */

const catalog = readJson(`${CUTE}/catalog.json`);
const lib = readJson(`${CUTE}/weapon-library.json`);
const libArr = Array.isArray(lib) ? lib : lib?.weapons ?? lib?.items ?? [];

const roster = [];
const seenIds = new Set();
for (const c of catalog?.cards ?? []) {
  if (!c?.id || seenIds.has(c.id)) continue;
  seenIds.add(c.id);
  roster.push({
    id: c.id,
    name: c.name,
    designation: c.designation ?? c.id,
    year: Number(c.year) || 0,
    history: c.history ?? "",
    portrait: c.portrait ?? null,
  });
}
for (const w of libArr) {
  if (!w?.id || seenIds.has(w.id)) continue;
  seenIds.add(w.id);
  roster.push({
    id: w.id,
    name: w.name,
    designation: w.designation ?? w.id,
    year: Number(w.year) || 0,
    history: w.history ?? "",
    portrait: w.portrait ?? null,
  });
}
if (!roster.length) {
  console.log("名冊讀唔到，唔寫檔");
  process.exit(0);
}

/** The last clause of the history is the weapon's own voice. */
function traitOf(w) {
  const parts = String(w.history)
    .split("。")
    .map((s) => s.trim())
    .filter(Boolean);
  const tail = parts[parts.length - 1] ?? String(w.history).slice(0, 24);
  return tail.replace(/[，、。;；]+$/, "");
}

/** The first clause: the weapon's own catchphrase, used to close its post. */
function catchOf(w) {
  const parts = String(w.history)
    .split("。")
    .map((s) => s.trim())
    .filter(Boolean);
  const head = parts[0] ?? String(w.history).slice(0, 16);
  return head.replace(/[，、。;；]+$/, "").slice(0, 20);
}

/* ---------- the written wars ---------- */

const feed = readJson(`${CUTE}/feed.json`);
const items = feed?.items ?? [];
const warMap = new Map();
for (const it of items) {
  const b = it.battle;
  if (!b || !b.name || !b.brief) continue;
  if (warMap.has(b.name)) continue;
  warMap.set(b.name, {
    name: b.name,
    year: b.y,
    month: b.m,
    theater: b.theater ?? "戰場",
    brief: b.brief,
    dossier: it.dossierUrl ?? null,
  });
}
const wars = [...warMap.values()].sort((a, b) => (a.year ?? 0) - (b.year ?? 0));

const ERA = (y) => {
  if (y < 1900) return "ancient";
  if (y < 1950) return "modern-war";
  if (y < 2000) return "cold";
  return "current";
};
const buckets = { ancient: [], "modern-war": [], cold: [], current: [] };
for (const w of wars) buckets[ERA(w.year)].push(w);

/* ---------- the writing ---------- */

const TAILS = [
  "，唔使你教。",
  "，你記住就得。",
  "，冇得爭。",
  "，講完算數。",
  "，你自己衡量。",
  "，我唔會再講多一遍。",
  "，呢點係史書寫嘅。",
  "，你唔服都得。",
];

const TEMPLATES = [
  (w, k, prev, sn, th) => `${w}（${k.year}，${th}）：${sn}。我${k.year0}年列裝，${k.trait}。`,
  (w, k, prev, sn, th) => `@${prev.name} 你講${w}就唔好淨講大話。${sn}。我${k.year0}年嘅${k.trait}，唔係講出嚟聽。`,
  (w, k, prev, sn, th) => `講${w}？${sn}。${prev.name} 話就當咗我唔知。我${k.year0}年列裝，${k.trait}。`,
  (w, k, prev, sn, th) => `我${k.year0}年列裝，${k.trait}。${w}嗰年喺${th}開打，${sn}。${prev.name}，你話我冇份？`,
  (w, k, prev, sn, th) => `${prev.name} 上一段我唔認。${w}（${k.year}，${th}）${sn}。我${k.year0}年嘅${k.trait}先算數。`,
  (w, k, prev, sn, th) => `${w}嗰場，${sn}。我${k.year0}年列裝，${k.trait}。${prev.name} 你就係靠把口贏。`,
  (w, k, prev, sn, th) => `@${prev.name} 你要鬥就鬥數。${w}喺${th}，${sn}。我${k.year0}年嘅${k.trait}，攞去出。`,
  (w, k, prev, sn, th) => `我${k.year0}年列裝，${k.trait}。${w}嘅事我知：${sn}。${prev.name} 你講得啱又點？`,
];

const snip = (brief, warName) => {
  let t = String(brief).replace(/\s+/g, " ").trim();
  if (warName && t.startsWith(warName)) t = t.slice(warName.length).replace(/^[（(]?[^）)]{0,18}[）)]?\s*/, "").trim();
  const first = t.split(/[。；]/)[0]?.trim() ?? t;
  if (!first) return String(brief).slice(0, 26);
  if (first.length > 28) {
    const cut = first.slice(0, 28);
    const at = Math.max(cut.lastIndexOf("，"), cut.lastIndexOf("、"));
    return `${at > 8 ? cut.slice(0, at) : cut}…`;
  }
  return first;
};

/** The speakers: the ones closest to the war, plus the two either side. */
function speakers(warYear, n = 12, offset = 0) {
  const scored = roster
    .map((w) => ({ w, d: Math.abs(w.year - warYear) }))
    .sort((a, b) => a.d - b.d || a.w.year - b.w.year);
  // Rotate inside the near set only: two wars of the same era should not
  // field the same cast, but every speaker still has to be of that period.
  if (offset) {
    const near = scored.slice(0, 26);
    const shift = (offset * 9) % near.length;
    scored.splice(0, near.length, ...near.slice(shift), ...near.slice(0, shift));
  }
  const picked = [];
  const seen = new Set();
  for (const s of scored) {
    if (picked.length >= n) break;
    if (seen.has(s.w.id)) continue;
    seen.add(s.w.id);
    picked.push(s.w);
  }
  const rest = roster.filter((w) => !seen.has(w.id));
  const older = rest.filter((w) => w.year < warYear).sort((a, b) => b.year - a.year)[0];
  const newer = rest.filter((w) => w.year > warYear).sort((a, b) => a.year - b.year)[0];
  if (older) picked.push(older);
  if (newer) picked.push(newer);
  return picked.sort((a, b) => a.year - b.year);
}

function buildThread(war, seed) {
  const cast = speakers(war.year, 12, seed % 3);
  const snippet = snip(war.brief, war.name);
  const rounds = cast.map((w, i) => {
    const trait = traitOf(w);
    const year0 = w.year < 0 ? `前${-w.year}` : w.year;
    const prev = i === 0 ? cast[0] : cast[i - 1];
    // The first post opens the thread; it must not answer anybody yet.
    const tpl = i === 0 ? TEMPLATES[0] : TEMPLATES[(i + seed) % TEMPLATES.length];
    const closer = `${catchOf(w)}${TAILS[(i + seed) % TAILS.length]}`;
    const text = tpl(
      war.name,
      { year: war.year < 0 ? `前${-war.year}` : war.year, year0, trait },
      prev,
      snippet,
      war.theater,
    );
    return {
      id: `${war.name}#${w.id}`,
      name: w.name,
      weapon: w.designation,
      year: w.year,
      portrait: w.portrait ?? null,
      text: `${text}${closer}`,
    };
  });
  return {
    id: `war-${war.year}-${war.name}`,
    title: war.name,
    war: {
      name: war.name,
      year: war.year,
      month: war.month ?? null,
      theater: war.theater,
      brief: war.brief,
      dossier: war.dossier,
    },
    rounds,
  };
}

/* ---------- the days ---------- */

const daysWanted = Number(process.argv[2] ?? 21);
const base = new Date();
base.setUTCHours(18, 30, 0, 0);

const outDays = [];
for (let back = daysWanted - 1; back >= 0; back -= 1) {
  const d = new Date(base.getTime() - back * 86400000);
  const key = d.toISOString().slice(0, 10);
  const idx = Math.floor(d.getTime() / 86400000);
  const picks = [];
  // Each bucket turns at its own pace: the recent-war bucket is small, so it
  // advances one step a day instead of three.
  [["ancient", 5], ["modern-war", 3], ["cold", 2], ["current", 1]].forEach(([k, step], oi) => {
    const pool = buckets[k];
    if (!pool.length) return;
    picks.push(pool[(idx * step + oi * 7) % pool.length]);
  });
  const threads = picks.map((w, i) => buildThread(w, idx + i));
  // No two posts in a day may close with the same line.
  const used = new Set();
  for (const t of threads) {
    for (const r of t.rounds) {
      let last = r.text.split("。").filter(Boolean).pop() ?? "";
      let tries = 0;
      while (used.has(last) && tries < TAILS.length) {
        const w = roster.find((x) => x.name === r.name);
        const tail = TAILS[(tries + 3) % TAILS.length];
        const fixed = `${catchOf(w ?? { history: r.text })}${tail}`;
        r.text = r.text.replace(/[^。]*$/, fixed);
        last = fixed.replace(/。$/, "");
        tries += 1;
      }
      used.add(last);
    }
  }
  outDays.push({
    date: `${key}-18:30`,
    topic: {
      id: `wars-${key}`,
      name: `${threads.length}場戰爭`,
      brief: "今日唔講熱帖，講返呢個站已經寫咗全文嘅戰爭。兵器娘自己開枱，逐場互噴。",
    },
    threads,
  });
}

writeFileSync(
  OUT,
  JSON.stringify(
    { note: "每日筆戰：每日四場已寫嘅歷史戰爭，兵器娘用自己打過嘅仗互噴。事實來自本站全文，冇编造。", days: outDays },
    null,
    1,
  ) + "\n",
);
console.log(
  `戰爭板 → ${OUT}｜${outDays.length} 日｜名冊 ${roster.length} 件｜戰爭 ${wars.length} 場｜今日 ${
    outDays[outDays.length - 1]?.threads.length ?? 0
  } 場`,
);
for (const t of outDays[outDays.length - 1]?.threads ?? []) console.log(`  - ${t.war.year} ${t.title}（${t.war.theater}）${t.rounds.length} 樓`);
