#!/usr/bin/env node
/**
 * Fill the feed: write campaigns for the wars that have none, and write the
 * dossiers for the campaigns that have none.
 *
 * The hourly job writes one campaign an hour, which is right for a site
 * that adds a battle every hour. The war index now holds every conflict the
 * source lists document, and this writes as many of them as the plan
 * allows: it stops at the first refusal from the service, and it can be run
 * again to carry on where it stopped.
 *
 *   BULK_LIMIT   how many campaigns to write in this run (default 20)
 *   DOSSIER_LIMIT  how many dossiers to write in this run (default 20)
 *   SKIP_DOSSIERS 1 to write campaigns only
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { postJsonOrThrow } from "./minimax.mjs";
import { kitPortrait, loadPortraitIndex, loadLibrary } from "./kit-portrait.mjs";
import { dossierFile } from "./split-dossiers.mjs";
import { SPANS, pickWar, pickKit, briefPrompt, dossierPrompt, DOSSIER_SECTIONS } from "./campaign-prompt.mjs";

/** The map position the writer gave, if it gave a usable one. */
function placeOf(raw) {
  const lng = Number(raw?.place?.lng);
  const lat = Number(raw?.place?.lat);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (Math.abs(lng) > 180 || Math.abs(lat) > 90) return null;
  return { lng: Math.round(lng * 100) / 100, lat: Math.round(lat * 100) / 100 };
}

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const feedPath = resolve(process.env.FEED_OUT || join(REPO, "cute/feed.json"));
const indexPath = resolve(process.env.WAR_INDEX || join(REPO, "cute/war-index.json"));
const dir = resolve(process.env.DOSSIER_DIR || join(REPO, "cute/dossiers"));
const key = process.env.MINIMAX_API_KEY;
if (!key) {
  console.error("MINIMAX_API_KEY missing");
  process.exit(1);
}
if (!existsSync(feedPath) || !existsSync(indexPath)) {
  console.error(`feed or war index missing: ${feedPath} / ${indexPath}`);
  process.exit(1);
}

const model = process.env.MINIMAX_MODEL || "MiniMax-M3.1-Flash-Preview";
const base = (process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1").replace(/\/$/, "");
const TIMEOUT_MS = Number(process.env.FEED_TIMEOUT_MS || 1_800_000);
const QUOTA = /Token Plan usage limit|rate_limit_error/i;
const MIN_TOTAL = Number(process.env.DOSSIER_MIN_TOTAL || 1200);
const MIN_SECTION = Number(process.env.DOSSIER_MIN_SECTION || 150);

const feed = JSON.parse(readFileSync(feedPath, "utf8"));
const index = JSON.parse(readFileSync(indexPath, "utf8"));
const library = loadLibrary(readFileSync, [
  process.env.WEAPON_LIBRARY,
  join(REPO, "cute/weapon-library.json"),
  join(REPO, "public/weapon-library.json"),
]);
const portraitIndex = loadPortraitIndex(readFileSync, [
  process.env.PORTRAIT_INDEX,
  join(REPO, "cute/portrait-index.json"),
  join(REPO, "public/portrait-index.json"),
]);
mkdirSync(dir, { recursive: true });

async function ask(prompt, system, temperature, maxTokens) {
  const body = await postJsonOrThrow(
    `${base}/chat/completions`,
    {
      model,
      temperature,
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    },
    { headers: { Authorization: `Bearer ${key}` }, timeoutMs: TIMEOUT_MS },
  );
  const raw = body.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const blob = cleaned.includes("{") ? cleaned : raw;
  let depth = 0;
  let from = -1;
  let inString = false;
  let escaped = false;
  const candidates = [];
  for (let i = 0; i < blob.length; i++) {
    const ch = blob[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") {
      if (depth === 0) from = i;
      depth++;
    } else if (ch === "}") {
      if (depth > 0) {
        depth--;
        if (depth === 0 && from >= 0) candidates.push(blob.slice(from, i + 1));
      }
    }
  }
  for (const candidate of candidates.reverse()) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // not this one
    }
  }
  throw new Error("no usable json in reply");
}

const LIMITS = { briefs: Number(process.env.BULK_LIMIT || 20), dossiers: Number(process.env.DOSSIER_LIMIT || 20) };
let wroteBriefs = 0;
let wroteDossiers = 0;
let stopped = "";

