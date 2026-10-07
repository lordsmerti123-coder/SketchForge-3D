// Быстрый поиск: где встречается UI-термин (рус./англ.) или i18n-ключ.
// Использование:
//   node docs/russification/find-ui-term.mjs "Коробка"     (по значению в ru/en.json)
//   node docs/russification/find-ui-term.mjs "shapes.box"  (по полному ключу)
//   node docs/russification/find-ui-term.mjs "box"         (сырой поиск по коду)
// Печатает: точный ключ каталога (где править значение), затем вхождения в коде.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const MESSAGES = path.join(ROOT, "apps/web/src/i18n/messages");
const SRC = path.join(ROOT, "apps/web/src");
const query = process.argv[2];
if (!query) { console.error("Укажи термин или ключ."); process.exit(1); }

const ru = JSON.parse(fs.readFileSync(path.join(MESSAGES, "ru.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(MESSAGES, "en.json"), "utf8"));

function flatten(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") out.push(...flatten(v, p));
    else out.push([p, String(v)]);
  }
  return out;
}
const ruFlat = flatten(ru), enFlat = flatten(en);

const isKey = query.includes(".") && ruFlat.some(([p]) => p === query);
const term = query.toLowerCase();

const byValue = (flat) => flat.filter(([, v]) => v.toLowerCase().includes(term));

console.log("=== Каталог переводов (где править отображаемое значение) ===");
let keyHits = [];
if (isKey) {
  const rv = ruFlat.find(([p]) => p === query)?.[1];
  const ev = enFlat.find(([p]) => p === query)?.[1];
  if (rv !== undefined) {
    keyHits.push(query);
    console.log(`КЛЮЧ: ${query}`);
    console.log(`  ru: ${rv}`);
    console.log(`  en: ${ev}`);
    console.log(`  правка: apps/web/src/i18n/messages/ru.json (и при необходимости en.json)`);
  } else {
    console.log(`Ключ ${query} не найден в каталогах.`);
  }
} else {
  const ruHits = byValue(ruFlat);
  const enHits = byValue(enFlat);
  const merged = new Map();
  for (const [p, v] of [...ruHits, ...enHits]) {
    if (!merged.has(p)) merged.set(p, { ru: ruFlat.find(([q]) => q === p)?.[1] ?? "", en: enFlat.find(([q]) => q === p)?.[1] ?? "" });
  }
  if (merged.size === 0) {
    console.log("В каталогах (ru.json/en.json) по значению не найдено.");
  }
  for (const [p, { ru: rv, en: ev }] of [...merged.entries()].slice(0, 60)) {
    keyHits.push(p);
    console.log(`КЛЮЧ: ${p}`);
    console.log(`  ru: ${rv}`);
    console.log(`  en: ${ev}`);
  }
  if (merged.size > 60) console.log(`…ещё ${merged.size - 60} ключей (уточни термин).`);
}

// Собрать "последний сегмент" ключей, чтобы искать вызовы t("...") в скоупе.
const lastSegments = new Set(keyHits.map((p) => p.split(".").pop()));

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules", ".next", ".next-dev"].includes(e.name)) continue;
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

console.log("\n=== Вхождения в коде (apps/web/src) ===");
let codeCount = 0;
const codeHits = [];
for (const file of walk(SRC)) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    const idx = line.toLowerCase().indexOf(term);
    if (idx < 0) return;
    const snippet = line.trim().slice(0, 160);
    const hitsKeyRef = [...lastSegments].some((seg) =>
      new RegExp(`["'\`]\\.?\\b${seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`]`).test(line));
    if (codeCount < 40 || hitsKeyRef) {
      codeHits.push(`${path.relative(ROOT, file).replace(/\\/g, "/")}:${i + 1}  ${snippet}`);
    }
    codeCount++;
  });
}
if (codeHits.length === 0) {
  console.log("Нет вхождений в .ts/.tsx.");
} else {
  codeHits.slice(0, 60).forEach((h) => console.log(h));
  if (codeCount > codeHits.length) console.log(`…всего совпадений строк: ${codeCount} (уточни термин, чтобы сузить).`);
}

console.log("\n=== Подсказка ===");
console.log("- Переименование отображаемого названия фигуры = правка ЗНАЧЕНИЯ ключа shapes.* в ru.json (ключи не менять).");
console.log("- instance name (имя экземпляра в дереве/инспекторе, напр. 'Solid cube') хранится в данных и задаётся в коде (shapeCatalog.ts / места создания) — см. HOW-IT-WORKS.md §5.");
console.log("- Вхождения по 'box'/'cube' и т.п. в коде часто это kind/идентификаторы — НЕ трогать.");
