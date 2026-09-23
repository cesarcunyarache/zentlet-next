export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "zentlet.theme.v1";

/** Sólo la app privada tiene tema oscuro; la landing y el acceso siguen en claro. */
export const THEME_SCOPE = "/admin";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
}

export function clearTheme() {
  const root = document.documentElement;
  root.classList.remove("dark");
  delete root.dataset.theme;
}

/**
 * Se ejecuta en el <head> antes de pintar: sin esto una recarga en modo
 * oscuro mostraría un destello claro hasta hidratar.
 */
export const themeInitScript = `(function(){try{if(!location.pathname.startsWith(${JSON.stringify(THEME_SCOPE)}))return;var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.dataset.theme=d?"dark":"light";}catch(e){}})();`;
