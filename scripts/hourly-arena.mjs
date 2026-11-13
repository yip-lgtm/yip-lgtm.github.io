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

/**
 * Each weapon gets several ways to describe itself, so no two posts in a
 * thread read the same.
 */
const TRAITS = {
  虎式: ["厚、慢、履帶同油", "皮厚食油，行得慢但擋得住", "重到拖都要人推", "一箱油打一場仗"],
  "AK-47": ["鬆、髒、照打", "鬆到手都震，照打一樣準", "髒到鏽住都仲射得出", "萬人海都照樣向前"],
  "M1加蘭德": ["八發en-bloc", "八發打完全自動排", "彈夾一按就出，唔使拉栓", "八發打完靠人再壓"],
  M16: ["初時卡殼，保養先係關鍵", "卡殼就係冇清膛", "一卡就停，搞到人喊", "保養到唔卡，先叫快"],
  "P-51野馬": ["長程護航，油夠先飛", "油夠飛得到，油唔夠就喺度等死", "航程遠，炸彈跟得住", "引擎貪油，但飛得遠"],
  "Bf 109": ["起落架窄", "落腳位窄得似企喺刀刃", "轉得快，冇乜油命", "窄到landing都唔平"],
  零式: ["輕、遠、無自封油箱", "輕到飛得快，油箱冇自封就係死路", "遠得過人，但冇油返唔到", "細身快飛，遠程要靠命"],
  謝爾曼: ["量產、修得到、運得到", "壞咗即修，唔等零件", "量大到補得返", "多到可以壞咗再換"],
  "T-34": ["斜甲，初期無線少", "斜甲食炮，冇無線就靠手勢", "斜甲跳得快，初期靠喊", "少一部機就當冇"],
  喀秋莎: ["十六發齊射，精準唔好問", "十六發一次過出去，唔準邊個食", "齊射落去冇得避", "一排齊射，地圖都唔准"],
  俾斯麥: ["八日就沉，舵一卡就完", "舵一卡就由你話事", "八日沉，撞唔撞得郁睇舵", "主力艦撞唔過人"],
  大和: ["460主砲，油不夠出唔到海", "460主砲一打就知幾重", "油唔夠就係個浮動堡壘", "最重嗰隻，油最唔夠"],
  噴火: ["轉彎好，產量先決定", "轉得靚但要一堆引擎先出到", "產量追得上就飛得掂", "翼轉得彎，廠要轉得更快"],
  "莫辛-納甘": ["兩邊都用，政權先換", "子彈兩邊都用，換嘅係政府", "俄佬用，列強都手槍埋一支", "萬國槍，戰場唔分國界"],
  "李-恩菲爾德": ["十發彈倉", "十發打完要拉栓", "彈倉十發，槍機拉到飛起", "雨中照打十發"],
  MG42: ["快，槍管幾秒就換", "打得快，槍管幾秒就燒", "換管比換彈仲快", "火力密到冇人敢企"],
  四號: ["短管變長管，改得動先活", "短管打唔穿就改長", "改裝改到最後死機", "有得改就未死透"],
  企業號: ["艦載機先係拳頭", "冇飛機就冇牙", "艦載機先係真射程", "拳頭夠硬就冇問題"],
  斯圖卡: ["無制空就係靶", "俯衝快，但頭頂要有人頂", "冇制空權就係鐵棺材", "飛得落去就係送"],
  波波沙: ["彈鼓，近戰先有用", "彈鼓打得快，近身更加好", "近戰一按就掃清", "細個但火力密"],
  艾布蘭: ["燃氣輪食油", "食油吃得快", "推力夠，油唔夠就熄", "空母用得起，冇錢用唔起"],
  海獵鷹: ["垂直起降，航程就蝕", "升得起但飛唔遠", "垂直起降，航程係命", "唔使跑道，代價係短命"],
  戰隼: ["輕、平、改得多", "輕到改到冇樣，改到你唔認得", "飛得快，改得更快", "萬能係因為成部都換"],
  九五式: ["薄，輕係為了運", "薄到成架車都輕咗", "輸得起，輸唔起就薄咗", "輕到運輸冇問題"],
};

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
          out.push({ board: b, no: t.no, replies: t.replies || 0, sub: sub.slice(0, 80), com });
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

