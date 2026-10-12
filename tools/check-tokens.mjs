#!/usr/bin/env node
// Portfolio tokens check: brand/site ↔ demo brand keys (tools/upstream.json), every {ref} resolves
// for site × light|dark, components read only theme/brand semantics, reserved names, WCAG contrast.
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OWN = resolve(ROOT, "tokens");
const read = (p) => JSON.parse(readFileSync(p, "utf8"));

function flatten(obj, prefix = "", out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("$")) continue;
    const name = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && "value" in v) out.set(name, { value: v.value, type: v.type, mod: v.$extensions?.["studio.tokens"]?.modify });
    else if (v && typeof v === "object") flatten(v, name, out);
  }
  return out;
}

const core = flatten(read(resolve(OWN, "core.json")));
const map = flatten(read(resolve(OWN, "map.json")));
const theme = { light: flatten(read(resolve(OWN, "theme/light.json"))), dark: flatten(read(resolve(OWN, "theme/dark.json"))) };
const upstreamKeys = read(resolve(ROOT, "tools/upstream.json")).brandKeys;
const site = flatten(read(resolve(OWN, "brand/site.json")));
const comps = flatten(read(resolve(OWN, "components.json")));
// власні сети портфоліо (tokens/site): core-примітиви, альфа-рампи (map), семантика light/dark
const readSite = (p) => (existsSync(resolve(OWN, "site", p)) ? flatten(read(resolve(OWN, "site", p))) : new Map());
const siteCore = readSite("core.json"), siteMap = readSite("map.json");
const siteTheme = { light: readSite("theme/light.json"), dark: readSite("theme/dark.json") };

const errors = [];
const isRef = (v) => typeof v === "string" && /^\{[^}]+\}$/.test(v);
const refName = (v) => v.slice(1, -1);

// 1. key parity
const a = [...upstreamKeys].sort().join("\n"), b = [...site.keys()].sort().join("\n");
if (a !== b) errors.push("brand/site keys differ from demo brands (tools/upstream.json)");

// 1a. site theme: light і dark мають однакові ключі
const sl = [...siteTheme.light.keys()].sort().join(), sd = [...siteTheme.dark.keys()].sort().join();
if (sl !== sd) errors.push("tokens/site/theme: light and dark keys differ");

// 1b. reserved Token Studio group names
for (const n of [...comps.keys(), ...siteCore.keys(), ...siteMap.keys(), ...siteTheme.light.keys()]) { const segs = n.split(".").slice(0, -1); for (const r of ["value", "type", "description"]) if (segs.includes(r)) errors.push(`${n}: group name "${r}" is reserved — use amount / percent / detail`); }

// 2. layer rule: components → theme | brand only
for (const [n, t] of comps) {
  if (!isRef(t.value)) { errors.push(`${n}: raw value "${t.value}" (components must alias)`); continue; }
  const r = refName(t.value);
  if (core.has(r) || map.has(r) || siteCore.has(r) || siteMap.has(r)) errors.push(`${n} → ${r}: components must not read core/map`);
}

// colour math identical to tools/build-css.mjs (Token Studio modify, hsl)
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, bl = (n & 255) / 255;
  const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - bl) / d + (g < bl ? 6 : 0) : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return [h, s, l];
}
function hslToHex(h, s, l) {
  const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  let r, g, b; if (s === 0) r = g = b = l; else { const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; r = f(p, q, h + 1 / 3); g = f(p, q, h); b = f(p, q, h - 1 / 3); }
  const to = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return ("#" + to(r) + to(g) + to(b)).toUpperCase();
}
const modify = (hex, m) => { const [h, s, l] = hexToHsl(hex), v = parseFloat(m.value);
  if (m.type === "alpha") return hex.toUpperCase() + Math.round(v * 255).toString(16).padStart(2, "0").toUpperCase();
  return m.type === "lighten" ? hslToHex(h, s, l + (1 - l) * v) : hslToHex(h, s, l * (1 - v)); };

