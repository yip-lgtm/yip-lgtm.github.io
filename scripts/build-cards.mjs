#!/usr/bin/env node
/**
 * Build the card deck: one page with every card and its 立繪.
 *
 * The deck used to be a hand-built file that went stale the moment a
 * portrait landed, and it still said "立繪待生成" on 94 of its 100 cards
 * while the live site had every one of them drawn. It is generated now.
 *
 * Two sources:
 *   cute/catalog.json  the roster and the reference arms, dumped by the app
 *                       repo's catalog-dump job
 *   cute/feed.json     the campaigns, which the Pages repo owns
 *
 * A campaign that names a weapon the roster already has is the same card
 * and is not listed twice: one card, one image.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const catalogPath = process.env.CATALOG_JSON || resolve(REPO, "cute/catalog.json");
const feedPath = process.env.FEED_JSON || resolve(REPO, "cute/feed.json");
const out = process.env.CARDS_OUT || resolve(REPO, "cute/cards.html");

/**
 * The deck keeps the look it has had since it was first built: the
 * stylesheet is the one the page already carried, unchanged.
 */
const css = "*{box-sizing:border-box}\n:root{--bg:#0c0a0b;--card:#171315;--line:#3a2f31;--sec:#2b2325;--fg:#efe6e0;--mut:#a9988f;--sub:#8a7970;--acc:#e8a080}\nbody{margin:0;background:var(--bg);color:var(--fg);font-family:\"Noto Sans CJK TC\",\"Noto Sans TC\",\"PingFang TC\",\"Microsoft JhengHei\",system-ui,sans-serif;padding:24px}\nheader, .bar, .grid{max-width:1360px;margin-left:auto;margin-right:auto}\nh1{font-size:25px;margin:0 0 4px}\n.sub{color:var(--mut);font-size:13px;margin:0 0 4px}\n.bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:20px}\nbutton{background:#241d1f;color:var(--mut);border:1px solid var(--line);border-radius:8px;padding:7px 13px;font-size:13px;cursor:pointer;font-family:inherit}\nbutton.on{background:var(--acc);color:#2a1410;border-color:var(--acc);font-weight:600}\n.sp{margin-left:auto;color:var(--sub);font-size:12px;font-variant-numeric:tabular-nums}\n.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:18px}\n.card{background:var(--card);border:1px solid var(--line);border-radius:13px;overflow:hidden;display:flex;flex-direction:column;transition:.15s}\n.card:hover{border-color:#c47a5c;transform:translateY(-2px)}\n.art{position:relative;aspect-ratio:2/3;background:#131011;overflow:hidden}\n.face-img{width:100%;height:100%;object-fit:cover;display:block}\n.yb{position:absolute;top:0;left:0;right:0;background:linear-gradient(180deg,rgba(12,10,11,.92),transparent);color:#f6d9cb;font-size:12px;padding:7px 10px;font-variant-numeric:tabular-nums}\n.need{position:absolute;bottom:7px;right:8px;background:rgba(196,122,92,.92);color:#2a1410;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:600}\n.face-ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;\n  background:linear-gradient(168deg,color-mix(in srgb,var(--nc) 60%,#0c0a0b),#100d0f 68%);}\n.ph-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:28px 28px;mask-image:radial-gradient(circle at 50% 45%,#000 25%,transparent 80%)}\n.ph-bar{position:absolute;top:0;left:0;right:0;height:5px;background:var(--nc);box-shadow:0 0 20px var(--nc)}\n.ph-layer{position:absolute;top:10px;right:12px;font-size:12px;color:rgba(255,255,255,.45);letter-spacing:.25em}\n.ph-initial{position:relative;font-size:88px;font-weight:700;color:rgba(255,255,255,.9);line-height:1;text-shadow:0 4px 26px rgba(0,0,0,.75)}\n.ph-slot{position:relative;margin-top:20px;font-size:9px;letter-spacing:.22em;color:rgba(232,160,128,.85);border:1px solid rgba(232,160,128,.35);border-radius:4px;padding:4px 14px}\n.head{padding:12px 14px 10px;border-bottom:1px solid var(--line)}\n.head h3{margin:0;font-size:18px;font-weight:600}\n.head .desig{margin:3px 0 0;font-size:11.5px;color:var(--sub)}\n.head .nat{margin:7px 0 0;font-size:12px;color:var(--acc)}\n.sec{padding:10px 14px 12px;border-bottom:1px solid var(--line)}\n.sec:last-child{border-bottom:0}\n.sec h4{margin:0 0 7px;font-size:11px;font-weight:600;color:var(--acc);letter-spacing:.24em}\n.r{display:flex;gap:10px;padding:2.5px 0;font-size:12px;line-height:1.5}\n.r .k{flex:0 0 42px;color:var(--sub)}\n.r .v{flex:1;color:var(--fg);font-variant-numeric:tabular-nums}\n.na{color:#6b5c56;font-style:italic}\n.en{color:var(--sub);font-size:11px}\n.blurb{color:var(--mut);font-size:11.5px}\n.cost{display:inline-block;margin-left:4px;font-size:10px;color:#f0c9a8;border:1px solid #6b4a3a;border-radius:3px;padding:0 5px}\n.hist{margin:0;font-size:12px;line-height:1.65;color:var(--mut)}\n.voice{margin:8px 0 0;font-size:12px;color:#e8c4ac;line-height:1.55}\n.epi{margin:8px 0 0;font-size:11px;color:var(--sub)}\n@media print{body{background:#fff}.bar{display:none}}";

