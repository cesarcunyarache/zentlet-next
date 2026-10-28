import { NextResponse, type NextRequest } from "next/server";
import { siteConfig } from "@/lib/site";
import { GMAIL_RESULT_PARAM, type GmailConnectResult } from "../types";

const STATE_COOKIE = "gmail_oauth_state";
const STATE_COOKIE_PATH = "/api/inbox/gmail";
const STATE_MAX_AGE_SECONDS = 600;

export function readOAuthState(req: NextRequest) {
  return req.cookies.get(STATE_COOKIE)?.value;
}

export function redirectToGoogle(url: string, state: string) {
  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: STATE_COOKIE_PATH,
    maxAge: STATE_MAX_AGE_SECONDS,
  });
  return response;
}

export function redirectWithResult(req: NextRequest, result: GmailConnectResult) {
  const target = new URL(siteConfig.routes.app, req.url);
  target.searchParams.set(GMAIL_RESULT_PARAM, result);
  const response = NextResponse.redirect(target);
  response.cookies.delete({ name: STATE_COOKIE, path: STATE_COOKIE_PATH });
  return response;
}
