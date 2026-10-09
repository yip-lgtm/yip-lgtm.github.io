// Build cute/record.html from this repository's own git history.
//
// Parsing commit messages is not reliable here: the automated jobs use fixed
// strings ("Hourly campaign from MiniMax.") but hand-written ones range from
// "Add 1936 Spanish Civil War hourly feed entry" to "Add Korean War entry to
// hourly battle feed". So this diffs the data files instead and lets the data
// say what changed, whatever the message happened to be.
//
//   cute/portraits/*.jpg   a new file   -> 立繪
//   cute/feed.json          a new item  -> 簡述; new item carrying a dossier -> 全文
//   cute/daily.json         changed      -> 每日頁
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.env.REPO_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), "..");
const git = (...a) => execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8", maxBuffer: 256e6 });

const raw = git("log", "--reverse", "--date=iso-local", "--pretty=format:%H%x09%ad", "--name-status");
const commits = [];
let cur = null;
for (const line of raw.split("\n")) {
  if (!line.trim()) continue;
  if (/^[0-9a-f]{40}\t/.test(line)) {
    cur = { sha: line.split("\t")[0], date: line.split("\t")[1].slice(0, 10), files: [] };
    commits.push(cur);
  } else if (cur && /^[ACDMRT]\t/.test(line)) cur.files.push(line);
}
console.log(`commits walked: ${commits.length}`);

const readAt = (rev, p) => { try { return JSON.parse(git("show", `${rev}:${p}`)); } catch { return null; } };

const days = new Map();
const day = (d) => {
  if (!days.has(d)) days.set(d, { date: d, briefs: [], dossiers: [], portraits: [], daily: [] });
  return days.get(d);
};
const SECT = ["countries", "people", "kits", "tactics", "data", "cause", "impact", "result"];

// Count each thing once across the whole walk, not once per commit.
// Diffing against the previous commit double-counts badly here: feed.json and
// the portrait folder have both been wiped and restored by earlier publishes
// ("Restore feed.json", "Restore the three portraits removed by the gallery
// publish"), and every restore makes the whole set look brand new again.
// A campaign is first seen as a brief, and may later gain a dossier. Those are
// two separate events on two separate days, so they need two separate sets --
// one set would classify every entry by whatever it looked like first.
const seenIds = new Set();
const seenDossiers = new Set();
const seenPortrait = new Set();
const seenDaily = new Set();

for (const c of commits) {
  for (const f of c.files.filter((x) => x.startsWith("A\t")).map((x) => x.split("\t")[1])) {
    if (f.startsWith("cute/portraits/") && f.endsWith(".jpg")) {
      const id = f.slice(15, -4);
      if (!seenPortrait.has(id)) { seenPortrait.add(id); day(c.date).portraits.push(id); }
    }
  }
  if (c.files.some((f) => f.endsWith("\tcute/feed.json"))) {
    const now = readAt(c.sha, "cute/feed.json");
    if (now) {
      for (const it of now.items ?? []) {
        if (seenIds.has(it.id) && !(it.dossier?.countries && !seenDossiers.has(it.id))) continue;
        const e = { name: it.battle?.name ?? "?", year: it.battle?.y ?? "?", kit: it.kit?.name ?? "" };
        if (it.dossier?.countries) {
          if (seenDossiers.has(it.id)) continue;
          seenDossiers.add(it.id);
          e.chars = SECT.reduce((a, k) => a + (it.dossier[k] || "").length, 0);
          day(c.date).dossiers.push(e);
        } else {
          if (seenIds.has(it.id)) continue;
          day(c.date).briefs.push(e);
        }
        seenIds.add(it.id);
      }
    }
  }
  if (c.files.some((f) => f.endsWith("\tcute/daily.json"))) {
    const now = readAt(c.sha, "cute/daily.json");
    if (now?.date && !seenDaily.has(now.date)) { seenDaily.add(now.date); day(now.date).daily.push({ k: now.k ?? "", t: now.t ?? "" }); }
  }
}

// The record is historical: it shows what was added on each day. That is the
// point of a changelog, but a dossier can be rewritten afterwards, so compare
// against the current feed and mark anything that no longer matches. Without
// this the page read as "the Russian Civil War is 819 characters" when it is
// 1888.
const live = readAt("HEAD", "cute/feed.json");
const liveById = new Map((live?.items ?? []).map((i) => [i.id, i]));
const liveDossiers = new Map();
for (const i of live?.items ?? []) {
  if (i.dossier?.countries) {
    liveDossiers.set(i.battle?.name, SECT.reduce((a, k) => a + (i.dossier[k] || "").length, 0));
  }
}
for (const d of days.values()) for (const x of d.dossiers) {
  const now = liveDossiers.get(x.name);
  x.state = now == null ? "removed" : now === x.chars ? "" : "rewritten";
}

const list = [...days.values()].filter((d) => d.briefs.length || d.dossiers.length || d.portraits.length || d.daily.length)
  .sort((a, b) => b.date.localeCompare(a.date));
const T = list.reduce((a, d) => ({ b: a.b + d.briefs.length, d: a.d + d.dossiers.length, p: a.p + d.portraits.length }), { b: 0, d: 0, p: 0 });

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const dayLabel = (d) => `${+d.split("-")[1]}月${+d.split("-")[2]}日`;
const dayHead = (d) => `${d} 週${["日","一","二","三","四","五","六"][new Date(d + "T00:00:00Z").getUTCDay()]}`;

