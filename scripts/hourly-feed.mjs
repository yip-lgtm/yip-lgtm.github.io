import { readFileSync, writeFileSync } from "node:fs";
import { kitPortrait, loadPortraitIndex } from "./kit-portrait.mjs";
import { postJsonOrThrow } from "./minimax.mjs";

const key = process.env.MINIMAX_API_KEY;
const out = process.env.FEED_OUT || "public/feed.json";
if (!key) {
  console.error("MINIMAX_API_KEY missing");
  process.exit(1);
}

const SPANS = [
  { id: "wwi", hint: "1914到1918的真實戰役，裝備必須是當時已經列裝的火器、機槍、火砲、戰車或軍艦" },
  { id: "inter", hint: "1919到1935的真實衝突或演習，裝備必須是戰間期已存在的型號" },
  { id: "ww2a", hint: "1936到1941的真實戰役，點出一件當時在場的真實軍武" },
  { id: "ww2b", hint: "1942到1945的真實戰役，點出一件當時在場的戰車、飛機、軍艦或火砲" },
  { id: "cold", hint: "1946到1990的真實局部戰爭，只寫部隊與已列裝裝備，不寫平民，不寫核武製造" },
  { id: "now", hint: "1991到現在的真實戰役，裝備必須已經列裝或已經試飛，不要發明新型號" },
  { id: "p19", hint: "1800到1899的真實戰役，裝備必須是當時已經列裝的火繩槍、燧發槍、刺刀步槍、線膛砲或蒸汽鐵甲艦" },
  { id: "p16", hint: "1500到1799的真實戰役，裝備必須是當時已經列裝的火繩槍、輪發槍、火繩槍銃、長槍、刺刀步槍或野砲" },
  { id: "p11", hint: "1000到1499的真實戰役，裝備必須是當時已經列裝的長弓、弩、希臘火、突火槍、神臂弓、複合弓或攻城砲" },
  { id: "p01", hint: "公元前1000年以前的真實戰役，裝備必須是當時已經列裝的方陣長矛、短劍、標槍、弩、攻城槓或投石機" },
];

let feed = { items: [] };
try {
  feed = JSON.parse(readFileSync(out, "utf8"));
  if (!Array.isArray(feed.items)) feed.items = [];
} catch {
  feed = { items: [] };
}

/**
 * The war index lives at `public/war-index.json` in the app repo but at
 * `cute/war-index.json` in the Pages repo that actually runs this job, so the
 * path can't be hardcoded. Try `WAR_INDEX` first, then both known locations.
 */
const INDEX_CANDIDATES = [
  process.env.WAR_INDEX,
  new URL("../cute/war-index.json", import.meta.url),
  new URL("../public/war-index.json", import.meta.url),
];
let index = null;
for (const candidate of INDEX_CANDIDATES) {
  if (!candidate) continue;
  try {
    index = JSON.parse(readFileSync(candidate, "utf8"));
    break;
  } catch {
    // try the next candidate
  }
}
if (!index) {
  console.error(`war-index.json not found; tried ${INDEX_CANDIDATES.filter(Boolean).length} path(s)`);
  process.exit(1);
}
// The catalog's designation -> portrait map, published next to the war index.
// It lets a campaign card borrow the 立繪 the roster already paid for.
const portraitIndex = loadPortraitIndex(readFileSync, [
  process.env.PORTRAIT_INDEX,
  new URL("../cute/portrait-index.json", import.meta.url),
  new URL("../public/portrait-index.json", import.meta.url),
]);

const taken = new Set(feed.items.map((it) => it.battle?.name).filter(Boolean));
const span = SPANS[feed.items.length % SPANS.length];
// The round-robin span may already be used up -- the 1900-onward lists are
// short and the writer gets through them in a week. Fall through to the next
// span that still has an unwritten war rather than giving up.
let pool = index.wars.filter((w) => w.span === span.id && !taken.has(w.name));
for (const s of SPANS) {
  if (pool.length) break;
  pool = index.wars.filter((w) => w.span === s.id && !taken.has(w.name));
}
// Every war in the index has been written at least once. Start a second pass:
// the same battle can be re-examined with a different kit, which is what the
// feed is for ("每小時考證"). Without this the job died with "war index
// exhausted" and the feed stopped growing.
const repeat = pool.length === 0;
if (repeat) console.error("war index exhausted -- starting a second pass over the index");
const war = repeat ? index.wars[feed.items.length % index.wars.length] : pool[0];
if (!war) {
  console.error("war index exhausted and the index is empty");
  process.exit(1);
}
console.error(`  war: ${war.name} (${war.y}, span ${war.span})`);

