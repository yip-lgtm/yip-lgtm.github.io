// Add one 兵器娘 立繪 every run and wire it into the card roster.
//
// Follows the same conventions as scripts/hourly-feed.mjs: MINIMAX_API_KEY from
// the environment, MINIMAX_BASE_URL defaulting to https://api.minimax.io/v1,
// exit non-zero on failure so the workflow does not commit a half-finished change.
//
// Verified against the MiniMax image_generation reference:
//   POST {base}/image_generation  { model:"image-01", prompt, width, height, n,
//                                   response_format:"url", prompt_optimizer }
//   width/height: [512,2048], divisible by 8, must be set together.
//   aspect_ratio only offers 1:1 / 16:9 / 9:16, so it is NOT used — 1152x1728
//   gives a true 2:3 that matches the six portraits already published.
//   response_format "url" EXPIRES IN 24 HOURS, so the bytes are downloaded and
//   committed; the URL is never stored.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = process.env.REPO_ROOT || resolve(here, "..");
const CUTE = resolve(REPO, "cute");
const ASSETS = resolve(CUTE, "assets");
const PORTRAITS = resolve(CUTE, "portraits");
const MOCK = process.env.MOCK === "1";

// 1152x1728 = 2:3, matches the existing six, both divisible by 8, both in range.
const W = 1152;
const H = 1728;

const NATION = {
  fr: { uni: "French military uniform of the period, horizon-blue tunic with red piping", pal: "horizon blue and red" },
  de: { uni: "German Wehrmacht feldgrau tunic with collar tabs", pal: "feldgrau and gunmetal" },
  uk: { uni: "British khaki service dress with brass buttons and collar badges", pal: "khaki and brass" },
  us: { uni: "American olive-drab service uniform with brass buttons", pal: "olive drab and brass" },
  ussr: { uni: "Soviet khaki officer tunic with collar tabs and shoulder boards", pal: "soviet green" },
  jp: { uni: "Japanese naval white dress uniform with gold trim and shoulder boards", pal: "white and gold" },
  it: { uni: "Italian Royal Army grey-green uniform with collar patches", pal: "grey-green" },
  se: { uni: "Swedish grey uniform with collar patches", pal: "swedish grey" },
  cn: { uni: "Chinese PLA khaki uniform with red collar tabs", pal: "PLA green and red" },
  il: { uni: "Israeli olive-drab uniform", pal: "idf olive" },
  su: { uni: "Soviet-era uniform", pal: "soviet green" },
  gb: { uni: "British service dress", pal: "khaki" },
  pl: { uni: "Polish field uniform", pal: "polish olive" },
  fi: { uni: "Finnish grey-green uniform", pal: "finnish grey" },
  tr: { uni: "Turkish military uniform", pal: "turkish olive" },
};
const LAYER = {
  land: "Army service dress; the vehicle's or gun's most recognisable part worn as a shoulder plate",
  air: "leather flight suit with a fur collar; an aircraft part — spinner, cowling louvre or wing-root rib — as a shoulder harness",
  sea: "naval dress; a ship's fitting — turret face, rangefinder or anchor-stock plate — as a collar device",
};
const KIND = {
  tank: "an armoured hull plate", infantry: "the service rifle's receiver as a chest plate",
  artillery: "a gun breech ring", fighter: "a spinner and cowling section",
  bomber: "a bomb-bay rack section", battleship: "a main-gun turret face",
  carrier: "an island structure", cruiser: "a bridge face and porthole band",
  submarine: "a periscope section", destroyer: "a gun turret face",
};

// ---------------------------------------------------------------- bundle I/O
const asset = readdirSync(ASSETS).find((f) => f.startsWith("pages-") && f.endsWith(".js"));
if (!asset) { console.error("no bundle in cute/assets"); process.exit(1); }
const indexHtml = readFileSync(resolve(CUTE, "index.html"), "utf8");
const ref = indexHtml.match(/assets\/(pages-[A-Za-z0-9_-]+\.js)/)?.[1];
if (!ref || ref !== asset) { console.error(`index.html ref ${ref} != ${asset}`); process.exit(1); }
const bundlePath = resolve(ASSETS, asset);
let src = readFileSync(bundlePath, "utf8");

// walk the kit array and capture every T({...}) literal
const start = src.indexOf("be=[T({");
if (start < 0) { console.error("kit array not found — bundle layout changed"); process.exit(1); }
const open = src.indexOf("[", start);
const spans = [];
{
  let depth = 0;
  for (let k = open; k < src.length; k++) {
    const c = src[k];
    if (c === "[" || c === "{" || c === "(") depth++;
    else if (c === "]" || c === "}" || c === ")") { depth--; if (depth === 0) break; }
    if (c === "T" && src[k + 1] === "(" && src[k + 2] === "{") {
      let d = 0, e2 = -1;
      for (let j = k; j < src.length; j++) {
        const cc = src[j];
        if (cc === "(" || cc === "{" || cc === "[") d++;
        else if (cc === ")" || cc === "}" || cc === "]") { d--; if (d === 0) { e2 = j + 1; break; } }
      }
      spans.push([k, e2]); k = e2 - 1;
    }
  }
}

const cards = spans.map(([s, e]) => {
  const lit = src.slice(s, e);
  const g = (re) => re.exec(lit)?.[1];
  return {
    at: e - 2, // index of the literal's closing brace
    id: g(/id:`([^`]+)`/),
    name: g(/name:`([^`]+)`/),
    designation: g(/designation:`([^`]+)`/),
    nation: g(/nation:`([a-z]+)`/),
    layer: g(/layer:`([a-z]+)`/),
    kind: g(/kind:`([a-z]+)`/),
    year: Number(g(/year:(\d+)/)),
    epithet: g(/epithet:`([^`]+)`/),
    wired: /portrait:/.test(lit),
  };
}).filter((c) => c.id);

