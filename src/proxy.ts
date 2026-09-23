import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { siteConfig } from "@/lib/site";

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth");

  if (isAuthPage) {
    return session
      ? NextResponse.redirect(new URL(siteConfig.routes.app, request.url))
      : NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL(siteConfig.routes.signIn, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/auth/:path*"],
};
