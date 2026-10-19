// sitemap.xml: усі публічні сторінки обома мовами з hreflang-альтернативами. Нова сторінка → додати маршрут у PAGES.
import type { APIRoute } from "astro";
import { locales } from "../i18n";

const PAGES = ["", "approach", "cases", "cases/aurum-multibrand", "cases/atlas-finance", "cases/drive", "services", "about", "contact"];

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
  const url = (lang: string, p: string) => new URL(`${base}${lang}/${p ? p + "/" : ""}`, site).href;
  const today = new Date().toISOString().slice(0, 10);
  const items = PAGES.flatMap((p) => locales.map((lang) => `  <url>
    <loc>${url(lang, p)}</loc>
    <lastmod>${today}</lastmod>
${locales.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${url(l, p)}"/>`).join("\n")}
    <xhtml:link rel="alternate" hreflang="x-default" href="${url("en", p)}"/>
  </url>`));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${items.join("\n")}
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