const NATION_NAMES = {
  de: "德國", us: "美國", ussr: "蘇聯", uk: "英國", jp: "日本", cn: "中國",
  fr: "法國", it: "義大利", se: "瑞典", il: "以色列", gr: "希臘", tr: "鄂圖曼", es: "西班牙",
};
const NATION_TINT = {
  fr: "#4A6E8A", de: "#5B6B5B", uk: "#7A6A44", us: "#4A5240", ussr: "#4B5A3C",
  jp: "#6A5B4A", it: "#6A6B5A", se: "#5C6266", cn: "#6B6F4E", il: "#5C6144",
  gr: "#5A6E8C", tr: "#8C5A4A", es: "#8C7A4A",
};
const LAYER_NAMES = { land: "陸", air: "空", sea: "海" };
const KIND_NAMES = {
  tank: "戰車", infantry: "步兵", artillery: "火砲", fighter: "戰鬥機", bomber: "轟炸機",
  battleship: "戰列艦", carrier: "航母", cruiser: "巡洋艦", submarine: "潛艇", destroyer: "驅逐艦",
};

/** The era a year belongs to. The same partition the app's gallery uses. */
function eraOf(year) {
  if (year <= 0) return { id: "p01", name: "公元前" };
  if (year <= 1499) return { id: "p11", name: "1000-1499" };
  if (year <= 1799) return { id: "p16", name: "1500-1799" };
  if (year <= 1899) return { id: "p19", name: "1800-1899" };
  if (year <= 1918) return { id: "wwi", name: "一戰" };
  if (year <= 1935) return { id: "inter", name: "戰間" };
  if (year <= 1945) return { id: "ww2", name: "二戰" };
  if (year <= 1990) return { id: "cold", name: "冷戰" };
  return { id: "now", name: "現代" };
}

const catalog = existsSync(catalogPath) ? JSON.parse(readFileSync(catalogPath, "utf8")) : { cards: [] };
const feed = existsSync(feedPath) ? JSON.parse(readFileSync(feedPath, "utf8")) : { items: [] };

const cards = [];
const seenPortrait = new Set();
for (const c of catalog.cards ?? []) {
  cards.push({ ...c, source: "catalog" });
  if (c.portrait) seenPortrait.add(c.portrait);
}
for (const it of feed.items ?? []) {
  const kit = it.kit ?? {};
  if (!kit.name) continue;
  const portrait = kit.portrait ?? null;
  // A campaign that points at a roster portrait is the same card.
  if (portrait && seenPortrait.has(portrait)) continue;
  if (portrait) seenPortrait.add(portrait);
  cards.push({
    id: `feed-${it.id}`,
    name: kit.name,
    designation: kit.designation || kit.name,
    nation: kit.nation || "us",
    layer: kit.layer || "land",
    kind: kit.kind || "infantry",
    year: Number(kit.year) || Number(it.battle?.y) || 0,
    epithet: it.battle?.name ?? "",
    pen: 0,
    armor: 0,
    history: kit.history ?? "",
    portrait,
    source: "campaign",
  });
}
cards.sort((a, b) => a.year - b.year || a.name.localeCompare(b.name, "zh-Hant"));

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// "完成" means the picture is there, not that a reference points at it: a
// campaign's picture is drawn a moment after the campaign is written.
const portraitDir = resolve(REPO, "cute/portraits");
const hasFile = (c) => {
  if (!c.portrait) return false;
  return existsSync(join(portraitDir, c.portrait.split("/").pop()));
};
const withArt = cards.filter(hasFile).length;
const art = (c) =>
  c.portrait
    ? `<img class="face-img" src="${esc(c.portrait)}" alt="${esc(String(c.name).slice(0,1))}" loading="lazy" onerror="this.outerHTML=this.dataset.fallback">`
    : `<div class="face-ph" style="--nc:${NATION_TINT[c.nation] ?? "#4A5240"}">
         <div class="ph-grid"></div><div class="ph-bar"></div>
         <div class="ph-layer">${LAYER_NAMES[c.layer] ?? "陸"}</div>
         <div class="ph-initial">${esc(String(c.name).slice(0, 1))}</div>
         <div class="ph-slot">立繪待生成</div>
       </div>`;

