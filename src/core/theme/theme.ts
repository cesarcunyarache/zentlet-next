import { routing } from "@/i18n/routing";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "zentlet.theme.v1";

/**
 * La landing, el acceso y la app privada tienen tema oscuro; las páginas
 * legales siguen en claro. Con o sin prefijo de idioma: `/`, `/en`,
 * `/auth/sign-in`, `/en/admin`.
 */
export const THEME_SCOPE = `^(/(${routing.locales.join("|")}))?(/?$|/(admin|auth)(/|$))`;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

/*
 * iOS instalada pinta la barra de estado con la theme-color, fuera de la
 * página: "page" es el --app-bg de cada tema y "scrim" ese fondo bajo el
 * --app-scrim de las hojas, para que la barra se oscurezca con ellas.
 */
export const THEME_COLORS = {
  light: { page: "#f7f6f9", scrim: "#9a999e" },
  dark: { page: "#0e0e12", scrim: "#08080a" },
} as const;

let openScrims = 0;

const THEME_COLOR_META_ID = "theme-color-active";

/**
 * Va primera en el <head>: el navegador usa la primera theme-color que
 * coincide, así gana a las de la página mientras haya tema aplicado.
 */
function setThemeColor(color: string | null) {
  const current = document.getElementById(THEME_COLOR_META_ID);
  if (color === null) {
    current?.remove();
    return;
  }
  const meta = current ?? document.createElement("meta");
  meta.id = THEME_COLOR_META_ID;
  meta.setAttribute("name", "theme-color");
  meta.setAttribute("content", color);
  if (!current) document.head.prepend(meta);
}

function syncThemeColor() {
  const theme = document.documentElement.dataset.theme;
  if (theme !== "light" && theme !== "dark") {
    setThemeColor(null);
    return;
  }
  setThemeColor(THEME_COLORS[theme][openScrims > 0 ? "scrim" : "page"]);
}

/** Oscurece la barra de estado mientras la hoja esté abierta; devuelve cómo soltarla. */
export function showStatusBarScrim() {
  openScrims += 1;
  syncThemeColor();
  return () => {
    openScrims -= 1;
    syncThemeColor();
  };
}

export function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  syncThemeColor();
}

export function clearTheme() {
  const root = document.documentElement;
  root.classList.remove("dark");
  delete root.dataset.theme;
  syncThemeColor();
}

/**
 * Se ejecuta en el <head> antes de pintar: sin esto una recarga en modo
 * oscuro mostraría un destello claro hasta hidratar.
 */
export const themeInitScript = `(function(){try{if(!new RegExp(${JSON.stringify(THEME_SCOPE)}).test(location.pathname))return;var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.dataset.theme=d?"dark":"light";var m=document.createElement("meta");m.id=${JSON.stringify(THEME_COLOR_META_ID)};m.name="theme-color";m.content=d?${JSON.stringify(THEME_COLORS.dark.page)}:${JSON.stringify(THEME_COLORS.light.page)};document.head.prepend(m);}catch(e){}})();`;
