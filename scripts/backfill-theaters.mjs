#!/usr/bin/env node
/**
 * Give every campaign a position on the map.
 *
 * The brief writer names the theater of a campaign -- "黃河沿岸澶州（今河南濮陽
 * 一帶）", "頓巴斯" -- and the map needs a longitude and a latitude for it.
 * The app has a table of the theaters it knows, but the writer invents new
 * ones every hour, and a theater the table does not have lands on the
 * Atlantic: not wrong, but not the place the campaign was fought either.
 *
 * So the gazetteer is kept here, next to the writers, and topped up from
 * the ones the writer does not know. A campaign with no position is asked
 * for one by name -- a short question, and only for the campaigns that
 * need it.
 *
 *   FEED_OUT     the feed to read (default cute/feed.json)
 *   DOSSIER_DIR  where the dossiers live (default cute/dossiers)
 *   PLACES_OUT   the gazetteer to keep (default cute/theater-places.json)
 *   MAX_NEW      how many unknown theaters to place in one run (default 4)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const feedPath = resolve(process.env.FEED_OUT || join(REPO, "cute/feed.json"));
const dir = resolve(process.env.DOSSIER_DIR || join(REPO, "cute/dossiers"));
const placesPath = resolve(process.env.PLACES_OUT || join(REPO, "cute/theater-places.json"));
const MAX_NEW = Number(process.env.MAX_NEW || 4);

const key = process.env.MINIMAX_API_KEY;
if (!key) {
  console.error("MINIMAX_API_KEY missing");
  process.exit(1);
}
if (!existsSync(feedPath)) {
  console.error(`feed not found: ${feedPath}`);
  process.exit(1);
}

/** The gazetteer: theater -> where it is. */
let places = {};
if (existsSync(placesPath)) {
  try {
    places = JSON.parse(readFileSync(placesPath, "utf8"));
  } catch {
    places = {};
  }
}

const feed = JSON.parse(readFileSync(feedPath, "utf8"));

/** The campaigns whose theater the gazetteer does not know. */
const unknown = [];
for (const item of feed.items ?? []) {
  const theater = item.battle?.theater;
  if (!theater || theater === "戰場") continue;
  if (item.place && typeof item.place.lng === "number") continue;
  if (places[theater]) continue;
  if (unknown.some((u) => u.theater === theater)) continue;
  unknown.push({ theater, name: item.battle.name, year: item.battle.y, item });
}

if (!unknown.length) {
  console.log("every campaign already has a position");
  process.exit(0);
}
console.log(`${unknown.length} theater(s) to place; doing ${Math.min(MAX_NEW, unknown.length)}`);

const base = (process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1").replace(/\/$/, "");
const model = process.env.MINIMAX_MODEL || "MiniMax-M3.1-Flash-Preview";
const TIMEOUT_MS = Number(process.env.PLACE_TIMEOUT_MS || 300_000);

async function ask(theater, name, year) {
  const prompt = `「${theater}」是「${name}」（${year}）戰役的戰場名稱。請只輸出一個 JSON 物件：{"lng": 經度數字,"lat": 緯度數字,"place":"這個地名在地球上的英文或中文名稱"}。經度是東經為正數、西經為負數，緯度是北緯為正數、南緯為負數，數字要精確到小數點後兩位。戰場所在的實際地點，不是國家的中心。`;
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_completion_tokens: 2000,
      messages: [
        { role: "system", content: "只輸出一個 JSON 物件，不要解釋。" },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  const raw = body.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s < 0 || e <= s) throw new Error("no json in reply");
  const parsed = JSON.parse(cleaned.slice(s, e + 1));
  const lng = Number(parsed.lng);
  const lat = Number(parsed.lat);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) throw new Error("no usable coordinates");
  if (Math.abs(lng) > 180 || Math.abs(lat) > 90) throw new Error("coordinates out of range");
  return { lng: Math.round(lng * 100) / 100, lat: Math.round(lat * 100) / 100, name: String(parsed.place ?? "") };
}

let placed = 0;
for (const entry of unknown.slice(0, MAX_NEW)) {
  try {
    const place = await ask(entry.theater, entry.name, entry.year);
    places[entry.theater] = place;
    placed++;
    console.log(`  ${entry.theater} -> ${place.lng},${place.lat}${place.name ? ` (${place.name})` : ""}`);
  } catch (err) {
    console.error(`  ${entry.theater}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

if (!placed) {
  console.log("nothing placed");
  process.exit(0);
}

writeFileSync(placesPath, JSON.stringify(places, null, 2) + "\n");

// Put the position on the campaigns that use this theater.
for (const item of feed.items ?? []) {
  const theater = item.battle?.theater;
  if (!theater || !places[theater]) continue;
  if (item.place && typeof item.place.lng === "number") continue;
  item.place = { lng: places[theater].lng, lat: places[theater].lat };
  if (item.dossierUrl) {
    const path = join(dir, item.dossierUrl.replace(/^dossiers\//, ""));
    if (existsSync(path)) {
      const dossier = JSON.parse(readFileSync(path, "utf8"));
      dossier.theater = theater;
      dossier.place = item.place;
      writeFileSync(path, JSON.stringify(dossier, null, 1) + "\n");
    }
  }
}
writeFileSync(feedPath, JSON.stringify(feed, null, 2) + "\n");
console.log(`placed ${placed} theater(s); the gazetteer holds ${Object.keys(places).length}`);
