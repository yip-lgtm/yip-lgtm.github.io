#!/usr/bin/env node
/**
 * Give every campaign card a portrait reference.
 *
 * The hourly writer only started attaching `kit.portrait` after this was
 * written, so the campaigns already in the feed have no reference at all and
 * the gallery drew the "立繪待生成" placeholder for them -- even for the ones
 * whose weapon was already in the roster with art paid for.
 *
 * This backfills the existing feed. It is idempotent: running it again on an
 * already-backfilled feed changes nothing.
 *
 *   FEED_OUT        the feed to patch (default cute/feed.json)
 *   PORTRAIT_INDEX  the catalog map (default cute/portrait-index.json)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPortrait, loadPortraitIndex } from "./kit-portrait.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const feedPath = resolve(process.env.FEED_OUT || new URL("../cute/feed.json", import.meta.url).pathname);
if (!existsSync(feedPath)) {
  console.error(`feed not found: ${feedPath}`);
  process.exit(1);
}
const feed = JSON.parse(readFileSync(feedPath, "utf8"));
const index = loadPortraitIndex(readFileSync, [
  process.env.PORTRAIT_INDEX,
  new URL("../cute/portrait-index.json", import.meta.url),
  new URL("../public/portrait-index.json", import.meta.url),
]);
if (!Object.keys(index).length) {
  console.error("portrait index is empty -- nothing to borrow from");
  process.exit(1);
}

let added = 0;
let borrowed = 0;
let fresh = 0;
for (const item of feed.items ?? []) {
  const kit = item.kit ?? {};
  const portrait = kitPortrait({ designation: kit.designation, name: kit.name }, index);
  if (kit.portrait === portrait) continue;
  kit.portrait = portrait;
  item.kit = kit;
  added++;
  if (portrait.startsWith("portraits/feed-")) fresh++;
  else borrowed++;
}
writeFileSync(feedPath, JSON.stringify(feed, null, 2) + "\n");
console.log(`feed: ${feed.items?.length ?? 0} item(s), ${added} reference(s) added (${borrowed} borrowed, ${fresh} new)`);