/** The roster, by name: the year and designation must match the name. */
const BY_NAME = new Map(GIRLS.map((g) => [g[0], g]));
/** Every catchphrase, and who owns it. */
const TRAIT_OWNER = new Map();
for (const [name, pool] of Object.entries(TRAITS)) {
  for (const t of pool) if (!TRAIT_OWNER.has(t)) TRAIT_OWNER.set(t, name);
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
      .map((r, i) => {
        const name = String(r.name || "").trim().slice(0, 20);
        const g = BY_NAME.get(name);
        if (!g) return null; // not on the roster: drop it
        let text = String(r.text || "").replace(/\s+/g, "").slice(0, 90);
        // The model sometimes borrows another weapon's catchphrase, or gets
        // the year wrong. The roster is the truth, so put it right.
        for (const [trait, owner] of TRAIT_OWNER) {
          if (owner === name) continue;
          if (text.includes(trait)) {
            const own = TRAITS[name] ?? [g[3]];
            text = text.replace(trait, own[(i + text.length) % own.length]);
          }
        }
        return {
          id: `h-${Date.now()}-${i}`,
          name,
          weapon: g[1],
          year: g[2],
          text,
        };
      })
      .filter((r) => r && r.text.length >= 12);
    return rounds.length >= 6 ? rounds.slice(0, 12) : null;
  } catch {
    return null;
  }
}

const OPENERS = [
  (p, t) => `${p} 你未答「${t}」`,
  (p, t) => `喂 ${p}，${t} 嗰條你點解唔答`,
  (p, t) => `${p} 你遲咗好耐先開口，${t} 喺度等緊`,
  (p, t) => `${p}，${t} 都出咗咗你仲未串`,
  (p, t) => `${p} 收下「${t}」呢條題`,
  (p, t) => `咁 ${p}，${t} 呢條你咩睇`,
];

const CLOSERS = [
  "串完都要油，冇得你哋一個講晒。",
  "呢度唔係講spec，係講邊個仲企喺度。",
  "你講你嘅，我講我嘅，條帖自己會證明。",
  "打完算數，唔使喺度比身段。",
  "樓主唔好意思，我講嘅全部係當年真事。",
  "我冇死過，所以我有得講。",
  "你如果想知，去查維基啦。",
  "我要油要人，你得個名。",
  "呢場輸贏唔關你事，關我事。",
  "好耐冇人答，咁我頂上。",
  "唔好淨係改我個名，講數。",
  "打完好似冇贏，但至少冇畀人當消耗品。",
  "講完我收工，你慢慢諗。",
  "要串就串，唔好只係搵人串。",
  "得閒不如幫手補料。",
  "我講嘅係年份，你講嘅係型號。",
];

/**
 * The fallback runs when the model is unavailable. It still has to read like a
 * thread: every post names the hot post, answers it in the weapon's own
 * words, and closes in its own way.
 */
function fallback(topic, hour) {
  const title = (topic.sub || topic.com || "熱帖").replace(/[<>]/g, "").slice(0, 28);
  const subject = (topic.com || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 18);
  const start = hour % GIRLS.length;
  const pick = Array.from({ length: 8 }, (_, i) => GIRLS[(start + i * 3) % GIRLS.length]);
  return pick.map((g, i) => {
    const prev = pick[(i + pick.length - 1) % pick.length];
    const pool = TRAITS[g[0]] ?? [g[3]];
    const trait = pool[(i + hour) % pool.length];
    const closer = CLOSERS[(i * 5 + hour) % CLOSERS.length];
    const opener = OPENERS[(i + hour) % OPENERS.length](prev[0], title);
    const text = i === 0
      ? `4chan /${topic.board}/「${title}」${topic.replies}回${subject ? `，講緊${subject}` : ""}。我${g[2]}列裝，${trait}。${closer}`
      : `${opener}。我${g[2]}先列裝，${trait}。${closer}`;
    return {
      id: `fb-${hour}-${i}`,
      name: g[0],
      weapon: g[1],
      year: g[2],
      text,
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
- 每則必須提到今日4chan熱帖的題目，唔好只講自己規格。
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
    name: (topic.sub || `/${topic.board}/`).slice(0, 24),
    brief: `4chan /${topic.board}/ 熱帖「${topic.sub || "熱帖"}」· ${topic.replies} 回覆。${topic.no ? ` https://boards.4chan.org/${topic.board}/thread/${topic.no}` : ""}`,
    board: topic.board,
    thread: topic.no || null,
    replies: topic.replies,
  },
  rounds,
});
arena.days = arena.days.slice(0, 48);
arena.note = "每小時一場新 chat 互串。對住 4chan /k/ /g/ /news/ 熱帖，約50字，連登串，只用真實列裝年。";
writeFileSync(OUT, JSON.stringify(arena, null, 2));
console.log(`wrote ${rounds.length} lines for /${topic.board}/ ${topic.sub || topic.com}`);
