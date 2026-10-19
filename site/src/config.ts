import type { IconName } from "./components/Icon.astro";
// Дані, які надає Андрій (бриф, розділ 8). Порожнє поле = блок на сайті не показується.
type Contacts = { email: string; linkedin: string; telegram: string; phone: string; github: string };

// Прапори запуску. SITE_LAUNCHED=false → <meta robots noindex> на всіх сторінках.
export const SITE_LAUNCHED = true;
// Плашка «Preview — content in progress» зверху. Окремо від noindex: плашку можна сховати, поки сайт ще не індексується.
export const SHOW_PREVIEW_BANNER = false;
// Wanda DS чекає NDA-рішення (BRIEF.md, розділ 6). false → жоден блок про Wanda не рендериться.
export const SHOW_WANDA = false;

// Кар'єра (джерело — LinkedIn Андрія, 08.10.2026). Роки на сайті рахуються від цих дат під час білду, щоб не застарівали.
// Досвід iGaming уточнено Андрієм: 6 років станом на жовтень 2026, без припущення про точну дату початку.
export const career = { start: "2003-09", igaming: { years: 6, asOf: "2026-10" } };
/** Повних років від дати "YYYY-MM" до сьогодні */
export const yearsSince = (ym: string, now = new Date()) => {
  const [y, m] = ym.split("-").map(Number);
  return now.getFullYear() - y - (now.getMonth() + 1 < m ? 1 : 0);
};

export const config = {
  name: "Andrey Ozerov",
  driveUrl: "https://ozerovandrey.github.io/drive/",
  driveSourceUrl: "https://github.com/OzerovAndrey/drive",
  atlasUrl: "https://ozerovandrey.github.io/atlas-finance/",
  atlasSourceUrl: "https://github.com/OzerovAndrey/atlas-finance",
  demoUrl: "https://ozerovandrey.github.io/multibrand-design-system/",
  // Formspree / Resend endpoint. Можна задати через PUBLIC_FORM_ENDPOINT у GitHub → Settings → Variables.
  formEndpoint: (import.meta.env.PUBLIC_FORM_ENDPOINT as string | undefined) ?? "",
  // Umami Cloud (безкоштовний Hobby). Website ID → GitHub → Settings → Variables → PUBLIC_UMAMI_ID. Порожньо = без аналітики.
  analytics: {
    umamiId: (import.meta.env.PUBLIC_UMAMI_ID as string | undefined) ?? "",
    umamiSrc: "https://cloud.umami.is/script.js",
  },
  contacts: {
    email: "vorezo@gmail.com",
    linkedin: "https://www.linkedin.com/in/andrey-ozerov-162b3737/",
    telegram: "https://t.me/ozerov_design",
    phone: "+380630710271",
    github: "https://github.com/OzerovAndrey",
  } satisfies Contacts as Contacts,
};

export type Link = { label: string; url: string; icon?: IconName };
/** Прибирає порожні контакти: link("Email", email && `mailto:${email}`, "mail"). Третій елемент — необов'язкова іконка (components/Icon.astro) */
export const links = (...items: [label: string, url: string | false | "", icon?: IconName][]): Link[] =>
  items.filter((i): i is [string, string, IconName?] => Boolean(i[1])).map(([label, url, icon]) => ({ label, url, icon }));

/** +380630710271 → +380 63 071 0271 */
export const formatPhone = (p: string) => p.replace(/^(\+\d{3})(\d{2})(\d{3})(\d{4})$/, "$1 $2 $3 $4");