const todo = cards.filter((c) => !c.wired && !existsSync(resolve(PORTRAITS, `${c.id}.jpg`)));
if (!todo.length) { console.log("all cards have portraits — nothing to do"); process.exit(0); }

// stable pick: rotate by run so the 30-minute cadence spreads across the roster
const offset = Number(process.env.PORTRAIT_OFFSET || 0);
const card = todo[offset % todo.length];
console.log(`target: ${card.id} (${card.name}) — ${todo.length} still pending`);

// ------------------------------------------------------------------ prompt
const nat = NATION[card.nation] || NATION.us;
const lay = LAYER[card.layer] || LAYER.land;
const kind = KIND[card.kind] || "the weapon's single most recognisable external feature";
const era = card.year < 1919 ? "First World War era" : card.year <= 1945 ? "Second World War era" : card.year <= 1991 ? "Cold War" : "modern";
const prompt = [
  `Anime-style character portrait of an adult woman personifying the ${card.designation || card.name} (${card.year}).`,
  `She wears an accurate ${era} ${nat.uni}. Palette: ${nat.pal}.`,
  `Framing: bust-up, cropped near the mid-torso, facing the viewer.`,
  `Integrated into the outfit: ${kind}, ${lay}.`,
  `Background: a flat warm cream-to-beige vertical gradient, no scenery, no props.`,
  `Style: clean uniform line art, soft cel shading, gentle closed-mouth smile, warm brown eyes.`,
  `Dignified and composed, not in a fighting stance.`,
  `No text, no watermark, no real-world insignia or national flag.`,
].join(" ");

// ---------------------------------------------------------------- generate
const key = process.env.MINIMAX_API_KEY;
if (!key && !MOCK) { console.error("MINIMAX_API_KEY missing"); process.exit(1); }

const base = (process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1").replace(/\/$/, "");
let bytes = null;

if (MOCK) {
  // deterministic stand-in so the wiring path can be exercised without a key
  bytes = Buffer.from(
    `MOCK portrait for ${card.id} — not artwork`, "utf8");
} else {
  const res = await fetch(`${base}/image_generation`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.MINIMAX_IMAGE_MODEL || "image-01",
      prompt,
      width: W, height: H, n: 1,
      response_format: "url",
      prompt_optimizer: false,
    }),
  });
  if (!res.ok) { console.error(`image_generation HTTP ${res.status}`); process.exit(1); }
  const body = await res.json();
  if (body.base_resp?.status_code && body.base_resp.status_code !== 0) {
    console.error("api:", body.base_resp.status_code, body.base_resp.status_msg); process.exit(1);
  }
  const url = body.data?.[0]?.url;
  if (!url) { console.error("no image url in response"); process.exit(1); }
  // the url dies in 24h — pull the bytes now
  const img = await fetch(url);
  if (!img.ok) { console.error(`image download HTTP ${img.status}`); process.exit(1); }
  bytes = Buffer.from(await img.arrayBuffer());
  if (bytes.length < 4096) { console.error(`image too small (${bytes.length}B)`); process.exit(1); }
}

mkdirSync(PORTRAITS, { recursive: true });
writeFileSync(resolve(PORTRAITS, `${card.id}.jpg`), bytes);
console.log(`saved portraits/${card.id}.jpg (${bytes.length} bytes)`);

// ------------------------------------------------------- wire into the bundle
if (!src.includes("function PF(")) {
  console.error("face patch (PF) missing — run deploy/patch_faces.mjs against this bundle first");
  process.exit(1);
}
const out = src.slice(0, card.at) + `,portrait:ve(\`portraits/${card.id}.jpg\`)` + src.slice(card.at);
new Function(out.replace(/^import.*$/gm, "").replace(/export\{[^}]*\};?$/gm, ""));
console.log("parse check: OK");

const crypto = await import("node:crypto");
const newRef = `pages-${crypto.createHash("sha256").update(out).digest("base64url").slice(0, 8)}-.js`;
writeFileSync(resolve(ASSETS, newRef), out);
rmSync(resolve(ASSETS, asset), { force: true });
writeFileSync(resolve(CUTE, "index.html"), indexHtml.replace(asset, newRef));
console.log(`wired -> assets/${newRef}, index.html repointed`);

// -------------------------------------------------------------------- commit
if (process.env.COMMIT === "1") {
  const run = (cmd, args, allowFail = false) => {
    try { return execFileSync("git", ["-C", REPO, cmd, ...args], { stdio: "pipe", encoding: "utf8" }); }
    catch (e) { if (allowFail) return null; throw e; }
  };
  // The two other bots commit to main on the hour and at 16:05. If either moved
  // while we were generating, our bundle edit is now based on a stale tree.
  run("fetch", ["--quiet", "origin"]);
  const behind = Number(run("rev-list", ["--count", "HEAD..origin/main"]).trim());
  if (behind > 0) {
    console.error(`origin/main moved ${behind} commit(s) while generating — rebase and re-run`);
    process.exit(2);
  }
  run("config", ["user.name", "yip-lgtm"]);
  run("config", ["user.email", "258986088+yip-lgtm@users.noreply.github.com"]);
  run("add", ["-A"]);
  // `diff --staged --quiet` exits 0 when there is NOTHING staged; only commit then.
  const changed = run("diff", ["--staged", "--name-only"], true);
  if (!changed || !changed.trim()) { console.log("nothing staged"); process.exit(0); }
  run("commit", ["-q", "-m", `cute/portraits: add ${card.name} (${card.id})`]);
  run("push", ["origin", "HEAD:main"]);
  console.log("committed and pushed");
}
