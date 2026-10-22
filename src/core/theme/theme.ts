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

// el --app-bg de cada tema; iOS instalada pinta con él la barra de estado
export const THEME_COLORS = { light: "#f7f6f9", dark: "#0e0e12" } as const;

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

export function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  setThemeColor(THEME_COLORS[theme]);
}

export function clearTheme() {
  const root = document.documentElement;
  root.classList.remove("dark");
  delete root.dataset.theme;
  setThemeColor(null);
}

/**
 * Se ejecuta en el <head> antes de pintar: sin esto una recarga en modo
 * oscuro mostraría un destello claro hasta hidratar.
 */
export const themeInitScript = `(function(){try{if(!new RegExp(${JSON.stringify(THEME_SCOPE)}).test(location.pathname))return;var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.dataset.theme=d?"dark":"light";var m=document.createElement("meta");m.id=${JSON.stringify(THEME_COLOR_META_ID)};m.name="theme-color";m.content=d?${JSON.stringify(THEME_COLORS.dark)}:${JSON.stringify(THEME_COLORS.light)};document.head.prepend(m);}catch(e){}})();`;