const html = `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<title>銅與碲 · 兵器娘卡牌</title>
<style>
${css}
</style>
</head><body>
<header>
  <h1>銅與碲 · 兵器娘卡牌</h1>
  <p class="sub"><a href="record.html" style="color:var(--acc)">→ 更新記錄</a></p>
<p class="sub">全 ${cards.length} 張 · 立繪完成 ${withArt} · 待生成 ${cards.length - withArt}</p>
</header>
<div class="bar" id="bar">
  <button class="f on" data-f="layer" data-v="all">全層</button>
  <button class="f" data-f="layer" data-v="land">陸</button>
  <button class="f" data-f="layer" data-v="air">空</button>
  <button class="f" data-f="layer" data-v="sea">海</button>
  <span style="width:14px"></span>
  <button class="e on" data-e="all">全部</button>
  <button class="e" data-e="p01">公元前</button>
  <button class="e" data-e="p11">1000-1499</button>
  <button class="e" data-e="p16">1500-1799</button>
  <button class="e" data-e="p19">1800-1899</button>
  <button class="e" data-e="wwi">一戰</button>
  <button class="e" data-e="inter">戰間</button>
  <button class="e" data-e="ww2">二戰</button>
  <button class="e" data-e="cold">冷戰</button>
  <button class="e" data-e="now">現代</button>
  <span class="sp" id="cnt"></span>
</div>
<div class="grid" id="grid">
${cards
  .map(
    (c) => `<article class="card" data-layer="${esc(c.layer)}" data-era="${eraOf(c.year).id}" data-nation="${esc(c.nation)}">
  <div class="art">${art(c)}
         <span class="yb">${c.year < 0 ? `前${-c.year}` : c.year} · ${LAYER_NAMES[c.layer] ?? "陸"}</span>${
           c.portrait ? "" : '<span class="need">待生成</span>'
         }</div>
  <div class="head">
    <h3>${esc(c.name)}</h3>
    <p class="desig">${esc(c.designation)}</p>
    <p class="nat">${esc(NATION_NAMES[c.nation] ?? c.nation)} · ${LAYER_NAMES[c.layer] ?? "陸"}</p>
  </div>
  <div class="sec"><h4>型號</h4><div class="r"><span class="k">全名</span><span class="v">${esc(c.designation)}</span></div><div class="r"><span class="k">種類</span><span class="v">${esc(KIND_NAMES[c.kind] ?? c.kind)}</span></div><div class="r"><span class="k">年份</span><span class="v">${c.year < 0 ? `公元前${-c.year}` : c.year}</span></div></div>
  <div class="sec"><h4>數據</h4><div class="r"><span class="k">火力</span><span class="v">${c.pen}</span></div><div class="r"><span class="k">防護</span><span class="v">${c.armor}</span></div></div>
  <div class="sec"><h4>紀事</h4><p class="hist">${esc(c.history)}</p>${
    c.epithet ? `<p class="epi">${esc(c.epithet)}</p>` : ""
  }</div>
</article>`,
  )
  .join("\n")}
</div>
<script>
// A campaign's picture is drawn a moment after the campaign is written. Until
// it lands the file is not there, and a broken image is worse than the
// placeholder that says so.
const esc=(s)=>String(s??'').replace(/[&<>"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
document.querySelectorAll('img.face-img').forEach((img)=>{
  const t=img.closest('.art');
  if(!t) return;
  const tint=(t.dataset.tint)||'#4A5240';
  img.dataset.fallback='<div class="face-ph" style="--nc:'+tint+'"><div class="ph-grid"></div><div class="ph-bar"></div><div class="ph-layer"></div><div class="ph-initial">'+esc(img.alt||'')+'</div><div class="ph-slot">立繪待生成</div></div>';
});
const grid=document.getElementById('grid'),cnt=document.getElementById('cnt');
const cards=[...grid.children];let fL='all',fE='all';
function apply(){let n=0;cards.forEach(c=>{const ok=(fL==='all'||c.dataset.layer===fL)&&(fE==='all'||c.dataset.era===fE);c.style.display=ok?'':'none';if(ok)n++});cnt.textContent=n+' / '+cards.length+' 張'}
document.getElementById('bar').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
if(b.classList.contains('f')){document.querySelectorAll('.f').forEach(x=>x.classList.remove('on'));b.classList.add('on');fL=b.dataset.v}
else if(b.classList.contains('e')){document.querySelectorAll('.e').forEach(x=>x.classList.remove('on'));b.classList.add('on');fE=b.dataset.e}
apply()});apply();
</script>
</body></html>
`;

writeFileSync(out, html);
console.log(`card deck: ${cards.length} card(s), ${withArt} with a 立繪 -> ${out}`);
