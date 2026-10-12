// Кадри компонентів: специмени збираються ВСЕРЕДИНІ живого демо (його класи, CSS, токени, шрифти бренду),
// знімаються як зображення і вкладаються в полотно в стилі Figma (component set: фіолетова пунктирна рамка, підпис, режими).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BRANDS, demoPage } from "./demo.mjs";
import { ROOT, fontLink } from "./lib.mjs";

const NAMES = { aurum: "Aurum", nova: "Nova", fiesta: "Fiesta", ultra: "Ultra" };
const demoComponents = JSON.parse(readFileSync(resolve(ROOT, "tokens/demo/components.json"), "utf8"));
const get = (o, path) => path.split("/").reduce((a, k) => a?.[k], o);
// змінні інстансу Button primary lg: шлях у components.json демо → посилання на семантику
const BTN_VARS = ["button/primary/bg/default", "button/primary/color/default", "button/size/lg", "button/paddingH/lg", "button/gap/lg", "button/iconSize/lg", "button/borderRadius"]
  .map((n) => [n, String(get(demoComponents, n)?.value ?? "").replace(/[{}]/g, "")]);

/** Збирає специмен у сторінці демо й повертає PNG елемента. kind: buttons | cards | chips | column | instance */
async function specimen(newPage, { brand, theme, kind, scale = 2 }) {
  const p = await demoPage(newPage, { brand, theme, width: 1440, height: 900, scale });
  await p.evaluate((kind) => {
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => [...document.querySelectorAll(s)];
    const icon = (n) => $(`svg[data-icon="${n}"]`)?.outerHTML ?? "";
    const TS = { xs: "ts-label-sm", sm: "ts-label-md", md: "ts-label-md", lg: "ts-label-lg", xl: "ts-label-xl" };
    const btn = (v, s, label, { left, right, only, disabled } = {}) =>
      `<button class="btn btn--${v} btn--${s} ${TS[s]}${only ? " btn--icon" : ""}" type="button"${disabled ? " disabled" : ""}>${only ? icon(only) : `${left ? icon(left) : ""}${label}${right ? icon(right) : ""}`}</button>`;
    const lab = (t) => `<span class="spec__lab">${t}</span>`;
    const clone = (s, i = 0) => { const e = $$(s)[i]?.cloneNode(true); e?.querySelector(".game-tile__hover")?.remove(); return e?.outerHTML ?? ""; };
    let html = "";
    if (kind === "buttons") {
      const sizes = ["xs", "sm", "md", "lg", "xl"];
      html = `<div class="spec__grid" style="grid-template-columns:auto repeat(5,auto)">${lab("")}${sizes.map((s) => lab(s.toUpperCase())).join("")}`
        + ["primary", "secondary", "text"].map((v) => lab(v[0].toUpperCase() + v.slice(1)) + sizes.map((s) => `<div>${btn(v, s, "Button")}</div>`).join("")).join("")
        + `${lab("Icon")}<div>${btn("primary", "md", "Play", { left: "play-filled" })}</div><div>${btn("secondary", "md", "See all", { right: "chevron-right" })}</div><div>${btn("secondary", "md", "", { only: "heart" })}</div><div>${btn("secondary", "md", "", { only: "search" })}</div><div>${btn("text", "md", "Gift", { left: "gift" })}</div>`
        + `${lab("Disabled")}<div>${btn("primary", "md", "Button", { disabled: 1 })}</div><div>${btn("secondary", "md", "Button", { disabled: 1 })}</div><div>${btn("text", "md", "Button", { disabled: 1 })}</div><div></div><div></div></div>`;
    }
    if (kind === "cards") {
      html = `<div class="spec__row spec__row--top">${[0, 1, 3, 5].map((i) => `<div style="width:200px">${clone(".game-tile--slot", i)}</div>`).join("")}</div>`
        + `<div class="spec__row spec__row--top" style="margin-top:28px"><div style="width:400px">${clone(".tournament")}</div><div style="width:400px">${clone(".tournament", 1)}</div></div>`;
    }
    if (kind === "chips") {
      const pills = $$(".menu-pill").slice(0, 6).map((e, i) => { const c = e.cloneNode(true); c.classList.toggle("is-selected", i === 1); return c.outerHTML; }).join("");
      const tones = ["neutral", "primary", "accent", "success", "warning", "danger", "info"];
      const chip = (t, sel, size = "md", ic) => `<button type="button" class="chip chip--${size}${sel ? " is-selected" : ""} ${size === "sm" ? "ts-label-sm" : "ts-label-md"}">${ic ? icon(ic) : ""}${t}</button>`;
      html = `${lab("Menu pill · category")}<div class="spec__row">${pills}</div>`
        + `${lab("Chip · md / sm")}<div class="spec__row">${chip("All games", true)}${chip("Favourites", false, "md", "heart")}${chip("Jackpots", false, "md", "jackpot")}${chip("Live", false)}${chip("New", true, "sm")}${chip("Top", false, "sm")}${chip("Daily", false, "sm", "clock")}</div>`
        + `${lab("Badge · tones")}<div class="spec__row">${tones.map((t) => `<span class="badge badge--${t} ts-label-xs">${t}</span>`).join("")}</div>`;
    }
    if (kind === "column") {
      const pills = $$(".menu-pill").slice(0, 3).map((e) => e.outerHTML).join("");
      html = `<div style="width:300px;display:grid;gap:18px">${clone(".game-tile--slot", 1)}<div class="spec__row">${btn("primary", "md", "Play", { left: "play-filled" })}${btn("secondary", "md", "Demo")}${btn("secondary", "md", "", { only: "heart" })}</div><div class="spec__row">${pills}</div><div class="spec__row"><span class="badge badge--primary ts-label-xs">New</span><span class="badge badge--danger ts-label-xs">Hot</span><span class="badge badge--accent ts-label-xs">Jackpot</span></div></div>`;
    }
    if (kind === "instance") html = `<div style="padding:8px">${btn("primary", "lg", "Claim bonus", { left: "gift" })}</div>`;
    const el = document.createElement("div");
    el.id = "spec"; el.className = `spec spec--${kind}`; el.innerHTML = html;
    document.body.append(el);
    const st = document.createElement("style");
    st.textContent = `.app,.panel{display:none!important} body{margin:0} .spec{position:absolute;left:0;top:0;padding:36px;background:var(--color-bg-primary);color:var(--color-text-primary)}
      .spec--instance{padding:0;background:transparent}
      .spec__grid{display:grid;gap:18px 22px;align-items:center;justify-items:start}
      .spec__row{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:10px 0 22px}.spec__row--top{align-items:flex-start;gap:20px;margin:0}
      .spec__lab{font:500 12px/1 Inter,system-ui,sans-serif;letter-spacing:.02em;color:var(--color-text-secondary);opacity:.8}
      .spec .game-tile,.spec .tournament{width:100%}`;
    document.head.append(st);
  }, kind);
  await p.waitForTimeout(300);
  const el = await p.$("#spec");
  const buf = await el.screenshot({ omitBackground: kind === "instance" });
  const box = await el.boundingBox();
  // кінцеві значення CSS-змінних демо (var() уже підставлені браузером)
  const vars = await p.evaluate((names) => names.map((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()), BTN_VARS.map(([n]) => `--${n.replace(/\//g, "-")}`));
  await p.close();
  return { src: `data:image/png;base64,${buf.toString("base64")}`, w: Math.round(box.width), h: Math.round(box.height), vars };
}

/* ---------- Полотно в стилі Figma ---------- */
const CANVAS_CSS = `
  *{box-sizing:border-box;margin:0}
  body{width:100vw;height:100vh;overflow:hidden;background:#f5f5f5;font:400 12px/1.4 Inter,system-ui,sans-serif;color:#1e1e1e;-webkit-font-smoothing:antialiased}
  .bar{position:absolute;inset:0 0 auto 0;height:44px;background:#2c2c2c;color:#fff;display:flex;align-items:center;gap:14px;padding:0 16px;font-size:12px}
  .bar__logo{width:14px;height:20px;display:grid;grid-template-columns:1fr 1fr;gap:0}.bar__logo i{width:7px;height:7px;border-radius:50%}
  .bar__file{opacity:.95;font-weight:500}.bar__dim{opacity:.5}.bar__sp{flex:1}
  .bar__mode{display:flex;gap:6px}.bar__mode span{padding:4px 8px;border-radius:5px;background:#383838;color:#e6e6e6}
  .bar__mode b{font-weight:500;color:#fff}
  .stage{position:absolute;inset:44px 0 0 0;display:grid;place-items:center}
  .set{position:relative}
  .set__name{position:absolute;left:0;top:-22px;display:flex;align-items:center;gap:5px;color:#9747ff;font-weight:500;font-size:12px;white-space:nowrap}
  .set__frame{border:1.5px dashed #9747ff;border-radius:6px;padding:0;overflow:hidden;line-height:0}
  .set__frame img{display:block}
  .note{position:absolute;color:#6b6b6b;font-size:11px}
  .grid{display:flex;gap:28px;align-items:flex-start}
  .col__head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-size:12px;color:#1e1e1e;font-weight:600}
  .col__head code{font:500 11px/1 "JetBrains Mono",monospace;color:#6b6b6b;font-weight:500}
  .col__img{border-radius:10px;overflow:hidden;line-height:0;box-shadow:0 0 0 1px rgba(0,0,0,.08),0 12px 32px -12px rgba(0,0,0,.25)}
`;
const comp = `<svg width="12" height="12" viewBox="0 0 12 12" fill="#9747ff"><path d="M6 0l2.2 2.2L6 4.4 3.8 2.2zM2.2 3.8L4.4 6 2.2 8.2 0 6zm7.6 0L12 6 9.8 8.2 7.6 6zM6 7.6l2.2 2.2L6 12 3.8 9.8z"/></svg>`;
const figmaLogo = `<span class="bar__logo"><i style="background:#f24e1e"></i><i style="background:#ff7262"></i><i style="background:#a259ff"></i><i style="background:#1abcfe"></i><i style="background:#0acf83"></i></span>`;
const bar = (page, modes) => `<div class="bar">${figmaLogo}<span class="bar__file">Multibrand Design System</span><span class="bar__dim">/ ${page}</span><span class="bar__sp"></span><span class="bar__mode">${modes.map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join("")}</span></div>`;
const page = (body) => `<!doctype html><html><head><meta charset="utf-8">${fontLink("Inter:wght@400;500;600;700", "JetBrains Mono:wght@400;500")}<style>${CANVAS_CSS}</style></head><body>${body}</body></html>`;

/** Один component set по центру полотна; img масштабується, щоб вміститись */
const setScene = (kind, name, pageName, brand = "aurum", theme = "light") => async ({ newPage, scenePage, width, height }) => {
  const sp = await specimen(newPage, { brand, theme, kind });
  const k = Math.min(1.35, (width - 160) / sp.w, (height - 44 - 120) / sp.h);
  const html = page(`${bar(pageName, [["Brand", NAMES[brand]], ["Theme", theme[0].toUpperCase() + theme.slice(1)]])}
    <div class="stage"><div class="set"><div class="set__name">${comp}${name}</div>
    <div class="set__frame"><img src="${sp.src}" width="${Math.round(sp.w * k)}" height="${Math.round(sp.h * k)}"></div></div></div>`);
  const p = await scenePage(`comp-${kind}`, html, { width, height });
  const buf = await p.screenshot(); await p.close(); return buf;
};

/** Один компонент у 4 брендах поруч (світла тема): та сама розмітка, різні brand-сети.
 *  Специмени знімаються в 4x, щоб у кадрі (scale з маніфесту, 3x) їх тільки зменшувало — без мила й пікселів. */
const fourBrands = async ({ newPage, scenePage, width, height, scale }) => {
  const theme = "light";
  const cols = [];
  for (const b of BRANDS) cols.push({ b, ...(await specimen(newPage, { brand: b, theme, kind: "column", scale: 4 })) });
  const maxH = Math.max(...cols.map((c) => c.h));
  const colW = Math.floor((width - 96 - 3 * 28) / 4);
  const k = Math.min(colW / cols[0].w, (height - 44 - 110) / maxH);
  const html = page(`${bar("Components · same instance, 4 brands", [["Theme", "Light"]])}
    <div class="stage"><div class="grid">${cols.map((c) => `<div class="col"><div class="col__head">${NAMES[c.b]}<code>data-brand="${c.b}"</code></div>
    <div class="col__img"><img src="${c.src}" width="${Math.round(c.w * k)}" height="${Math.round(c.h * k)}" style="display:block"></div></div>`).join("")}</div></div>`);
  const p = await scenePage("comp-four", html, { width, height, scale });
  const buf = await p.screenshot(); await p.close(); return buf;
};

/** Панель властивостей інстансу Button (Figma, темний UI): властивості — з API компонента, змінні — з components.json демо */
const propsPanel = async ({ newPage, scenePage, width, height }) => {
  const inst = await specimen(newPage, { brand: "aurum", theme: "light", kind: "instance" });
  const vars = BTN_VARS.map(([n, ref], i) => [n, ref, inst.vars[i]]);
  const sel = (label, val) => `<div class="pr"><span class="pr__k">${label}</span><span class="pr__sel">${val}<svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 3l3 3 3-3" stroke="#bbb" fill="none"/></svg></span></div>`;
  const tog = (label, on) => `<div class="pr"><span class="pr__k">${label}</span><span class="tog${on ? " on" : ""}"><i></i></span></div>`;
  const txt = (label, val) => `<div class="pr"><span class="pr__k">${label}</span><span class="pr__txt">${val}</span></div>`;
  const css = `
    body{background:#1e1e1e;color:#e6e6e6;font:400 11px/1.4 Inter,system-ui,sans-serif}
    .wrap{position:absolute;inset:0;display:grid;grid-template-rows:380px 1fr}
    .cv{background:#f5f5f5;display:grid;place-items:center;position:relative}
    .sel{position:relative;outline:1.5px solid #0d99ff;line-height:0}
    .sel i{position:absolute;width:7px;height:7px;background:#fff;border:1.5px solid #0d99ff}
    .sel .a{left:-4px;top:-4px}.sel .b{right:-4px;top:-4px}.sel .c{left:-4px;bottom:-4px}.sel .d{right:-4px;bottom:-4px}
    .sel__tag{position:absolute;left:-1.5px;top:-22px;background:#9747ff;color:#fff;font-size:10.5px;font-weight:500;padding:2px 6px;border-radius:3px;white-space:nowrap;line-height:1.4}
    .sel__size{position:absolute;left:50%;bottom:-24px;transform:translateX(-50%);background:#0d99ff;color:#fff;font-size:10.5px;padding:2px 6px;border-radius:3px;line-height:1.4}
    .pn{background:#2c2c2c;border-top:1px solid #444;overflow:hidden}
    .tabs{display:flex;gap:16px;padding:12px 16px;border-bottom:1px solid #444;font-weight:600}.tabs span:not(:first-child){opacity:.45;font-weight:500}
    .sec{padding:14px 16px;border-bottom:1px solid #3d3d3d}
    .sec__h{display:flex;justify-content:space-between;align-items:center;font-weight:600;margin-bottom:10px;color:#fff}
    .sec__h small{font-weight:400;color:#9a9a9a}
    .inst{display:flex;align-items:center;gap:8px;color:#c7a6ff;font-weight:600;margin-bottom:12px}
    .pr{display:grid;grid-template-columns:110px 1fr;align-items:center;min-height:30px}
    .pr__k{color:#a8a8a8}.pr__sel,.pr__txt{display:flex;justify-content:space-between;align-items:center;background:#383838;border-radius:5px;padding:6px 8px;color:#f0f0f0}
    .tog{width:28px;height:16px;border-radius:8px;background:#555;position:relative}.tog i{position:absolute;left:2px;top:2px;width:12px;height:12px;border-radius:50%;background:#ddd}
    .tog.on{background:#0d99ff}.tog.on i{left:14px;background:#fff}
    .var{display:grid;grid-template-columns:16px 1fr auto;gap:8px;align-items:center;min-height:26px;font-family:"JetBrains Mono",monospace;font-size:10.5px}
    .var b{width:12px;height:12px;border-radius:3px;border:1px solid #555;background:repeating-linear-gradient(45deg,#3a3a3a 0 2px,#2c2c2c 2px 4px)}
    .var span:last-child{color:#8a8a8a}.var em{display:block;font-style:normal;color:#7d7d7d;font-size:9.5px;margin-top:1px}.var{min-height:34px}`;
  const html = `<!doctype html><html><head><meta charset="utf-8">${fontLink("Inter:wght@400;500;600;700", "JetBrains Mono:wght@400;500")}<style>*{box-sizing:border-box;margin:0}${css}</style></head><body><div class="wrap">
    <div class="cv"><div class="sel"><span class="sel__tag">❖ Button</span><img src="${inst.src}" width="${inst.w}" height="${inst.h}"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i><span class="sel__size">Hug × ${inst.h - 16}</span></div></div>
    <div class="pn"><div class="tabs"><span>Design</span><span>Prototype</span><span>Dev Mode</span></div>
      <div class="sec"><div class="inst">${comp} Button <span style="color:#9a9a9a;font-weight:400">instance</span></div>
        ${sel("Variant", "primary")}${sel("Size", "lg")}${tog("Icon left", 1)}${txt("Icon", "gift")}${tog("Icon right", 0)}${tog("Icon only", 0)}${tog("Full width", 0)}${tog("Disabled", 0)}${txt("Label", "Claim bonus")}</div>
      <div class="sec"><div class="sec__h">Applied variables <small>Components · button</small></div>
        ${vars.map(([n, ref, val]) => `<div class="var"><b style="${/^#|rgb/.test(val) ? `background:${val}` : ""}"></b><span>${n}<em>${ref}</em></span><span>${val}</span></div>`).join("")}</div>
    </div></div></body></html>`;
  const p = await scenePage("comp-props", html, { width, height });
  const buf = await p.screenshot(); await p.close(); return buf;
};

export const componentScenes = {
  "comp-button-set": setScene("buttons", "Button", "Components · Actions"),
  "comp-card-set": setScene("cards", "Card · game tile / tournament", "Components · Cards", "aurum", "dark"),
  "comp-chip-set": setScene("chips", "Chip · menu pill · badge", "Components · Selection", "nova", "light"),
  "comp-props-panel": propsPanel,
  "comp-four-brands": fourBrands,
};