for (let n = 0; n < LIMITS.briefs; n++) {
  const picked = pickWar(index, feed);
  if (!picked) break;
  const { war, repeat } = picked;
  const taken = (feed.items ?? []).some((it) => it.battle?.name === war.name);
  if (taken && !repeat) continue;
  let item;
  try {
    const libraryKit = pickKit(war, library, (feed.items?.length ?? 0));
    const raw = await ask(
      briefPrompt(war, libraryKit),
      "只用繁體中文。最後只留一個 JSON 物件。不要長篇推理，直接輸出答案。",
      0.6,
      Number(process.env.FEED_MAX_TOKENS || 16000),
    );
    const brief = String(raw.brief ?? "").replace(/\s+/g, " ").trim();
    const kit = raw.kit ?? {};
    const history = String(kit.history ?? "").trim();
    const kitYear = Number(kit.year);
    if (brief.length < 40 || history.length < 20) throw new Error("the brief or the kit history is too short");
    // "戰場" is the placeholder, not a place. The map cannot aim at it, so
    // the campaign is written again with a real theater.
    const theater = String(raw.theater ?? "").trim();
    if (!theater || theater === "戰場" || theater.length < 2) throw new Error(`the theater "${theater}" is not a place`);
    if (!kitYear || kitYear < -4000 || kitYear > war.y) throw new Error(`kit.year ${kit.year} is not a service year at or before ${war.y}`);
    const layer = ["land", "air", "sea"].includes(kit.layer) ? kit.layer : "land";
    const nation = ["us", "uk", "de", "ussr", "jp", "fr", "it", "cn", "se", "il", "gr", "tr"].includes(kit.nation) ? kit.nation : "us";
    const kitName = String(libraryKit?.name ?? kit.name ?? war.name).slice(0, 16);
    const kitDesignation = String(libraryKit?.designation ?? kit.designation ?? "").slice(0, 40);
    const kitYearFinal = libraryKit ? libraryKit.year : kitYear;
    const nationFinal = libraryKit ? libraryKit.nation : nation;
    const layerFinal = libraryKit ? libraryKit.layer : layer;
    item = {
      id: `${war.y}-${war.name}`.replace(/\s+/g, "").slice(0, 32),
      added: new Date().toISOString(),
      span: war.span,
      source: index.source,
      // Where the campaign happened, in map coordinates. The history screen
      // draws the campaign on a map; without a position every one of them
      // landed on the same default tile.
      place: placeOf(raw),
      battle: { y: war.y, m: Number(raw.m) || 1, name: war.name, theater: theater.slice(0, 16), brief: brief.slice(0, 180) },
      kit: {
        name: kitName,
        designation: kitDesignation,
        year: kitYearFinal,
        nation: nationFinal,
        layer: layerFinal,
        history: (history || libraryKit?.history || "").slice(0, 120),
        portrait: libraryKit
          ? `portraits/${libraryKit.id}.jpg`
          : kitPortrait({ designation: kitDesignation, name: kitName }, portraitIndex),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (QUOTA.test(message)) {
      stopped = `the MiniMax plan's usage limit is reached (${war.name})`;
      break;
    }
    console.error(`  brief for ${war.name} rejected: ${message}`);
    continue;
  }
  feed.items = feed.items ?? [];
  feed.items.push(item);
  wroteBriefs++;
  console.log(`  brief ${wroteBriefs}: ${war.name} (${war.y}, ${war.span}) -> ${item.kit.name}`);
  writeFileSync(feedPath, JSON.stringify(feed, null, 2) + "\n");
}

if (!process.env.SKIP_DOSSIERS) {
  for (let n = 0; n < LIMITS.dossiers; n++) {
    const item = (feed.items ?? []).find((it) => {
      if (!it.battle?.name) return false;
      if (it.dossier?.countries) return false;
      const file = dossierFile(it.id, it.battle?.y ?? it.kit?.year ?? 0);
      return !existsSync(join(dir, file));
    });
    if (!item) break;
    let dossier;
    try {
      const raw = await ask(
        dossierPrompt(item.battle.name, item.battle.y, MIN_SECTION, MIN_TOTAL),
        "用繁體中文和英文。最後只留一個 JSON 物件。不要長篇推理，直接輸出答案。",
        0.4,
        Number(process.env.DOSSIER_MAX_TOKENS || 32000),
      );
      const missing = DOSSIER_SECTIONS.filter((k) => !(raw[k] || "").trim() || !(raw[k + "En"] || "").trim());
      if (missing.length) throw new Error(`missing english: ${missing.join(",")}`);
      const zh = DOSSIER_SECTIONS.map((k) => raw[k] || "").join("");
      if (zh.length < MIN_TOTAL) throw new Error(`too short: ${zh.length} < ${MIN_TOTAL}`);
      dossier = raw;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (QUOTA.test(message)) {
        stopped = `the MiniMax plan's usage limit is reached (${item.battle.name})`;
        break;
      }
      console.error(`  dossier for ${item.battle.name} rejected: ${message}`);
      continue;
    }
    dossier.updated = new Date().toISOString();
    const file = dossierFile(item.id, item.battle?.y ?? item.kit?.year ?? 0);
    writeFileSync(
      join(dir, file),
      JSON.stringify({ id: item.id, battle: item.battle, kit: item.kit, ...dossier }, null, 1) + "\n",
    );
    item.dossierUrl = `dossiers/${file}`;
    delete item.dossier;
    wroteDossiers++;
    const total = DOSSIER_SECTIONS.map((k) => dossier[k] || "").join("").length;
    console.log(`  dossier ${wroteDossiers}: ${item.battle.name}, ${total} chars -> ${file}`);
    writeFileSync(feedPath, JSON.stringify(feed, null, 2) + "\n");
  }
}

console.log(`bulk fill: ${wroteBriefs} brief(s), ${wroteDossiers} dossier(s)`);
if (stopped) {
  console.error(`${stopped}.`);
  console.error("Nothing is lost: what was written is kept, and the next run carries on.");
  // A stop, not a failure: the campaign job that follows still has to commit
  // what this run managed to write.
  process.exit(0);
}
