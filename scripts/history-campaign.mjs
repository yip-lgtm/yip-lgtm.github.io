import { readFileSync, writeFileSync } from "node:fs";
import { postJsonOrThrow } from "./minimax.mjs";

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
// Swapped from MiniMax-M2.7-highspeed at the owner's call. Like the image
// model, this is unverified against the live API: if the service rejects it
// the run fails loudly with the response body rather than writing a bad entry.
// MINIMAX_MODEL=MiniMax-M2.7-highspeed reverts without a code change.
const model = process.env.MINIMAX_MODEL || "MiniMax-M3.1-Flash-Preview";
// An eight-section bilingual record is a long generation. Node's undici
// headers timeout is 300s, which killed the first Falklands attempt with an
// unhandled TypeError and lost the run.
// The model thinks before it writes, and eight bilingual sections take a
// long time to come back. 600 seconds was not enough: the request was
// killed mid-answer. The job runs once an hour, so it can afford to wait.
const TIMEOUT_MS = Number(process.env.DOSSIER_TIMEOUT_MS || 1_800_000);
const ATTEMPTS = Number(process.env.DOSSIER_ATTEMPTS || 3);
// The reason the last answer was rejected. The next attempt is told about
// it, so one incomplete answer does not cost the whole hour.
let lastError = "";

async function attempt() {
  const data = await postJsonOrThrow(
    `${base}/chat/completions`,
    {
      model,
      messages: [{ role: "user", content: prompt + (lastError ? `\n上一份答案被拒絕：${lastError}。請補齊後重新輸出完整的 JSON 物件。` : "") }],
      temperature: 0.4,
      // Eight bilingual sections of 150 characters each is a long answer, and
      // the model thinks before it writes. Without a budget the service cut
      // the reply off at the default length, and the last section -- result
      // and resultEn -- was the part that went missing.
      max_completion_tokens: Number(process.env.DOSSIER_MAX_TOKENS || 32000),
    },
    { headers: { Authorization: `Bearer ${key}` }, timeoutMs: TIMEOUT_MS },
  );
  const text = data.choices?.[0]?.message?.content ?? "";
  const json = text.replace(/<think>[\s\S]*?<\/think>/g, "").match(/\{[\s\S]*\}/);
  if (!json) throw new Error("no json in reply");
  return JSON.parse(json[0]);
}

const SECTIONS = ["countries", "people", "kits", "tactics", "data", "cause", "impact", "result"];

let dossier = null;
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
    // A timeout or a 5xx is worth another go -- and so is a short answer,
    // once the next attempt is told what was missing. Giving up on the first
    // rejection is what let one missing section cost the whole hour: the
    // job failed, and the campaign the feed step had already written was
    // never committed.
    lastError = err instanceof Error ? err.message : String(err);
    console.error(`attempt ${i}/${ATTEMPTS} failed: ${lastError}`);
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