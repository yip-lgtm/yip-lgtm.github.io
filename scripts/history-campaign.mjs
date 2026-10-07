import { readFileSync, writeFileSync } from "node:fs";

const key = process.env.MINIMAX_API_KEY;
const out = process.env.FEED_OUT || "cute/feed.json";
if (!key) {
  console.error("MINIMAX_API_KEY missing");
  process.exit(1);
}

const feed = JSON.parse(readFileSync(out, "utf8"));
const item = (feed.items ?? []).find((it) => it.battle?.name && !it.dossier?.countries);
if (!item) {
  console.log("every campaign already has a dossier");
  process.exit(0);
}

const name = item.battle.name;
const year = item.battle.y;
// The bar is the Russian Civil War entry, not the old 500. A dossier that
// clears 500 but lands near it is a stub: the first Falklands attempt came
// back at 470 and was only accepted by hand.
const MIN_TOTAL = Number(process.env.DOSSIER_MIN_TOTAL || 1200);
const MIN_SECTION = 150;
const prompt = `用繁體中文和英文，為「${name}」（${year}）寫一篇由始至終的戰役實錄。要具體、生動，不要口號，不要省略號，不要寫平民，不要寫製造方法，不要編造你不確定的精確傷亡。裝備必須是 ${year} 年或更早已列裝的真實型號。

篇幅要求：中文每一段至少 ${MIN_SECTION} 字，八段合共至少 ${MIN_TOTAL} 字。寫不到這個長度代表你沒有把這場戰爭想清楚，請寫足。寧可寫具體的日期、編制、路線、彈藥與後勤細節，也不要重複結論。

只輸出一個 JSON 物件，欄位都要有中英成對：
countries, countriesEn, people, peopleEn, kits, kitsEn, tactics, tacticsEn, data, dataEn, cause, causeEn, impact, impactEn, result, resultEn。
英文每段是對應翻譯，不要另寫一場戰爭。`;

const base = (process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1").replace(/\/$/, "");
const model = process.env.MINIMAX_MODEL || "MiniMax-M2.7-highspeed";
// An eight-section bilingual record is a long generation. Node's undici
// headers timeout is 300s, which killed the first Falklands attempt with an
// unhandled TypeError and lost the run.
const TIMEOUT_MS = Number(process.env.DOSSIER_TIMEOUT_MS || 600_000);
const ATTEMPTS = Number(process.env.DOSSIER_ATTEMPTS || 3);

async function attempt() {
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const json = text.replace(/<think>[\s\S]*?<\/think>/g, "").match(/\{[\s\S]*\}/);
  if (!json) throw new Error("no json in reply");
  return JSON.parse(json[0]);
}

const SECTIONS = ["countries", "people", "kits", "tactics", "data", "cause", "impact", "result"];

let dossier = null;
let lastError = "";
for (let i = 1; i <= ATTEMPTS; i++) {
  try {
    const candidate = await attempt();
    const zh = SECTIONS.map((k) => candidate[k] || "").join("");
    const short = SECTIONS.filter((k) => (candidate[k] || "").length < MIN_SECTION);
    const missingEn = SECTIONS.filter((k) => !(candidate[k + "En"] || "").trim());
    if (missingEn.length) throw new Error(`missing english: ${missingEn.join(",")}`);
    if (zh.length < MIN_TOTAL) throw new Error(`too short: ${zh.length} < ${MIN_TOTAL}`);
    if (short.length) console.warn(`  sections under ${MIN_SECTION} chars: ${short.join(",")} (total ${zh.length}, accepted)`);
    dossier = candidate;
    console.log(`attempt ${i}: ${zh.length} chinese chars`);
    break;
  } catch (err) {
    // A timeout or a 5xx is worth another go; a short answer is the model's
    // own call and will not improve by asking again immediately.
    lastError = err instanceof Error ? err.message : String(err);
    console.error(`attempt ${i}/${ATTEMPTS} failed: ${lastError}`);
    if (/too short|missing english/.test(lastError)) break;
    if (i < ATTEMPTS) await new Promise((r) => setTimeout(r, 20_000 * i));
  }
}

if (!dossier) {
  console.error(`dossier not written for ${name}: ${lastError} — will retry next hour`);
  process.exit(1);
}

item.dossier = dossier;
item.dossier.updated = new Date().toISOString();
writeFileSync(out, JSON.stringify(feed, null, 2) + "\n");
const total = SECTIONS.map((k) => dossier[k] || "").join("").length;
console.log(`dossier written for ${name}, ${total} chars`);