import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import createMiddleware from "next-intl/middleware";
import { auth } from "@/lib/auth";
import { siteConfig } from "@/lib/site";
import { routing } from "@/i18n/routing";

const handleI18n = createMiddleware(routing);

/** `/en/admin` → `{ prefix: "/en", path: "/admin" }`; sin prefijo, idioma por defecto. */
function splitLocale(pathname: string) {
  const [, first] = pathname.split("/");
  const locale = routing.locales.find((candidate) => candidate === first);
  if (!locale) return { prefix: "", path: pathname };
  return { prefix: `/${locale}`, path: pathname.slice(locale.length + 1) || "/" };
}

export async function proxy(request: NextRequest) {
  const { prefix, path } = splitLocale(request.nextUrl.pathname);
  const isAuthPage = path.startsWith("/auth");
  const isAppPage = path.startsWith("/admin");

  if (isAuthPage || isAppPage) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // se conserva el idioma de la URL al redirigir
    if (isAuthPage && session) {
      return NextResponse.redirect(new URL(prefix + siteConfig.routes.app, request.url));
    }
    if (isAppPage && !session) {
      return NextResponse.redirect(new URL(prefix + siteConfig.routes.signIn, request.url));
    }
  }

  return handleI18n(request);
}

export const config = {
  /*
   * Todo salvo API, internos de Next, archivos con extensión (sw.js,
   * iconos…) y las imágenes OG, que ya llevan el idioma en la ruta
   * (`/es/opengraph-image/…`): los crawlers las reciben sin redirección.
   */
  matcher: ["/((?!api|_next|_vercel|[^/]+/opengraph-image|.*\\..*).*)"],
};
