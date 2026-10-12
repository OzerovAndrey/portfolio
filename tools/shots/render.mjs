#!/usr/bin/env node
// Рендер скрінів для /approach з маніфесту site/src/content/shots.json → site/src/assets/shots/**.webp
//   node tools/shots/render.mjs [id …]            — усі або вибрані id
//   DEMO_DIST=… — збірка демо (за замовчуванням ../multibrand-design-system/site/dist, зібрана з SITE_BASE=/multibrand-design-system/)
// Кадри демо (лобі, компоненти) — справжній рендер демо. Кадри інструментів (Token Studio, Figma, DevTools, редактор, термінал)
// — відтворення інтерфейсу на справжніх даних репо: сети, теми, значення токенів, вивід перевірок, git diff.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { launch, save, ROOT } from "./lib.mjs";
import { scenes } from "./scenes.mjs";

const shots = JSON.parse(readFileSync(resolve(ROOT, "site/src/content/shots.json"), "utf8"));
const demoDist = resolve(process.env.DEMO_DIST ?? resolve(ROOT, "../multibrand-design-system/site/dist"));
const only = process.argv.slice(2);
const s = await launch({ demoDist });
const ctx = { ...s, demoDist };
let n = 0;
for (const shot of shots) {
  if (only.length && !only.includes(shot.id)) continue;
  const scene = scenes[shot.id];
  if (!scene) { console.warn(`· ${shot.id}: сцени немає — лишається плейсхолдер`); continue; }
  const [w, h] = shot.size.split("x").map(Number);
  const scale = shot.scale ?? 2; // щільність кадру: size = CSS-розмір × scale
  const buf = await scene({ ...ctx, width: w / scale, height: h / scale, scale });
  const bytes = await save(buf, shot.file);
  console.log(`✓ ${shot.id} → ${shot.file} (${Math.round(bytes / 1024)} KB)`);
  n++;
}
await s.close();
console.log(`${n} скрін(ів)`);
