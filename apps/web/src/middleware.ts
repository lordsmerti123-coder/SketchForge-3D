import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const locales = ["en", "ru"] as const;
export const defaultLocale = "ru";

export function middleware(request: NextRequest) {
  const locale = request.cookies.get("NEXT_LOCALE")?.value;

  if (!locale || !locales.includes(locale as typeof locales[number])) {
    const response = NextResponse.next();
    response.cookies.set("NEXT_LOCALE", "ru", { maxAge: 31536000, path: "/" });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon|assets|manifold|.*\\.worker\\.ts|.*\\.png|.*\\.webp|.*\\.jpg|.*\\.jpeg|.*\\.gif).*)"],
};