const prompt = `參考中文維基戰爭列表 https://zh.wikipedia.org/wiki/战争列表 。本輪只能寫「${war.name}」，開始年 ${war.y < 0 ? `公元前${-war.y}年` : war.y}，不得改名，不得換成列表以外的衝突。用繁體中文。不要口號，不要省略號，不要編造你不確定的精確數字，不要寫製造方法，不要寫平民傷亡。裝備服役年必須小於或等於 ${war.y}，不得使用該年之後才列裝的型號。只輸出一個 JSON 物件，欄位如下（值要換成真實內容，不要照抄下面的說明文字）：
- y: ${war.y}
- m: ${war.y < 0 ? "1（古代戰爭的確切月份無法考證，固定寫 1，不要糾結）" : "1 到 12 的整數"}
- name: ${war.name}
- theater: 戰場
- brief: 九十到一百四十字，點出這場列表中的衝突和一件 ${war.y} 年或更早已列裝的真實裝備正式型號
- kit.name: 裝備中文名
- kit.designation: 正式型號
- kit.year: 服役年，不得晚於 ${war.y}${war.y < 0 ? "；公元前用負數（公元前500年寫 -500）" : ""}
- kit.nation: us 或 uk 或 de 或 ussr 或 jp 或 fr 或 it 或 cn 或 se 或 il 或 gr 或 tr 其中一個
- kit.layer: land 或 air 或 sea 其中一個
- kit.history: 四十到八十字，只講這件裝備在體系裡的位置
不要輸出欄位說明本身。`;

