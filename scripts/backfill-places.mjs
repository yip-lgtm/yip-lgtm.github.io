#!/usr/bin/env node
/**
 * Give the campaigns whose theater is the bare placeholder a real one.
 *
 * The brief writer was asked for "theater: 戰場" and for ten campaigns it
 * echoed the placeholder back. The map then had nothing to go on and every
 * one of them landed on the same point. Their briefs each name the place the
 * fighting happened -- 西沙群島, 卡蓋拉地區, 頓巴斯 -- so the theater is
 * recovered here rather than guessed.
 *
 *   FEED_OUT     the feed to read (default cute/feed.json)
 *   DOSSIER_DIR  where the dossiers live (default cute/dossiers)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const feedPath = resolve(process.env.FEED_OUT || join(REPO, "cute/feed.json"));
const dir = resolve(process.env.DOSSIER_DIR || join(REPO, "cute/dossiers"));

/** Campaign id -> the place the fighting happened, and where it is. */
const PLACES = {
  "1974-西沙之戰": { theater: "西沙群島與南中國海", lng: 112.0, lat: 16.0 },
  "1978-烏干達-坦桑尼亞戰爭": { theater: "卡蓋拉地區與坦桑尼亞邊境", lng: 30.5, lat: -1.5 },
  "1988-赤瓜礁海戰": { theater: "赤瓜礁與南中國海", lng: 114.4, lat: 9.5 },
  "1989-美國入侵巴拿馬": { theater: "巴拿馬與巴拿馬運河", lng: -79.5, lat: 9.0 },
  "2008-俄格戰爭": { theater: "南奧塞梯亞與阿布哈茲", lng: 43.7, lat: 42.5 },
  "2011-利比亞內戰": { theater: "利比亞沿海與班加西", lng: 20.1, lat: 32.1 },
  "2014-頓巴斯戰爭": { theater: "頓巴斯與烏克蘭東部", lng: 38.0, lat: 48.3 },
  "2020-納戈爾諾-卡拉巴赫戰爭": { theater: "納戈爾諾-卡拉巴赫", lng: 46.5, lat: 39.4 },
  "2022-俄羅斯入侵烏克蘭": { theater: "烏克蘭全境", lng: 33.0, lat: 48.5 },
  "2023-以色列—哈馬斯戰爭": { theater: "加薩走廊與以色列南部", lng: 34.5, lat: 31.4 },
};

const feed = JSON.parse(readFileSync(feedPath, "utf8"));
let patched = 0;
let skipped = 0;

for (const item of feed.items ?? []) {
  if (item.battle?.theater && item.battle.theater !== "戰場") continue;
  const place = PLACES[item.id];
  if (!place) {
    skipped++;
    console.warn(`  no place known for ${item.id} (theater ${item.battle?.theater})`);
    continue;
  }
  item.battle.theater = place.theater;
  item.place = { lng: place.lng, lat: place.lat };

  if (item.dossierUrl) {
    const path = join(dir, item.dossierUrl.replace(/^dossiers\//, ""));
    if (existsSync(path)) {
      const dossier = JSON.parse(readFileSync(path, "utf8"));
      dossier.theater = place.theater;
      dossier.place = item.place;
      writeFileSync(path, JSON.stringify(dossier, null, 1) + "\n");
    }
  }
  patched++;
}
writeFileSync(feedPath, JSON.stringify(feed, null, 2) + "\n");
console.log(`place backfill: ${patched} campaign(s) placed, ${skipped} left alone`);
