# Portfolio — Andrey Ozerov

Сайт-портфоліо: **Multi-brand design systems that ship.**
Зібраний на тій самій токен-архітектурі, що й [живе демо](https://ozerovandrey.github.io/multibrand-design-system/) — як окремий бренд `site`.

```
tokens/   Token Studio JSON: дзеркало сетів демо + brand/site.json + components.json
tools/    build-css.mjs (tokens → CSS) · check-tokens.mjs · sync-demo-tokens.mjs
site/     Astro-сайт (EN/UK), збирається з tokens/
tasks/    задачі для репо демо
docs/     словник токенів (token-properties.md) + історичні аудити візуального шару (див. docs/README.md)
qa/       скріни Home і /approach, Lighthouse, qa/shots.mjs
BRIEF.md  бриф проєкту · SHOTS.md — план скрінів /approach
CLAUDE.md правила для Claude Code
```

## Команди

```bash
cd site && npm install
npm run dev                                  # http://localhost:4321/en/
npm run build                                # перевірка токенів + astro check + білд у site/dist
node ../tools/sync-demo-tokens.mjs           # підтягнути сети з ../multibrand-design-system
node ../tools/sync-demo-tokens.mjs --github  # те саме з GitHub
```

Пуш у `main` з правками в `site/`, `tokens/` або `tools/` сам оновлює сайт на GitHub Pages.
Змінні репо (Settings → Secrets and variables → Actions → Variables): `SITE_BASE` (`/portfolio/`, з доменом — `/`),
`SITE_URL`, `PUBLIC_FORM_ENDPOINT` (Formspree), `PUBLIC_UMAMI_ID` (Umami Cloud).
