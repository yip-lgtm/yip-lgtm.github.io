#!/usr/bin/env node
/**
 * The Chinese half of a dossier has to be traditional. A writer that slipped
 * one simplified character into it, or a whole file written in simplified,
 * gets fixed here — but only the Chinese fields are touched.
 *
 *   node fix-trad.mjs [dir]
 *
 * `dir` may be the folder that holds the dossiers, or the parent that holds a
 * `dossiers/` sub-folder. Both the flat shape the site publishes
 * (`countries` + `countriesEn`) and the nested shape some writers produce
 * (`countries: { zh, en }`) are handled.
 *
 * The conversion tables come from OpenCC (Apache-2.0): s2t-data.json holds
 * one-to-one character pairs and phrase pairs. Characters that are also valid
 * traditional forms (里, 面, 云 …) are deliberately left alone — the phrase
 * table decides those, so 「里程」 stays 「里程」 and 「里面」 becomes 「裡面」.
 * 后 is the one exception: it is 後 ("after") unless a queen follows
 * 太后 / 皇后 / 王后 / 母后 / 元后.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const arg = process.argv[2] || "/workspace/.s2/pages/cute/dossiers";
// A parent folder holds both dossiers/ and campaigns/; a bare folder holds
// one kind of file. The card face lives in the campaign file, so both have to
// be swept — the brief on the site comes from there.
const PARENT = existsSync(join(arg, "dossiers")) ? arg : null;
// A .json file is the merged feed / daily index: an array of card records.
const IS_FILE = arg.endsWith(".json") && existsSync(arg) && statSync(arg).isFile();
const DIRS = IS_FILE ? [] : PARENT
  ? [join(PARENT, "dossiers"), join(PARENT, "campaigns")].filter((d) => existsSync(d))
  : [arg];
// The conversion tables live next to this script so the CI can run the same
// sweep: a card the writer produced in simplified would otherwise go live.
const DATA = [join(HERE, "s2t-data.json"), join("/workspace/qa", "s2t-data.json")]
  .find((p) => existsSync(p));
const SECTIONS = ["countries", "people", "kits", "tactics", "data", "cause", "impact", "result"];

const { chars, phrases } = JSON.parse(readFileSync(DATA, "utf8"));

// Phrases are matched longest first, but only when they start with the same
// character — that keeps the lookup to a couple of candidates per position.
const byFirst = new Map();
let maxPhrase = 1;
for (const [key, to] of Object.entries(phrases)) {
  const head = key[0];
  if (!byFirst.has(head)) byFirst.set(head, []);
  byFirst.get(head).push([key, to]);
  if (key.length > maxPhrase) maxPhrase = key.length;
}
for (const list of byFirst.values()) list.sort((a, b) => b[0].length - a[0].length);

// 后 is the empress (皇后 / 王后 / 母后 / 太后) far more often than it is the
// simplified 「after」 — so only the queen readings stay as 后.
const QUEEN_PREV = /[太皇王母元為]/;
const QUEEN_NEXT = /[妃宮]/;

export function toTraditional(text) {
  if (!text) return text;
  let out = "";
  let i = 0;
  while (i < text.length) {
    const head = text[i];
    const list = byFirst.get(head);
    let matched = null;
    let matchedLen = 0;
    if (list) {
      const limit = Math.min(maxPhrase, text.length - i);
      for (let len = limit; len >= 2; len--) {
        const slice = text.slice(i, i + len);
        for (const [key, to] of list) {
          if (key.length === len && key === slice) {
            matched = to;
            matchedLen = len;
            break;
          }
        }
        if (matched !== null) break;
      }
    }
    if (matched !== null) {
      out += matched;
      i += matchedLen; // 原文長度，唔係替換後長度
      continue;
    }
    const c = text[i];
    if (c === "后") {
      const prev = text[i - 1] ?? "";
      const next = text[i + 1] ?? "";
      out += QUEEN_PREV.test(prev) || QUEEN_NEXT.test(next) ? "后" : "後";
    } else {
      out += chars[c] ?? c;
    }
    i++;
  }
  return out;
}

// Both shapes show up: flat (`countries` is a string) and nested
// (`countries` is { zh, en }).
function zhOf(doc, key) {
  const v = doc[key];
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    return String(v.zh ?? v.zhHant ?? v.cn ?? "");
  }
  return "";
}

let fixed = 0;
let touched = 0;
let scanned = 0;

// The card face of one record: brief + theater, wherever they sit.
function sweepFace(doc) {
  let changed = false;
  for (const [holder, key] of [[doc, "theater"], [doc.battle, "theater"], [doc.battle, "brief"], [doc, "brief"]]) {
    if (!holder || typeof holder[key] !== "string" || !holder[key]) continue;
    const after = toTraditional(holder[key]);
    if (after !== holder[key]) {
      holder[key] = after;
      changed = true;
      touched++;
    }
  }
  // The weapon block is shown on the card as well, and an older task sheet can
  // still carry the simplified wording of the weapon's history.
  if (doc.kit && typeof doc.kit === "object") {
    for (const key of ["name", "designation", "history"]) {
      if (typeof doc.kit[key] !== "string" || !doc.kit[key]) continue;
      const after = toTraditional(doc.kit[key]);
      if (after !== doc.kit[key]) {
        doc.kit[key] = after;
        changed = true;
        touched++;
      }
    }
  }
  return changed;
}

// The sweep only runs when this file is executed; another script can
// import toTraditional() without touching a single dossier.
if (process.argv[1] && process.argv[1].endsWith("fix-trad.mjs")) {
  for (const DIR of DIRS)
  for (const file of readdirSync(DIR)) {
    if (!file.endsWith(".json")) continue;
    const path = join(DIR, file);
    if (!statSync(path).isFile()) continue;
    scanned++;
    let doc;
    try {
      doc = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      continue;
    }
    // The card face also carries Chinese: battle.brief and battle.theater are
    // shown on the site, so they need the same treatment as the eight sections.
    let changed = sweepFace(doc);
    for (const key of SECTIONS) {
      const before = zhOf(doc, key);
      if (!before) continue;
      const after = toTraditional(before);
      if (after !== before) {
        if (typeof doc[key] === "string") doc[key] = after;
        else doc[key].zh = after;
        changed = true;
        touched++;
      }
    }
    if (changed) {
      writeFileSync(path, JSON.stringify(doc, null, 1) + "\n");
      fixed++;
    }
  }
  if (IS_FILE) {
    let doc;
    try {
      doc = JSON.parse(readFileSync(arg, "utf8"));
    } catch {
      doc = null;
    }
    const list = Array.isArray(doc) ? doc : doc?.items ?? doc?.feed ?? null;
    if (list) {
      let n = 0;
      for (const item of list) if (sweepFace(item)) n++;
      if (n) writeFileSync(arg, JSON.stringify(doc, null, 1) + "\n");
      console.log(`fix-trad: ${arg} ${list.length} 條，改咗 ${n} 條`);
    } else {
      console.log(`fix-trad: ${arg} 唔係 feed 格式，skip`);
    }
  }

  console.log(`fix-trad: ${scanned} 個檔案，${fixed} 個改咗，${touched} 段轉換`);
}
