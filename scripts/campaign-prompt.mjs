/**
 * The prompts the campaign writers share.
 *
 * The hourly job writes one campaign an hour. The bulk job writes as many as
 * the plan allows. They have to ask for the same thing, so the questions
 * live here rather than in either of them.
 */

export const SPANS = [
  { id: "wwi", hint: "1914到1918的真實戰役，裝備必須是當時已經列裝的火器、機槍、火砲、戰車或軍艦" },
  { id: "inter", hint: "1919到1935的真實衝突或演習，裝備必須是戰間期已存在的型號" },
  { id: "ww2a", hint: "1936到1941的真實戰役，點出一件當時在場的真實軍武" },
  { id: "ww2b", hint: "1942到1945的真實戰役，裝備必須是當時在場的戰車、飛機、軍艦或火砲" },
  { id: "cold", hint: "1946到1990的真實局部戰爭，只寫部隊與已列裝裝備，不寫平民，不寫核武製造" },
  { id: "now", hint: "1991到現在的真實戰役，裝備必須已經列裝或已經試飛，不要發明新型號" },
  { id: "p19", hint: "1800到1899的真實戰役，裝備必須是當時已經列裝的火繩槍、燧發槍、刺刀步槍、線膛砲或蒸汽鐵甲艦" },
  { id: "p16", hint: "1500到1799的真實戰役，裝備必須是當時已經列裝的火繩槍、輪發槍、火繩槍銃、長槍、刺刀步槍或野砲" },
  { id: "p11", hint: "1000到1499的真實戰役，裝備必須是當時已經列裝的長弓、弩、希臘火、突火槍、神臂弓、複合弓或攻城砲" },
  { id: "p01", hint: "公元前1000年以前的真實戰役，裝備必須是當時已經列裝的方陣長矛、短劍、標槍、弩、攻城槓或投石機" },
];

const NATIONS = "us 或 uk 或 de 或 ussr 或 jp 或 fr 或 it 或 cn 或 se 或 il 或 gr 或 tr 其中一個";

/**
 * Pick the next war to write.
 *
 * The round-robin span may already be used up, so the search falls through to
 * the next span that still has an unwritten war. When every war has been
 * written at least once the writer starts a second pass and re-examines a
 * battle with a different kit -- which is what the feed is for.
 */
export function pickWar(index, feed, extraTaken = new Set()) {
  // A war is taken when its CARD is on the site, and a card is identified by
  // its id. Two wars can share a name and still be two cards: 757-太原之戰
  // and 1125-太原之戰 are different battles, and the older one was never
  // written. Counting by name hid it, and the picker ran out of wars.
  const takenIds = new Set((feed.items ?? []).map((it) => it.id).filter(Boolean));
  for (const id of extraTaken) takenIds.add(id);
  const idOf = (w) => `${w.y}-${w.name}`.replace(/\s+/g, "").slice(0, 32);
  const span = SPANS[(feed.items?.length ?? 0) % SPANS.length];
  let pool = index.wars.filter((w) => w.span === span.id && !takenIds.has(idOf(w)));
  for (const s of SPANS) {
    if (pool.length) break;
    pool = index.wars.filter((w) => w.span === s.id && !takenIds.has(idOf(w)));
  }
  if (pool.length) return { war: pool[0], repeat: false };
  // Nothing unwritten is left. A second card for a war that already has one
  // is only allowed with a different id, otherwise the feed ends up with
  // dozens of copies of the same card.
  const spare = index.wars.filter((w) => !takenIds.has(idOf(w)));
  if (spare.length) return { war: spare[0], repeat: true };
  const all = index.wars;
  if (!all.length) return null;
  return { war: all[(feed.items?.length ?? 0) % all.length], repeat: false };
}

/**
 * The kit a campaign carries.
 *
 * Before this, the model picked the weapon and the portrait job drew a
 * picture of it afterwards. That left the card waiting for art, and the
 * waiting was the norm: the feed names weapons the roster has never heard
 * of, so the card sits on the "art pending" mark until a generation catches
 * up.
 *
 * The order is reversed now. The weapon comes from the library -- drawn
 * first, art and all -- and the model writes about that weapon. Every card
 * the feed produces has art by construction.
 *
 * The modern spans keep the old behaviour: the roster's own weapons cover
 * them, and the picture is already there.
 */