function resolveFinal(name, mode, depth = 0) {
  if (depth > 12) throw new Error("cycle at " + name);
  const tok = comps.get(name) ?? theme[mode].get(name) ?? siteTheme[mode].get(name) ?? site.get(name) ?? map.get(name) ?? siteMap.get(name) ?? core.get(name) ?? siteCore.get(name);
  if (!tok) throw new Error("unresolved " + name);
  if ((map.has(name) || siteMap.has(name)) && !comps.has(name) && !theme[mode].has(name) && !siteTheme[mode].has(name) && !site.has(name)) {
    const base = resolveFinal(refName(tok.value), mode, depth + 1);
    return tok.mod ? modify(base, tok.mod) : base;
  }
  // boxShadow-композит: кожен колір шару має резолвитись
  if (tok.type === "boxShadow" && typeof tok.value === "object")
    return (Array.isArray(tok.value) ? tok.value : [tok.value]).map((l) => ({ ...l, color: isRef(l.color) ? resolveFinal(refName(l.color), mode, depth + 1) : l.color }));
  return isRef(tok.value) ? resolveFinal(refName(tok.value), mode, depth + 1) : tok.value;
}

// 3. every ref resolves in both modes
const resolved = { light: {}, dark: {} };
for (const mode of ["light", "dark"]) {
  for (const set of [site, theme[mode], siteTheme[mode], comps]) for (const n of set.keys()) {
    try { resolved[mode][n] = resolveFinal(n, mode); } catch (e) { errors.push(`[${mode}] ${n}: ${e.message}`); }
  }
}

if (errors.length) { console.error("✗ " + errors.join("\n✗ ")); process.exit(1); }
// 4. contrast (WCAG 2.x) on the pairs the site actually renders
const lum = (hex) => { const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; })
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0); };
const ratio = (x, y) => { const [l1, l2] = [lum(x), lum(y)].sort((p, q) => q - p); return (l1 + 0.05) / (l2 + 0.05); };
// Напівпрозорий фон (#RRGGBBAA) — компонуємо поверх найгіршого, що може опинитись під ним (контент під шапкою, підсвітка сцени):
// чорний і білий. Беремо мінімальний контраст із двох.
const WORST = ["#000000", "#FFFFFF"];
const over = (top, under) => { const a = parseInt(top.slice(7, 9), 16) / 255, t = parseInt(top.slice(1, 7), 16), u = parseInt(under.slice(1, 7), 16);
  const ch = (sh) => Math.round(((t >> sh) & 255) * a + ((u >> sh) & 255) * (1 - a)).toString(16).padStart(2, "0");
  return ("#" + ch(16) + ch(8) + ch(0)).toUpperCase(); };
