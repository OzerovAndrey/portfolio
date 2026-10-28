/** Embedded products keep their own React state in dark mode, independently of the portfolio. */
export function darkEmbedUrl(src: string): string {
  const url = new URL(src);
  url.searchParams.set("theme", "dark");
  return url.href;
}

export function keepEmbedDark(iframe: HTMLIFrameElement): void {
  const src = new URL(iframe.dataset.src!);
  // These products share our GitHub Pages origin. Seed their existing stores before
  // navigation so a saved light preference never flashes during the first render.
  if (src.origin === location.origin) {
    try {
      if (src.pathname.startsWith("/drive/")) localStorage.setItem("drive.theme", JSON.stringify("dark"));
      if (src.pathname.startsWith("/atlas-finance/")) {
        const saved = JSON.parse(sessionStorage.getItem("atlas.theme") || "{}");
        sessionStorage.setItem("atlas.theme", JSON.stringify({ ...saved, mode: "dark" }));
      }
    } catch { /* Embedded controls below also work when storage is unavailable. */ }
  }
  let observer: MutationObserver | undefined;
  iframe.addEventListener("load", () => {
    observer?.disconnect();
    try {
      const root = iframe.contentDocument?.documentElement;
      if (!root) return;
      let switching = false;
      const enforce = () => {
        if (root.dataset.theme === "dark") { switching = false; return; }
        if (switching) return;
        const toggle = root.querySelector<HTMLElement>('button.theme-toggle, [role="switch"][aria-checked="false"]');
        if (toggle) { switching = true; toggle.click(); }
      };
      observer = new MutationObserver(enforce);
      observer.observe(root, { attributes: true, attributeFilter: ["data-theme"], childList: true, subtree: true });
      enforce();
    } catch { /* Cross-origin local previews cannot access product controls. */ }
  });
}
