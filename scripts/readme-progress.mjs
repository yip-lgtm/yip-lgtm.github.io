import { readFileSync, writeFileSync } from "node:fs";

const index = JSON.parse(readFileSync(process.argv[2] || "public/war-index.json", "utf8"));
const feed = JSON.parse(readFileSync(process.argv[3] || "public/feed.json", "utf8"));
const done = new Set((feed.items ?? []).map((it) => it.battle?.name).filter(Boolean));
const doss = new Set((feed.items ?? []).filter((it) => it.dossier?.countries).map((it) => it.battle?.name));
const labels = { wwi: "一戰", inter: "戰間", ww2a: "二戰前期", ww2b: "二戰後期", cold: "冷戰", now: "1991 以後" };
const rows = Object.keys(labels).map((id) => {
  const wars = index.wars.filter((w) => w.span === id);
  const fed = wars.filter((w) => done.has(w.name)).length;
  const full = wars.filter((w) => doss.has(w.name)).length;
  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
  return `| ${labels[id]} | ${wars.length} | ${fed} | ${pct(fed, wars.length)}% | ${full} | ${pct(full, wars.length)}% |`;
});
const n = index.wars.length;
const fed = index.wars.filter((w) => done.has(w.name)).length;
const full = index.wars.filter((w) => doss.has(w.name)).length;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const table = [
  "## 進度",
  "",
  `索引 ${n} 場。feed 已寫 ${fed} 場。中英全文 ${full} 場。`,
  "",
  "| 範圍 | 索引 | 已寫簡述 | 簡述 | 中英全文 | 全文 |",
  "| --- | ---: | ---: | ---: | ---: | ---: |",
  ...rows,
  `| 合計 | ${n} | ${fed} | ${pct(fed, n)}% | ${full} | ${pct(full, n)}% |`,
  "",
].join("\n");
const readme = process.argv[4] || "README.md";
const text = readFileSync(readme, "utf8");
const next = text.includes("## 進度") ? text.replace(/## 進度[\s\S]*$/, table) : `${text.trim()}\n\n${table}`;
writeFileSync(readme, next);
console.log(table);