const contrast = (fg, bg) => (/^#[0-9a-f]{8}$/i.test(bg) ? Math.min(...WORST.map((w) => ratio(fg, over(bg, w)))) : ratio(fg, bg));
const PAIRS = [
  ["hero.title.color", "hero.bg", 4.5], ["hero.subtitle.color", "hero.bg", 4.5], ["hero.eyebrow.color", "hero.bg", 4.5], ["focus.outline.color", "section.bg.default", 3], ["focus.outline.color", "section.bg.alt", 3],
  ["button.primary.color.default", "button.primary.bg.default", 4.5], ["button.primary.color.default", "button.primary.bg.hover", 4.5], ["button.primary.color.default", "button.primary.bg.active", 4.5], ["button.secondary.color.default", "button.secondary.bg.default", 4.5],
  ["link.color.default", "section.bg.default", 4.5], ["link.color.default", "section.bg.alt", 4.5],
  ["metric.amount.color", "metric.bg", 4.5], ["metric.label.color", "metric.bg", 4.5], ["metric.typical.color", "metric.typical.bg", 4.5],
  ["caseCard.detail.color", "caseCard.bg.default", 4.5], ["caseCard.tag.color", "caseCard.tag.bg", 4.5],
  ["siteNav.item.color.default", "siteHeader.bg", 4.5],
  ["contactForm.hint.color", "section.bg.default", 4.5], ["ctaBand.lead.color", "ctaBand.bg", 4.5], ["audience.detail.color", "audience.bg", 4.5], ["langSwitch.item.color.default", "langSwitch.bg", 4.5], ["step.index.color", "step.index.bg", 4.5],
  ["layerStack.name.color", "layerStack.item.bg", 4.5], ["layerStack.detail.color", "layerStack.item.bg", 4.5], ["layerStack.name.color", "layerStack.highlight.bg", 4.5], ["layerStack.detail.color", "layerStack.highlight.bg", 4.5], ["layerStack.tag.color", "layerStack.tag.bg", 4.5],
  ["tokenChain.label.color", "tokenChain.bg", 4.5], ["tokenChain.name.color", "tokenChain.step.bg", 4.5], ["tokenChain.layer.color", "tokenChain.step.bg", 4.5], ["tokenChain.note.color", "tokenChain.step.bg", 4.5], ["tokenChain.result.color", "tokenChain.result.bg", 4.5],
  ["segmented.item.color.default", "segmented.bg", 4.5], ["segmented.item.color.active", "segmented.item.bg.active", 4.5],
  // glass: напівпрозорий фон → контраст поверх найгіршого (чорний / білий), і solid-fallback
  ["glass.color.default", "glass.bg", 4.5], ["siteNav.item.color.active", "glass.bg", 4.5], ["siteHeader.logo.color", "glass.bg", 4.5],
  ["button.secondary.color.default", "glass.bg", 4.5], ["button.text.color.default", "glass.bg", 4.5],
  ["glass.color.default", "glass.solid.bg", 4.5], ["siteHeader.logo.color", "glass.solid.bg", 4.5], ["button.secondary.color.default", "glass.solid.bg", 4.5],
  // основна дія сайту (CTA, активні сегменти): текст на кожному стані; кнопка на фоні сторінки ≥ 3 (межа контролу)
  ["action.color.default", "action.bg.default", 4.5], ["action.color.hover", "action.bg.hover", 4.5], ["action.color.active", "action.bg.active", 4.5],
  ["action.bg.default", "section.bg.default", 3], ["action.bg.default", "section.bg.alt", 3],
  ["metric.label.color", "section.bg.default", 4.5],
  // showcase: плейсхолдер скріна, схеми, плашка Preview
  ["shot.label.color", "shot.label.bg", 4.5], ["shot.what.color", "shot.bg", 4.5], ["shot.label.color", "shot.bg", 4.5],
  ["flow.node.title.color", "flow.node.bg", 4.5], ["flow.node.detail.color", "flow.node.bg", 4.5], ["flow.arrow.color", "section.bg.default", 4.5], ["flow.arrow.color", "section.bg.alt", 4.5],
  ["banner.color", "banner.bg", 4.5],
  // portfolio visual foundation (tokens/site): текст на полотнах і поверхнях, інверсія, focus-ring, solid-fallback скла.
  // Напівпрозоре скло (whisper / default / strong) міряється нижче, окремим блоком — на композиті «скло поверх фону».
  ...["color.canvas.primary", "color.canvas.secondary", "color.surface.base", "color.surface.raised"].flatMap((bg) =>
    ["color.content.primary", "color.content.secondary", "color.content.tertiary"].map((fg) => [fg, bg, 4.5])),
  ["color.content.inverse", "color.canvas.inverse", 4.5],
  ["color.line.focus", "color.canvas.primary", 3], ["color.line.focus", "color.canvas.secondary", 3], ["color.line.focus", "color.surface.base", 3], ["color.line.focus", "color.surface.raised", 3],
  ["color.content.primary", "color.glass.whisper.solid", 4.5], ["color.content.tertiary", "color.glass.whisper.solid", 4.5],
  ["color.content.primary", "color.glass.strong.solid", 4.5], ["color.content.tertiary", "color.glass.strong.solid", 4.5],
  // шапка: текст поверх α88-полотна на найгіршому фоні (чорний / білий — демо, скріни під шапкою) і на solid-fallback
  ...["siteHeader.bg", "siteHeader.bgSolid"].flatMap((bg) => ["siteNav.item.color.default", "siteNav.item.color.active", "siteHeader.logo.color", "siteHeader.owner.color", "langSwitch.item.color.default"].map((fg) => [fg, bg, 4.5])),
  ["siteFooter.color", "section.bg.default", 4.5], ["siteFooter.color", "section.bg.alt", 4.5], ["siteFooter.link.color.default", "section.bg.default", 4.5], ["siteFooter.name.color", "section.bg.default", 4.5], ["siteFooter.logo.color", "section.bg.default", 3], ["siteFooter.logo.color", "section.bg.alt", 3],
  ["positioning.label.color", "section.bg.default", 4.5], ["positioning.title.color", "section.bg.default", 4.5], ["positioning.item.title.color", "section.bg.default", 4.5], ["positioning.item.detail.color", "section.bg.default", 4.5],
  ["exhibit.label.color", "section.bg.default", 4.5], ["exhibit.title.color", "section.bg.default", 4.5], ["exhibit.text.color", "section.bg.default", 4.5],
  ["action.focus.color", "section.bg.default", 3], ["action.focus.color", "section.bg.alt", 3],
  ["action.secondary.color.default", "section.bg.default", 4.5], ["action.secondary.color.default", "section.bg.alt", 4.5],
  ["color.content.primary", "color.glass.default.solid", 4.5], ["color.content.tertiary", "color.glass.default.solid", 4.5],
];
const pick = (n, mode) => { if (!resolved[mode][n]) throw new Error("unknown token " + n); return resolved[mode][n]; };
const report = [];
for (const mode of ["light", "dark"]) for (const [fg, bg, min] of PAIRS) {
  const f = pick(fg, mode), k = pick(bg, mode), r = contrast(f, k);
  if (r < min) errors.push(`[${mode}] contrast ${fg} on ${bg} = ${r.toFixed(2)} < ${min}`);
  report.push({ mode, fg, bg, f, k, ratio: +r.toFixed(2), min });
}

// Прозоре скло (portfolio): текст на композиті «скло поверх фону». Модель, не рендер: під склом — полотна сайту (canvas.primary / secondary,
// surface.raised) і «пік» ambient — верхня межа, яку матимуть майбутні градієнти (біла α16 у dark, темна α8 у light, поверх canvas.primary).
// Скло над демо чи зображенням цією моделлю НЕ покрите. Правило тексту на склі (перевірене моделлю: у dark на піку ambient secondary на default — 4.31, на strong — 3.25,
// tertiary на whisper — 3.55): на whisper — primary і secondary, на default і strong — тільки primary, tertiary — лише на суцільних поверхнях.
const GLASS = [["whisper", ["primary", "secondary"]], ["default", ["primary"]], ["strong", ["primary"]]];
for (const mode of ["light", "dark"]) {
  const peak = resolveFinal(mode === "dark" ? "color.neutral.light.alpha16" : "color.neutral.dark.alpha08", mode);
  const canvases = ["color.canvas.primary", "color.canvas.secondary", "color.surface.raised"].map((n) => pick(n, mode));
  const backdrops = [...canvases, over(peak, canvases[0])];
  for (const [level, roles] of GLASS) {
    const glass = pick(`color.glass.${level}.bg`, mode);
    for (const role of roles) {
      const f = pick(`color.content.${role}`, mode), r = Math.min(...backdrops.map((b) => ratio(f, over(glass, b))));
      if (r < 4.5) errors.push(`[${mode}] glass.${level} · content.${role} на найгіршому фоні = ${r.toFixed(2)} < 4.5`);
      report.push({ mode, fg: `color.content.${role}`, bg: `glass.${level} над полотнами`, f, k: glass, ratio: +r.toFixed(2), min: 4.5 });
    }
  }
}

// Кнопка secondary / text: напівпрозорий тон hover і active поверх полотен — текст лишається ≥ 4.5 : 1
for (const mode of ["light", "dark"]) {
  const canvases = ["color.canvas.primary", "color.canvas.secondary"].map((n) => pick(n, mode)), f = pick("color.content.primary", mode);
  for (const st of ["hover", "active"]) {
    const tint = pick(`color.action.secondary.bg.${st}`, mode), r = Math.min(...canvases.map((c) => ratio(f, over(tint, c))));
    if (r < 4.5) errors.push(`[${mode}] action.secondary.bg.${st} · content.primary = ${r.toFixed(2)} < 4.5`);
    report.push({ mode, fg: "color.content.primary", bg: `action.secondary.bg.${st} над полотнами`, f, k: tint, ratio: +r.toFixed(2), min: 4.5 });
  }
}

if (process.argv.includes("--report")) console.log(JSON.stringify({ resolved, report }, null, 2));
console.log(`brand/site: ${site.size} keys · site-components: ${comps.size} tokens · contrast pairs: ${report.length}`);
if (errors.length) { console.error("✗ " + errors.join("\n✗ ")); process.exit(1); }
console.log("✓ parity · ✓ layers · ✓ refs (light, dark) · ✓ contrast");
