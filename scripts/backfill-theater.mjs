#!/usr/bin/env node
/**
 * Lift the theater onto the dossier.
 *
 * A dossier file is the feed entry with the eight sections laid over it, so
 * the campaign's theater lives on `battle.theater`. The history screen reads
 * `d.theater`, and the map falls back to the Western Front when that is
 * missing -- every campaign the writer added was drawn over southern
 * Germany. This copies the theater up to the top level of each file.
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

if (!existsSync(feedPath)) {
  console.error(`feed not found: ${feedPath}`);
  process.exit(1);
}
const feed = JSON.parse(readFileSync(feedPath, "utf8"));

let patched = 0;
let missing = 0;
for (const item of feed.items ?? []) {
  if (!item.dossierUrl) continue;
  const path = join(dir, item.dossierUrl.replace(/^dossiers\//, ""));
  if (!existsSync(path)) {
    missing++;
    continue;
  }
  const dossier = JSON.parse(readFileSync(path, "utf8"));
  const theater = item.battle?.theater ?? dossier.theater ?? "";
  if (dossier.theater === theater && "place" in dossier) continue;
  // `theater` and `place` go in front of the spread so a dossier that happens
  // to carry its own `theater` cannot overwrite the feed's.
  const { theater: _t, place: _p, ...rest } = dossier;
  writeFileSync(
    path,
    JSON.stringify({ id: dossier.id ?? item.id, theater, place: dossier.place ?? item.place ?? null, ...rest }, null, 1) + "\n",
  );
  patched++;
}
console.log(`theater backfill: ${patched} dossier(s) patched, ${missing} file(s) not found`);
