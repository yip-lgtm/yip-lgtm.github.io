import { readFileSync, writeFileSync } from "node:fs";

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
];

let feed = { items: [] };
try {
  feed = JSON.parse(readFileSync(out, "utf8"));
  if (!Array.isArray(feed.items)) feed.items = [];
} catch {
  feed = { items: [] };
}

const index = JSON.parse(readFileSync(new URL("../public/war-index.json", import.meta.url), "utf8"));
const taken = new Set(feed.items.map((it) => it.battle?.name).filter(Boolean));
const span = SPANS[feed.items.length % SPANS.length];
const pool = index.wars.filter((w) => w.span === span.id && !taken.has(w.name));
const war = pool[0] || index.wars.find((w) => !taken.has(w.name));
if (!war) {
  console.error("war index exhausted");
  process.exit(1);
}
const prompt = `參考中文維基戰爭列表 https://zh.wikipedia.org/wiki/战争列表 。本輪只能寫「${war.name}」，開始年 ${war.y}，不得改名，不得換成列表以外的衝突。用繁體中文。不要口號，不要省略號，不要編造你不確定的精確數字，不要寫製造方法，不要寫平民傷亡。只輸出一個 JSON：{"y":${war.y},"m":月份數字,"name":"${war.name}","theater":"戰場","brief":"九十到一百四十字，點出這場列表中的衝突和一件當時已列裝的真實裝備正式型號","kit":{"name":"裝備中文名","designation":"正式型號","year":服役年,"nation":"us|uk|de|su|jp|fr|it|cn|se|il 其中一個","layer":"land|air|sea","history":"四十到八十字，只講這件裝備在體系裡的位置"}}`;

const base = (process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1").replace(/\/$/, "");
const model = process.env.MINIMAX_MODEL || "MiniMax-M2.7-highspeed";

async function once() {
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      max_completion_tokens: 4000,
      messages: [
        { role: "system", content: "只用繁體中文。最後只留一個 JSON 物件。" },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) return null;
  const body = await res.json();
  const raw = body.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const blob = cleaned.includes("{") ? cleaned : raw;
  const start = blob.indexOf("{");
  const end = blob.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const item = JSON.parse(blob.slice(start, end + 1));
    const brief = String(item.brief ?? "").replace(/\s+/g, " ").trim();
    const name = String(item.name ?? "").trim();
    const kit = item.kit ?? {};
    const history = String(kit.history ?? "").trim();
    if (brief.length < 40 || !name || history.length < 20) return null;
    if (feed.items.some((it) => it.battle?.name === name)) return null;
    const y = Number(item.y);
    const m = Number(item.m);
    if (!y || m < 1 || m > 12) return null;
    const layer = ["land", "air", "sea"].includes(kit.layer) ? kit.layer : "land";
    const nation = ["us", "uk", "de", "su", "jp", "fr", "it", "cn", "se", "il"].includes(kit.nation) ? kit.nation : "us";
    return {
      id: `${war.y}-${war.name}`.replace(/\s+/g, "").slice(0, 32),
      added: new Date().toISOString(),
      span: war.span,
      source: index.source,
      battle: { y: war.y, m, name: war.name, theater: String(item.theater ?? "").slice(0, 16), brief: brief.slice(0, 180) },
      kit: {
        name: String(kit.name ?? name).slice(0, 16),
        designation: String(kit.designation ?? "").slice(0, 40),
        year: Number(kit.year) || y,
        nation,
        layer,
        history: history.slice(0, 120),
      },
    };
  } catch {
    return null;
  }
}

let parsed = null;
for (let i = 0; i < 3 && !parsed; i++) parsed = await once();
if (!parsed) {
  console.error("no usable json");
  process.exit(1);
}
feed.items.push(parsed);
writeFileSync(out, JSON.stringify(feed, null, 2) + "\n");
console.log(parsed.battle.y, parsed.battle.name, parsed.kit.designation);
