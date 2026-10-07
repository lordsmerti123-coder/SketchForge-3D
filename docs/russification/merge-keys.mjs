// Merge docs/russification/keys/*.json -> en.json / ru.json
// keys file format: { "<namespace>": { "<key>": { "en": "...", "ru": "..." } } }
// catalog format:   { "<namespace>": { "<key>": "..." } }
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Корень проекта вычисляется от расположения скрипта:
// docs/russification/merge-keys.mjs -> три уровня вверх.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const keysDir = path.join(root, "docs", "russification", "keys");
const enPath = path.join(root, "apps", "web", "src", "i18n", "messages", "en.json");
const ruPath = path.join(root, "apps", "web", "src", "i18n", "messages", "ru.json");

const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const ru = JSON.parse(fs.readFileSync(ruPath, "utf8"));

let added = 0, overwritten = 0, conflicts = 0, empty = 0;
const conflictList = [];

function ensure(obj, ns) {
  if (!obj[ns] || typeof obj[ns] !== "object") obj[ns] = {};
  return obj[ns];
}

function mergeOne(ns, key, val) {
  if (key.includes(".")) { conflicts++; conflictList.push(`${ns}.${key} (dotted key skipped)`); return; }

  const vEn = val && typeof val.en === "string" ? val.en.trim() : "";
  const vRu = val && typeof val.ru === "string" ? val.ru.trim() : "";
  if (!vEn || !vRu) { empty++; conflictList.push(`${ns}.${key} (empty value, skipped)`); return; }

  const e = ensure(en, ns), r = ensure(ru, ns);
  const hadEn = key in e, hadRu = key in r;

  if (hadEn && e[key] !== vEn) { conflicts++; conflictList.push(`${ns}.${key} EN differs: existing="${e[key]}" new="${vEn}"`); }
  if (hadRu && r[key] !== vRu) { conflicts++; conflictList.push(`${ns}.${key} RU differs: existing="${r[key]}" new="${vRu}"`); }

  if (hadEn && hadRu) overwritten++;
  else added++;

  e[key] = vEn;
  r[key] = vRu;
}

for (const f of fs.readdirSync(keysDir)) {
  if (!f.endsWith(".json")) continue;
  const j = JSON.parse(fs.readFileSync(path.join(keysDir, f), "utf8"));
  for (const ns of Object.keys(j)) {
    for (const key of Object.keys(j[ns])) {
      mergeOne(ns, key, j[ns][key]);
    }
  }
}

function sortDeep(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const k of Object.keys(obj).sort()) out[k] = sortDeep(obj[k]);
  return out;
}

fs.writeFileSync(enPath, JSON.stringify(sortDeep(en), null, 2) + "\n", "utf8");
fs.writeFileSync(ruPath, JSON.stringify(sortDeep(ru), null, 2) + "\n", "utf8");

function countLeaves(obj) {
  let n = 0;
  for (const k of Object.keys(obj)) {
    if (obj[k] && typeof obj[k] === "object") n += countLeaves(obj[k]);
    else n++;
  }
  return n;
}

console.log("added:", added, "| overwritten:", overwritten, "| conflicts:", conflicts, "| empty(skipped):", empty);
console.log("en.json total keys:", countLeaves(en), "| ru.json total keys:", countLeaves(ru));
if (conflictList.length) { console.log("CONFLICTS:"); conflictList.forEach((c) => console.log("  " + c)); }