const body = list.map((d) => {
  const rows = [];
  for (const x of d.dossiers) rows.push(`<li class="d"><span class="y">${esc(x.year)}</span>${esc(x.name)}<span class="k"> · ${esc(x.kit)}</span><span class="n">全文 ${x.chars} 字${x.state === "rewritten" ? " · 已重寫" : x.state === "removed" ? " · 已移除" : ""}</span></li>`);
  for (const x of d.briefs) rows.push(`<li class="b"><span class="y">${esc(x.year)}</span>${esc(x.name)}<span class="k"> · ${esc(x.kit)}</span></li>`);
  for (const p of d.portraits) rows.push(`<li class="p">立繪 · ${esc(p)}</li>`);
  for (const x of d.daily) rows.push(`<li>每日頁 · <span class="k">${esc(x.k)}</span> ${esc(x.t)}</li>`);
  const pills = [d.briefs.length && `<span class="pill b">簡述 ${d.briefs.length}</span>`,
    d.dossiers.length && `<span class="pill d">全文 ${d.dossiers.length}</span>`,
    d.portraits.length && `<span class="pill p">立繪 ${d.portraits.length}</span>`].filter(Boolean).join("");
  return `<section class="day"><div class="dh"><h2>${dayLabel(d.date)}</h2><span class="wd">${dayHead(d.date)}</span><span class="cnt">${pills}</span></div><ul>${rows.join("")}</ul></section>`;
}).join("\n");

const html = `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>銅與碲 · 更新記錄</title>
<style>
*{box-sizing:border-box}
:root{--bg:#0c0a0b;--card:#171315;--line:#3a2f31;--fg:#efe6e0;--mut:#a9988f;--sub:#7d6d66;--acc:#e8a080;--b:#8fb8d8;--d:#c9a0d8;--p:#e8c48a}
body{margin:0;background:var(--bg);color:var(--fg);font-family:"Noto Sans CJK TC","Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;padding:24px}
.wrap{max-width:820px;margin:0 auto}
a{color:var(--acc)}
h1{font-size:26px;margin:0 0 6px}
.lede{color:var(--mut);font-size:13px;margin:0 0 20px;line-height:1.7}
code{background:#241d1f;border:1px solid var(--line);border-radius:5px;padding:1px 5px;font-size:12px}
.tot{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:26px;align-items:stretch}
.tot a,.tot span{border:1px solid var(--line);border-radius:10px;padding:8px 13px;font-size:13px;background:var(--card);text-decoration:none}
.tot b{color:var(--acc);font-size:17px;margin-right:5px}
.tot .b b{color:var(--b)}.tot .d b{color:var(--d)}.tot .p b{color:var(--p)}
.day{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin-bottom:12px}
.dh{display:flex;align-items:baseline;gap:10px;margin-bottom:8px;flex-wrap:wrap}
.dh h2{margin:0;font-size:16px;font-weight:600}
.dh .wd{color:var(--sub);font-size:12px}
.cnt{margin-left:auto;display:flex;gap:6px}
.pill{font-size:10px;border:1px solid var(--line);border-radius:20px;padding:1px 8px;color:var(--mut)}
.pill.b{color:var(--b);border-color:#2c3f4c}
.pill.d{color:var(--d);border-color:#3d2f45}
.pill.p{color:var(--p);border-color:#453a26}
ul{margin:0;padding:0;list-style:none}
li{padding:5px 0 5px 14px;border-left:2px solid var(--line);margin:3px 0;font-size:13px;line-height:1.6;position:relative}
li::before{content:"";position:absolute;left:-4px;top:12px;width:6px;height:6px;border-radius:50%;background:var(--acc)}
li.b::before{background:var(--b)}li.d::before{background:var(--d)}li.p::before{background:var(--p)}
.y{color:var(--sub);font-variant-numeric:tabular-nums;margin-right:6px}
.k{color:var(--sub)}
.n{color:var(--sub);font-size:11px;margin-left:6px}
footer{max-width:820px;margin:26px auto 0;color:var(--sub);font-size:12px;line-height:1.8}
</style></head><body><div class="wrap">
<h1>更新記錄</h1>
<p class="lede">由頁面倉的 git 歷史反推：每次提交比對 <code>cute/feed.json</code>、<code>cute/daily.json</code> 同 <code>cute/portraits/</code> 有咩新增。不靠 commit 訊息解析，所以手動同自動的提交都會計入。</p>
<div class="tot">
  <span class="b"><b>${T.b}</b>簡述</span>
  <span class="d"><b>${T.d}</b>中英全文</span>
  <span class="p"><b>${T.p}</b>立繪</span>
  <a href="cards.html">→ 卡牌全覽</a>
</div>
${body}
<footer>共 ${list.length} 日有更新。立繪由 steel-and-will 每半小時生成、即時發佈；簡述與中英全文由頁面倉每小时補上。<br>立繪 1152×1728，中英全文門檻 1200 字。</footer>
</div></body></html>`;

const out = resolve(ROOT, "cute/record.html");
writeFileSync(out, html, "utf8");
console.log(`${list.length} days · 簡述 ${T.b} · 全文 ${T.d} · 立繪 ${T.p} -> ${out}`);
