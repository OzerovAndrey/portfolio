import { useEffect, useState, type MouseEvent } from "react";
import { playThemeSound } from "../lib/theme-sound";

type Theme = "light" | "dark";
interface Props { labelToDark: string; labelToLight: string }

// React-острів: перемикає data-theme на <html>. Початкову тему (системну або вибрану у візиті) ставить inline-скрипт у <head>.
export default function ThemeToggle({ labelToDark, labelToLight }: Props) {
  const [theme, setTheme] = useState<Theme>("light");
  // анімація появи іконки — лише після кліку (не при завантаженні сторінки)
  const [switched, setSwitched] = useState(false);
  useEffect(() => {
    // Тема може змінитись і без кліку (системна тема змінилась) — іконка стежить за атрибутом
    const root = document.documentElement;
    const sync = () => setTheme(root.dataset.theme === "dark" ? "dark" : "light");
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  const toggle = (e: MouseEvent<HTMLButtonElement>) => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const apply = () => { document.documentElement.dataset.theme = next; };
    // View Transitions: браузер тримає старий кадр, доки не готовий новий (без порожнього/чорного екрана), а нова тема
    // розкривається колом від центру кнопки (стилі — visual.css, токени motion.themeSwitch.*). Без підтримки або з reduced-motion — миттєво
    const vt = (document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }).startViewTransition;
    if (vt && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Поки йде перехід сайту, вкладені переходи (демо в iframe) чекають: два View Transitions одночасно валять вкладку Chrome (Aw, Snap, код 5).
      // Прапорець ставиться ДО зміни data-theme — спостерігачі (Hero) побачать його й відкладуть свою синхронізацію до події themetransitionend
      const root = document.documentElement;
      // центр кола — кнопка (і для кліку, і для клавіатури); радіус — до найдальшого кута в'юпорту
      const b = e.currentTarget.getBoundingClientRect();
      const x = b.left + b.width / 2, y = b.top + b.height / 2;
      const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.style.setProperty("--theme-switch-x", `${x}px`);
      root.style.setProperty("--theme-switch-y", `${y}px`);
      root.style.setProperty("--theme-switch-r", `${r}px`);
      root.dataset.themeTransition = "";
      const done = () => {
        delete root.dataset.themeTransition;
        for (const k of ["x", "y", "r"]) root.style.removeProperty(`--theme-switch-${k}`);
        window.dispatchEvent(new Event("themetransitionend"));
      };
      try { vt.call(document, apply).finished.catch(() => {}).finally(done); } catch { apply(); done(); }
    } else apply();
    try { sessionStorage.setItem("theme", next); } catch { /* приватний режим — тема живе до перезавантаження */ }
    setTheme(next);
    setSwitched(true);
    playThemeSound(next === "dark");
  };
  const label = theme === "dark" ? labelToLight : labelToDark;

  return (
    <button type="button" className="theme-toggle" onClick={toggle} data-event={`theme_${theme === "dark" ? "light" : "dark"}`} aria-label={label} title={label}>
      <svg key={theme} className={switched ? "theme-toggle__icon is-switched" : "theme-toggle__icon"} width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        {theme === "dark" ? (
          <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        )}
      </svg>
    </button>
  );
}
