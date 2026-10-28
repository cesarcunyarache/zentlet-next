import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import createMiddleware from "next-intl/middleware";
import { auth } from "@/lib/auth";
import { siteConfig } from "@/lib/site";
import { routing } from "@/i18n/routing";
import {
  PENDING_INVITE_COOKIE,
  PENDING_INVITE_MAX_AGE_S,
  inviteTokenFromPath,
} from "@/features/list/lib/pending-invite";

const handleI18n = createMiddleware(routing);

/** `/en/admin` → `{ prefix: "/en", path: "/admin" }`; sin prefijo, idioma por defecto. */
function splitLocale(pathname: string) {
  const [, first] = pathname.split("/");
  const locale = routing.locales.find((candidate) => candidate === first);
  if (!locale) return { prefix: "", path: pathname };
  return { prefix: `/${locale}`, path: pathname.slice(locale.length + 1) || "/" };
}

/** Una invitación abierta sin sesión sobrevive al login (o al registro) en una cookie corta. */
function rememberInvite(path: string, response: NextResponse) {
  const token = inviteTokenFromPath(path);
  if (token) {
    response.cookies.set(PENDING_INVITE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: PENDING_INVITE_MAX_AGE_S,
    });
  }
  return response;
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
      return rememberInvite(path, NextResponse.redirect(new URL(prefix + siteConfig.routes.signIn, request.url)));
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
