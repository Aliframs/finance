import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isLoginPage = pathname === "/";
  const isAuthAPI = pathname.startsWith("/api/auth");

  if (isAuthAPI) {
    return NextResponse.next();
  }

  if (isLoginPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
    return NextResponse.next();
  }

  // If not logged in
  if (!isLoggedIn) {
    // API routes → return 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized: Anda harus login terlebih dahulu" },
        { status: 401 }
      );
    }
    // Pages → redirect to login (/)
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all paths except static files, images, and favicon
    "/((?!_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