export function pickKit(war, library, index = 0, drawn = null) {
  let weapons = library?.weapons ?? [];
  // A weapon is only worth naming once its picture exists. The drawn set is
  // the catalog's own portrait index, so a card never points at an image that
  // has not been drawn yet.
  if (drawn) {
    const keys = new Set(Object.keys(drawn));
    const withArt = weapons.filter((w) => keys.has(w.id) || keys.has(w.designation.toLowerCase().replace(/[^a-z0-9]/g, "")));
    if (withArt.length) weapons = withArt;
  }
  const usable = weapons.filter((w) => w.year <= war.y);
  if (!usable.length) return null;
  const n = usable.length;
  // The closest match is the newest weapon that is still older than the war:
  // a musket for a war of 1810, not a bronze sword. Inside the war's own span
  // first, then the span before it, which is the older the era.
  const order = ["p01", "p11", "p16", "p19", "wwi", "inter", "ww2a", "ww2b", "cold", "now"];
  const at = order.indexOf(war.span);
  // Newest first inside the pool, and the pool is walked rather than always
  // taking its head: six hundred campaigns in one era should not all carry
  // the same musket.
  const newest = (pool) => pool.slice().sort((a, b) => b.year - a.year);
  // The war's own span first, then the older spans: a weapon from the era
  // before is a better fit than one from the era after.
  // The index walks the pool. A negative index would pick from the wrong
  // end, so it is brought inside the pool first.
  const at_ = ((index % n) + n) % n;
  for (let i = at < 0 ? 0 : at; i >= 0; i--) {
    const pool = newest(usable.filter((w) => w.span === order[i]));
    if (pool.length) return pool[at_ % pool.length];
  }
  // Nothing older: take the oldest weapon there is rather than none.
  const rest = newest(usable);
  return rest[rest.length - 1 - (at_ % rest.length)];
}

/** The question the brief writer asks. */
export function briefPrompt(war, kit) {
  const year = war.y < 0 ? `公元前${-war.y}年` : war.y;
  return `參考中文維基戰爭列表 https://zh.wikipedia.org/wiki/战争列表 。本輪只能寫「${war.name}」，開始年 ${year}，不得改名，不得換成列表以外的衝突。用繁體中文。不要口號，不要省略號，不要編造你不確定的精確數字，不要寫製造方法，不要寫平民傷亡。裝備服役年必須小於或等於 ${war.y}，不得使用該年之後才列裝的型號。只輸出一個 JSON 物件，欄位如下（值要換成真實內容，不要照抄下面的說明文字）：
- y: ${war.y}
- m: 1 到 12 的整數
- name: ${war.name}
- theater: 戰場名稱，例如「頓巴斯」「西沙群島」；不要只寫「戰場」三個字，要寫出具體地點
- place: 戰場的經緯度，格式 {"lng": 數字, "lat": 數字}，不確定就省略
- place.lng: 戰場大致的經度（小數點後兩位，東經為正數，西經為負數）
- place.lat: 戰場大致的緯度（北緯為正數，南緯為負數）
- brief: 九十到一百四十字，點出這場列表中的衝突和一件 ${war.y} 年或更早已列裝的真實裝備正式型號
- kit.name: 裝備中文名
- kit.designation: 正式型號
- kit.year: 服役年，不得晚於 ${war.y}${war.y < 0 ? "；公元前用負數（公元前500年寫 -500）" : ""}
- kit.nation: ${NATIONS}
- kit.layer: land 或 air 或 sea 其中一個
- kit.history: 四十到八十字，只講這件裝備在體系裡的位置
不要輸出欄位說明本身。${kit ? `本輪的裝備已經定下來了：${kit.name}（${kit.designation}，${kit.year < 0 ? `公元前${-kit.year}年` : `${kit.year}年`}）。只准寫這一件，不得換成別的型號，kit.name 與 kit.designation 就照抄「${kit.name}」與「${kit.designation}」，kit.year 就寫 ${kit.year}，kit.nation 寫 ${kit.nation}，kit.layer 寫 ${kit.layer}。` : ""}`;
}

const DOSSIER_SECTIONS = [
  "countries", "people", "kits", "tactics", "data", "cause", "impact", "result",
];

/** The question the dossier writer asks. */
export function dossierPrompt(name, year, minSection, minTotal) {
  return `用繁體中文和英文，為「${name}」（${year}）寫一篇由始至終的戰役實錄。要具體、生動，不要口號，不要省略號，不要寫平民，不要寫製造方法，不要編造你不確定的精確傷亡。裝備必須是 ${year} 年或更早已列裝的真實型號。

篇幅要求：中文每一段至少 ${minSection} 字，八段合共至少 ${minTotal} 字。寫不到這個長度代表你沒有把這場戰爭想清楚，請寫足。寧可寫具體的日期、編制、路線、彈藥與後勤細節，也不要重複結論。

只輸出一個 JSON 物件，欄位都要有中英成對：
${DOSSIER_SECTIONS.map((k) => `${k}, ${k}En`).join(", ")}。
英文每段是對應翻譯，不要另寫一場戰爭。`;
}

export { DOSSIER_SECTIONS };
