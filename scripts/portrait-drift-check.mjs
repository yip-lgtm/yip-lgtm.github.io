#!/usr/bin/env node
/**
 * Fail loudly when the Pages roster and the source catalog disagree.
 *
 * The hourly job writes portraits into this repo and patches the built
 * bundle, so anything it generates is invisible to the source catalog and is
 * lost on the next real build. That drift happened twice before it was
 * noticed. This check is read-only and cheap: it compares the filenames here
 * against the catalog on the default branch of the source repository.
 *
 * Set DRIFT_STRICT=1 to make the workflow step fail. It defaults to a warning
 * so a transient fetch failure can never block a commit.
 */
import { readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = process.env.REPO_ROOT || resolve(here, "..");
const PORTRAITS = resolve(REPO, "cute/portraits");
const SOURCE = process.env.SOURCE_REPO || "yip-lgtm/steel-and-will";
const REF = process.env.SOURCE_REF || "main";
const STRICT = process.env.DRIFT_STRICT === "1";

const here_ = readdirSync(PORTRAITS)
  .filter((f) => f.endsWith(".jpg"))
  .map((f) => f.replace(".jpg", ""))
  .sort();

let catalogText;
try {
  const res = await fetch(
    `https://raw.githubusercontent.com/${SOURCE}/${REF}/src/game/catalog.ts`,
    { headers: { "User-Agent": "portrait-drift-check" } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  catalogText = await res.text();
} catch (err) {
  console.log(`drift check skipped: could not read ${SOURCE}@${REF} (${err.message})`);
  process.exit(0);
}

const there = [...catalogText.matchAll(/portrait:\s*pub\("portraits\/([a-z0-9-]+)\.jpg"\)/g)]
  .map((m) => m[1]);

const onlyHere = here_.filter((x) => !there.includes(x));
const onlyThere = there.filter((x) => !here_.includes(x));

if (!onlyHere.length && !onlyThere.length) {
  console.log(`portrait drift check: ${here_.length} in both repos, nothing out of sync`);
  process.exit(0);
}

console.error("portrait drift between repos:");
if (onlyHere.length) console.error(`  in the Pages repo but not in the source catalog: ${onlyHere.join(", ")}`);
if (onlyThere.length) console.error(`  in the source catalog but not in the Pages repo: ${onlyThere.join(", ")}`);
console.error(
  "  the Pages job patches the built bundle, so these never reach the source catalog and are\n" +
    "  lost on the next real build. Add MINIMAX_API_KEY to the source repository so its own\n" +
    "  portrait job can take over, or copy the missing images across by hand.",
);
process.exit(STRICT ? 1 : 0);
