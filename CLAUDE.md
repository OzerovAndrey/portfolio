# Portfolio — правила для Claude Code

## Проєкт
Сайт-портфоліо Андрія Озерова: продає мультибрендові дизайн-системи. Головний експонат — живе демо
[multibrand-design-system](https://github.com/OzerovAndrey/multibrand-design-system), вбудоване в сайт.
Власник — Андрій Озеров. Мова комунікації й документації — українська.

Принцип той самий, що в демо: локальна папка `Portfolio` ↔ репо `OzerovAndrey/portfolio` (сайт: `ozerovandrey.github.io/portfolio/`), пуш у `main` сам деплоїть сайт.

## Структура репо
`tokens/` (джерело правди, Token Studio) · `tools/` (генератори й перевірки) · `site/` (Astro) · `tasks/` (задачі для демо-проєкту).
Нових тек не створювати без потреби.

## Токени
- Сайт — окремий бренд тієї ж системи: `data-brand="site"`, тема — `data-theme="light|dark"` на `<html>`.
- Порядок сетів: core → brand/site → map → theme/light|dark → typography → components (як у демо).
- **Дзеркало демо, не редагувати тут:** `core.json`, `map.json`, `theme/*.json`, `typography.json`.
  Оновлюються тільки `node tools/sync-demo-tokens.mjs` (з `../multibrand-design-system` або `--github`).
  Потрібна зміна в цих сетах → задача в `tasks/demo-NN-*.md`, правка в демо, потім sync.
- **`tokens/demo/`** — read-only копія брендів (aurum/nova/fiesta/ultra) і `components.json` демо. Оновлюється тільки `sync-demo-tokens`.
  З неї `npm run tokens:demo` генерує `src/generated/demo/` (meta + ланцюжки резолву) для секції «Під капотом». Цифри на сайті беруться звідти, не пишуться руками.
- **Свої файли портфоліо:** `brand/site.json` (ключі ідентичні брендам демо — змінюються тільки значення),
  `components.json` (`button`, `input` взяті з демо; решта — компоненти сторінок), `$themes.json`, `$metadata.json`.
- **`tokens/site/`** — власні сети портфоліо, яких немає в демо: `core.json` (time, curve, filter, fluid-типографіка), `map.json` (альфа-рампи),
  `theme/light|dark.json` (glass, action, boxShadow, duration, easing, display). `map.json` — тимчасовий до `tasks/demo-04`.
  Словник нових властивостей — `docs/token-properties.md`.
- `components` посилаються тільки на theme / brand-семантику (включно з `layout.*`). Ніколи на `core.*` / `map.*`.
- Назви груп `value` / `type` / `description` зарезервовані Token Studio → `amount` / `percent` / `detail`.
- Текст на `color.fill.primary.*` — тільки `color.text.onPrimary` (чорний). Посилання й фокус — `color.text.primary`,
  не `text.accent` (у light-темі це світлий product1, не проходить AA).
- Перед комітом токенів: `node tools/check-tokens.mjs` (паритет ключів, шари, зарезервовані імена, резолв у light/dark,
  WCAG-контраст). Червоне = не комітити. Нова пара «текст на фоні» → додати в `PAIRS` у чекері.

## Сайт (`site/`)
- Astro + React-острови (зараз один: `ThemeToggle.tsx`) + TypeScript. Маршрути `/en/*`, `/uk/*`; `/` завжди редіректить на `/en/`.
- Перший візит — EN і **системна тема** (`prefers-color-scheme`); поки користувач не клацнув перемикач, сайт наживо йде за системою.
  Ручний вибір теми живе тільки в межах візиту (`sessionStorage`). Мова браузера не враховується.
- `npm run tokens` генерує `src/styles/tokens.generated.css` і `src/generated/*` через `tools/build-css.mjs`. Не редагувати.
- Стилі — тільки `var(--…)` компонентних токенів, оболонка сторінки — theme/brand-семантика (`--color-*`, `--space-*`, `--layout-*`).
  Жодного hex / px / font-family. Виняток: брейкпоінти в `@media`. Це перевіряє `tools/check-styles.mjs` (входить у `build`);
  свідомий виняток — коментар `/* allow: причина */` у тому ж рядку.
- Текстовий ритм: заголовок → його текст **24** (`--section-text-heading`), між логічними блоками **48** (`--section-text-block`).
  Спільні класи: `.section__head` (24 всередині, 48 до контенту), `.stack` (48), `.text-pair` (24). Нові секції — тільки через них.
- Текст — тільки класи text styles `ts-*` (`ts-display-d1`, `ts-title-t1`, `ts-body-md-regular`…), не `font-size` руками.
- Копі — тільки в `src/i18n/en.json` і `uk.json`. EN і UK рівноправні, UK не скорочена; ключі однакові (TS це перевіряє).
- Контакти, URL демо, endpoint форми, аналітика — `src/config.ts`. Порожнє поле = блок не показується.
- Аналітика — Umami Cloud (`PUBLIC_UMAMI_ID`). Подія = атрибут `data-event="назва"` на елементі, без коду провайдера в компонентах.
  Назви подій: `snake_case`, `<об'єкт>_<дія>` (`cta_demo`, `demo_open_fullscreen`, `lang_uk`, `theme_dark`, `contact_sent`).
- OG-картинки — `site/public/og/en.png`, `uk.png` (1200×630). Змінився hero-текст → оновити картинки.
- Картинки через `astro:assets` — завжди `quality={90}` і ширини до розміру оригіналу (вихідники вже webp q92 @2x; дефолт Astro ~80 і обрізання до 2000 px дають мило на ретіні).
- Скріни `/approach` — `site/src/assets/shots/**.webp` з маніфесту `shots.json`. Перезняти: `node tools/shots/render.mjs [id …]` (DEMO_DIST, DEMO_REPO).
  Кадри інструментів — відтворення на даних репо, не вигадані значення. Помітно змінився вигляд демо → перезняти.
- Обкладинки карток кейсів — `site/src/assets/cases/{aurum,site}-{light,dark}.webp` (16:9, реальні кадри: aurum — банер демо, розрізаний на 4 бренди з `shots/brand-morph`; site — головна сайту з постером демо в hero). Помітно змінився вигляд демо або hero → перезняти.
- Фото для `/about` — `site/src/assets/about/portrait.(jpg|png|webp)`; поки файлу немає — монограма.
- Постер демо — `site/public/demo/poster-{wide,mid,mobile}-{light,dark}.webp` (кадри демо в пропорціях рамки 27:25, 4:5, 9:16@2x,
  без підказки демо, зі справжніми шрифтами). Помітно змінився вигляд демо → перезняти постери (локальна збірка демо + Playwright).
- Цифри на сайті — тільки реальні або з плашкою `metric.typical`. Не вигадувати обіцянок від імені Андрія.
- Нова сторінка → спершу розділ у брифі проєкту, потім код, потім маршрут у `PAGES` у `src/pages/sitemap.xml.ts`.
- Сайт запущено (`SITE_LAUNCHED=true`): індексується. Сторінки-чернетки не публікувати — тримати поза `pages/` або за прапором.
- Перевірка перед комітом: `npm --prefix site run build` без помилок (включає check-tokens і astro check).

## Демо
Код демо тут не редагується. Потрібна зміна → `tasks/demo-NN-*.md` з готовим рішенням для проєкту «Multibrand Design System».

## Коміти
Українською, `<область>: <що>` — `tokens(site): …`, `pages(home): …`, `tools: …`, `ci: …`.