const base = (process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1").replace(/\/$/, "");
// Swapped from MiniMax-M2.7-highspeed at the owner's call. Like the image
// model, this is unverified against the live API: if the service rejects it
// the run fails loudly with the response body rather than writing a bad entry.
// MINIMAX_MODEL=MiniMax-M2.7-highspeed reverts without a code change.
const model = process.env.MINIMAX_MODEL || "MiniMax-M3.1-Flash-Preview";
let lastError = "unknown";

// A campaign entry is a long generation. Node's undici headers timeout is 300s,
// so a slow reply used to throw straight through `once` -- and because the throw
// was never caught it killed the process before the retry loop below could run
// once, let alone three times. One slow answer cost the whole hour.
const TIMEOUT_MS = Number(process.env.FEED_TIMEOUT_MS || 600_000);

async function once() {
  let body;
  try {
    body = await postJsonOrThrow(
      `${base}/chat/completions`,
      {
        model,
        temperature: 0.6,
        max_completion_tokens: Number(process.env.FEED_MAX_TOKENS || 16000),
        messages: [
          { role: "system", content: "只用繁體中文。最後只留一個 JSON 物件。不要長篇推理，直接輸出答案。" },
          { role: "user", content: prompt + (lastError ? `\n上一份答案被拒絕：${lastError}。請修正後重新輸出。` : "") },
        ],
      },
      { headers: { Authorization: `Bearer ${key}` }, timeoutMs: TIMEOUT_MS },
    );
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    console.error(`  transport: ${lastError}`);
    return null;
  }
  const raw = body.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const blob = cleaned.includes("{") ? cleaned : raw;
  // Slicing from the first `{` to the last `}` breaks whenever the model echoes
  // the requested schema before the real object, so walk balanced braces and take
  // the last candidate that actually parses into a battle-shaped object.
  const candidates = [];
  let depth = 0;
  let from = -1;
  let inString = false;
  let escaped = false;
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
  let item = null;
  for (const candidate of candidates.reverse()) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && parsed.kit) {
        item = parsed;
        break;
      }
    } catch {
      // not this one
    }
  }
  if (!item) return null;
  try {
    const brief = String(item.brief ?? "").replace(/\s+/g, " ").trim();
    const name = String(item.name ?? "").trim();
    const kit = item.kit ?? {};
    const history = String(kit.history ?? "").trim();
    if (brief.length < 40 || !name || history.length < 20) {
      lastError = `the brief (${brief.length} chars), the name or the kit history is too short`;
      console.error(`  ${lastError}`);
      return null;
    }
    // A second pass over the index re-examines a battle that is already in
    // the feed. That is allowed on purpose; the new kit is the point.
    if (!repeat && feed.items.some((it) => it.battle?.name === name)) {
      lastError = `the battle ${name} is already in the feed`;
      console.error(`  ${lastError}`);
      return null;
    }
    const y = Number(item.y);
    const m = Number(item.m);
    if (!y || m < 1 || m > 12) {
      lastError = `y=${item.y} and m=${item.m} are not a year and a month`;
      console.error(`  ${lastError}`);
      return null;
    }
    const kitYear = Number(kit.year);
    // The lower bound only rejects nonsense (0, typos). It has to reach into
    // the first millennium BC: the pre-1000 span writes BC service dates as
    // negative years, and the 1500-onward spans use four-digit years.
    //
    // The order works in both directions: a smaller number is an older year
    // in AD and in BC, so "the kit may not be later than the battle" is the
    // same comparison either way.
    if (!kitYear || kitYear < -4000 || kitYear > war.y) {
      lastError = `kit.year ${kit.year} is not a service year at or before ${war.y}`;
      console.error(`  ${lastError}`);
      return null;
    }
    const layer = ["land", "air", "sea"].includes(kit.layer) ? kit.layer : "land";
    // The name and designation are cut to the length the card stores, and the
    // portrait id is derived from the cut values -- otherwise the backfill
    // (which reads the stored values) would compute a different file name.
    const kitName = String(kit.name ?? name).slice(0, 16);
    const kitDesignation = String(kit.designation ?? "").slice(0, 40);
    // "su" is not a nation the game knows; the id is "ussr". The old list let
    // the model answer "su" and the card then fell back to a US uniform.
    const nation = ["us", "uk", "de", "ussr", "jp", "fr", "it", "cn", "se", "il", "gr", "tr"].includes(kit.nation) ? kit.nation : "us";
    return {
      id: `${war.y}-${war.name}`.replace(/\s+/g, "").slice(0, 32),
      added: new Date().toISOString(),
      span: war.span,
      source: index.source,
      battle: { y: war.y, m, name: war.name, theater: String(item.theater ?? "").slice(0, 16), brief: brief.slice(0, 180) },
      kit: {
        name: kitName,
        designation: kitDesignation,
        year: kitYear,
        nation,
        layer,
        history: history.slice(0, 120),
        // The card face draws a 立繪 when the kit has one. Without this the
        // campaign card rendered the "立繪待生成" placeholder even when the
        // same weapon already had art in the roster.
        portrait: kitPortrait({ designation: kitDesignation, name: kitName }, portraitIndex),
      },
    };
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    console.error(`  parse: ${lastError}`);
    return null;
  }
}

const ATTEMPTS = Number(process.env.FEED_ATTEMPTS || 3);
// The plan's usage limit is a hard cap, not a burst limit: asking again in
// fifteen seconds cannot get past it. Three attempts on a spent plan only
// waste the next job's budget, so the run stops and says so.
const QUOTA = /Token Plan usage limit|rate_limit_error/i;
let parsed = null;
for (let i = 1; i <= ATTEMPTS && !parsed; i++) {
  console.error(`attempt ${i}/${ATTEMPTS}`);
  parsed = await once();
  if (!parsed && QUOTA.test(lastError)) break;
  if (!parsed && i < ATTEMPTS) await new Promise((r) => setTimeout(r, 15_000 * i));
}
if (!parsed) {
  if (QUOTA.test(lastError)) {
    console.error(`the MiniMax plan's usage limit is reached -- no campaign written for ${war.name}.`);
    console.error("Nothing is lost: the next run picks the same war up. It needs credits, not a retry.");
    process.exit(1);
  }
  console.error(`no campaign written for ${war.name}: ${lastError} — will retry next hour`);
  process.exit(1);
}
feed.items.push(parsed);
writeFileSync(out, JSON.stringify(feed, null, 2) + "\n");
console.log(parsed.battle.y, parsed.battle.name, parsed.kit.designation);
