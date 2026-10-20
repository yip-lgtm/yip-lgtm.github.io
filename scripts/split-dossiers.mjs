#!/usr/bin/env node
/**
 * Move the dossiers out of the feed and into one file each.
 *
 * The feed holds a brief and a kit for every campaign, and the dossier --
 * eight sections in two languages -- used to sit inside the same object.
 * With sixty campaigns that was fine. With the whole war index behind us it
 * is not: the feed would be tens of megabytes, and the site fetches it whole
 * just to list the battles.
 *
 * So the feed keeps the brief, and each dossier is a file the history screen
 * fetches when a campaign is opened. The dossiers stay in the repository and
 * the update record still counts them.
 *
 *   FEED_OUT      the feed to split (default cute/feed.json)
 *   DOSSIER_DIR   where to write them (default cute/dossiers)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const feedPath = resolve(process.env.FEED_OUT || join(REPO, "cute/feed.json"));
const dir = resolve(process.env.DOSSIER_DIR || join(REPO, "cute/dossiers"));

/** A file name for a campaign: the year and a stable hash of its id. */
export function dossierFile(id, year) {
  const h = createHash("sha1").update(String(id)).digest("hex").slice(0, 10);
  return `${year}-${h}.json`;
}

// The file name is used by the other scripts, so importing this one must not
// split anything.
const ranDirectly = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (ranDirectly) {
  if (!existsSync(feedPath)) {
    console.error(`feed not found: ${feedPath}`);
    process.exit(1);
  }
  const feed = JSON.parse(readFileSync(feedPath, "utf8"));
  mkdirSync(dir, { recursive: true });

  let written = 0;
  let kept = 0;
  for (const item of feed.items ?? []) {
    const dossier = item.dossier;
    if (!dossier) {
      kept++;
      continue;
    }
    const year = item.battle?.y ?? item.kit?.year ?? 0;
    const file = dossierFile(item.id, year);
    const path = join(dir, file);
    if (!existsSync(path)) {
      writeFileSync(
        path,
        JSON.stringify({ id: item.id, battle: item.battle, kit: item.kit, ...dossier }, null, 1) + "\n",
      );
      written++;
    }
    item.dossierUrl = `dossiers/${file}`;
    delete item.dossier;
  }
  writeFileSync(feedPath, JSON.stringify(feed, null, 2) + "\n");
  const onDisk = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).length : 0;
  console.log(
    `dossiers split: ${written} written, ${kept} campaign(s) without one, ${onDisk} file(s) in ${dir}`,
  );
}
