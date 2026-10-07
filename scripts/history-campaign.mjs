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
const prompt = `用繁體中文和英文，為「${name}」（${year}）寫一篇由始至終的戰役實錄。要具體、生動，不要口號，不要省略號，不要寫平民，不要寫製造方法，不要編造你不確定的精確傷亡。裝備必須是 ${year} 年或更早已列裝的真實型號。只輸出一個 JSON 物件，欄位都要有中英成對：
countries, countriesEn, people, peopleEn, kits, kitsEn, tactics, tacticsEn, data, dataEn, cause, causeEn, impact, impactEn, result, resultEn。
中文每段至少 80 字，合共超過 500 字。英文每段是對應翻譯，不要另寫一場戰爭。`;

const base = (process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1").replace(/\/$/, "");
const model = process.env.MINIMAX_MODEL || "MiniMax-M2.7-highspeed";
const res = await fetch(`${base}/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
  body: JSON.stringify({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  }),
});
if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}
const data = await res.json();
const text = data.choices?.[0]?.message?.content ?? "";
const json = text.replace(/<think>[\s\S]*?<\/think>/g, "").match(/\{[\s\S]*\}/);
if (!json) {
  console.error("no json");
  process.exit(1);
}
const dossier = JSON.parse(json[0]);
const zh = ["countries", "people", "kits", "tactics", "data", "cause", "impact", "result"].map((k) => dossier[k] || "").join("");
if (zh.length < 500) {
  console.error(`dossier too short: ${zh.length}`);
  process.exit(1);
}
item.dossier = dossier;
item.dossier.updated = new Date().toISOString();
writeFileSync(out, JSON.stringify(feed, null, 2));
console.log(`dossier written for ${name}, ${zh.length} chars`);
