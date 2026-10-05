import { writeFileSync } from "node:fs";

const key = process.env.MINIMAX_API_KEY;
const out = process.env.DAILY_OUT || "public/daily.json";
if (!key) {
  console.error("MINIMAX_API_KEY missing");
  process.exit(1);
}

const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hong_Kong" }).format(new Date());
const day = Number(date.slice(8, 10));
const future = day % 10 === 7;
const prompt = future
  ? `今天是 ${date}。用繁體中文寫一頁近未來戰史，只能提到已經列裝或已經試飛的真實裝備，不准發明新武器，不准寫製造方法，不准寫平民傷亡。只輸出一個 JSON。k 是短標籤，t 最多八個字，b 是九十到一百四十字，不要省略號，不要編造你不確定的精確數字。`
  : `今天是 ${date}。用繁體中文只寫一件事：一件真實軍武在它真正服役的年份，或一場真實戰役。不要寫百年總覽，不要把後來的型號提前。從火器、機槍、戰車、飛機、軍艦、飛彈、核威懾到已經列裝的無人機裡挑一個。只輸出一個 JSON。k 是年份，t 最多八個字且不要口號，b 是九十到一百四十字。不要省略號，不要編造精確數字，不要寫製造方法。`;

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
    const b = String(item.b ?? "").replace(/\s+/g, " ").trim();
    const t = String(item.t ?? "").trim();
    if (b.length < 40 || b.includes("...") || /title|label/.test(t)) return null;
    return { k: String(item.k ?? date).slice(0, 24), t: t.slice(0, 16), b: b.slice(0, 180) };
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
const page = { date, ...parsed, source: "llm" };
writeFileSync(out, JSON.stringify(page, null, 2) + "\n");
console.log(page.date, page.t);
