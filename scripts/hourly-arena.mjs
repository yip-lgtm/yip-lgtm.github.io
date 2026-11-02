// Hourly mutual roast chat.
//
// Pulls one hot thread from 4chan /k/ /g/ /news/, then asks MiniMax for a
// new LIHKG-style chat where weapon girls reply to each other. Each line is
// about 50 characters, sarcastic, and grounded in that kit's real service
// year. Appends one day to cute/arena.json.
import { readFileSync, writeFileSync } from "node:fs";
import { postJsonOrThrow } from "./minimax.mjs";

const OUT = process.env.ARENA_OUT || "cute/arena.json";
const key = process.env.MINIMAX_API_KEY || "";
const base = (process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1").replace(/\/$/, "");
const model = process.env.MINIMAX_MODEL || "MiniMax-M3.1-Flash-Preview";

const GIRLS = [
  ["虎式", "Tiger I", 1942, "厚、慢、履帶同油"],
  ["AK-47", "AK-47", 1947, "鬆、髒、照打"],
  ["M1加蘭德", "M1 Garand", 1936, "八發en-bloc"],
  ["M16", "M16", 1964, "初時卡殼，保養先係關鍵"],
  ["P-51野馬", "P-51", 1942, "長程護航，油夠先飛"],
  ["Bf 109", "Bf 109", 1937, "起落架窄"],
  ["零式", "A6M", 1940, "輕、遠、無自封油箱"],
  ["謝爾曼", "M4", 1942, "量產、修得到、運得到"],
  ["T-34", "T-34", 1940, "斜甲，初期無線少"],
  ["喀秋莎", "BM-13", 1941, "十六發齊射，精準唔好問"],
  ["俾斯麥", "Bismarck", 1940, "八日就沉，舵一卡就完"],
  ["大和", "Yamato", 1941, "460主砲，油不夠出唔到海"],
  ["噴火", "Spitfire", 1938, "轉彎好，產量先決定"],
  ["莫辛-納甘", "M1891", 1891, "兩邊都用，政權先換"],
  ["李-恩菲爾德", "Lee-Enfield", 1895, "十發彈倉"],
  ["MG42", "MG 42", 1942, "快，槍管幾秒就換"],
  ["四號", "Pz IV", 1937, "短管變長管，改得動先活"],
  ["企業號", "USS Enterprise", 1938, "艦載機先係拳頭"],
  ["斯圖卡", "Ju 87", 1937, "無制空就係靶"],
  ["波波沙", "PPSh-41", 1941, "彈鼓，近戰先有用"],
  ["艾布蘭", "M1", 1980, "燃氣輪食油"],
  ["海獵鷹", "Harrier", 1969, "垂直起降，航程就蝕"],
  ["戰隼", "F-16", 1978, "輕、平、改得多"],
  ["九五式", "Ha-Go", 1935, "薄，輕係為了運"],
];

async function hotThreads() {
  const boards = ["k", "g", "news"];
  const out = [];
  for (const b of boards) {
    try {
      const res = await fetch(`https://a.4cdn.org/${b}/catalog.json`);
      if (!res.ok) continue;
      const cat = await res.json();
      for (const page of cat) {
        for (const t of page.threads ?? []) {
          const sub = String(t.sub || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          const com = String(t.com || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
          if (!sub && !com) continue;
          out.push({ board: b, replies: t.replies || 0, sub: sub.slice(0, 80), com });
        }
      }
    } catch (err) {
      console.error(`  /${b}/ skipped: ${err instanceof Error ? err.message : err}`);
    }
  }
  out.sort((a, c) => c.replies - a.replies);
  return out.slice(0, 6);
}

function strip(s) {
  return String(s || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function parseRounds(raw) {
  const cleaned = strip(raw);
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start < 0 || end < start) return null;
  try {
    const arr = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(arr)) return null;
    const rounds = arr
      .map((r, i) => ({
        id: `h-${Date.now()}-${i}`,
        name: String(r.name || "").slice(0, 20),
        weapon: String(r.weapon || ""),
        year: Number(r.year) || 0,
        text: String(r.text || "").replace(/\s+/g, "").slice(0, 55),
      }))
      .filter((r) => r.name && r.text.length >= 12);
    return rounds.length >= 6 ? rounds.slice(0, 12) : null;
  } catch {
    return null;
  }
}

function fallback(topic, hour) {
  const start = hour % GIRLS.length;
  const pick = Array.from({ length: 8 }, (_, i) => GIRLS[(start + i * 3) % GIRLS.length]);
  return pick.map((g, i) => {
    const prev = pick[(i + pick.length - 1) % pick.length];
    return {
      id: `fb-${hour}-${i}`,
      name: g[0],
      weapon: g[1],
      year: g[2],
      text: i === 0
        ? `${topic.board}板又開。我${g[2]}列裝，${g[3]}。你哋争帖，我争補給。`
        : `@${prev[0]} 你${prev[3]}。我${g[2]}先列裝，${g[3]}。串完都要油。`,
    };
  });
}

const threads = await hotThreads();
const topic = threads[0] || { board: "k", replies: 0, sub: "軍工熱帖", com: "今日無人開帖" };
const hour = new Date().toISOString().slice(0, 13).replace(/[-T:]/g, "");
const roster = GIRLS.map((g) => `${g[0]} ${g[1]} ${g[2]} ${g[3]}`).join("\n");
const prompt = `你是連登筆戰寫手。用真實兵器娘互串，唔好寫成說明文。

今日熱帖：/${topic.board}/ 「${topic.sub || topic.com}」 回覆 ${topic.replies}
內容摘要：${topic.com}

可出場的兵器（名字、型號、列裝年、限制）：
${roster}

輸出一個 JSON 陣列，8 到 12 則。每則：
{"name":"虎式","weapon":"Tiger I","year":1942,"text":"..."}
規則：
- 第一則開場，之後每則用 @上一個人名 回覆，要互串，唔好各說各話。
- 每則 text 約 50 字，繁體，連登串，短、毒、有數字。
- 只用該兵器的列裝年同機械限制。裝備年必須早於話題年份；話題是今日新聞就用自己的服役年。
- 不寫製造方法，不寫平民傷亡，不寫仇恨字眼，不寫黨衛軍崇拜。
- 只輸出 JSON 陣列。`;

let rounds = null;
if (key) {
  try {
    const body = await postJsonOrThrow(
      `${base}/chat/completions`,
      {
        model,
        temperature: 0.8,
        max_completion_tokens: 4000,
        messages: [
          { role: "system", content: "只用繁體中文。最後只留一個 JSON 陣列。不要長篇推理。" },
          { role: "user", content: prompt },
        ],
      },
      { headers: { Authorization: `Bearer ${key}` }, timeoutMs: 180000 },
    );
    rounds = parseRounds(body.choices?.[0]?.message?.content ?? "");
  } catch (err) {
    console.error(`  minimax: ${err instanceof Error ? err.message : err}`);
  }
} else {
  console.error("  no MINIMAX_API_KEY, using fallback");
}
if (!rounds) rounds = fallback(topic, Number(hour.slice(-2)) || 0);

const arena = JSON.parse(readFileSync(OUT, "utf8"));
const date = new Date().toISOString().slice(0, 16).replace("T", "-");
arena.days = arena.days || [];
arena.days.unshift({
  date,
  topic: {
    id: "chat",
    name: `互串 ${topic.board}`,
    brief: `/${topic.board}/ ${topic.sub || "熱帖"} · ${topic.replies} 回覆。新 chat，互相回覆。`,
  },
  rounds,
});
arena.days = arena.days.slice(0, 48);
arena.note = "每小時一場新 chat 互串。對住 4chan /k/ /g/ /news/ 熱帖，約50字，連登串，只用真實列裝年。";
writeFileSync(OUT, JSON.stringify(arena, null, 2));
console.log(`wrote ${rounds.length} lines for /${topic.board}/ ${topic.sub || topic.com}`);
