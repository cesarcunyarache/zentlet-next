import { auth } from "@/auth";

export { auth } from "@/auth";

export const proxy = auth((req) => {
  if (!req.auth && req.nextUrl.pathname !== "/sign-in") {
    const newUrl = new URL("/sign-in", req.nextUrl.origin);
    return Response.redirect(newUrl);
  }
});
