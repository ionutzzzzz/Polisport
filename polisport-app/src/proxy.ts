import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get("polisport_admin_session")?.value;
  let user = null;
  if (sessionCookie) {
    try {
      user = JSON.parse(sessionCookie);
    } catch {
      user = null;
    }
  }

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginPage  = request.nextUrl.pathname.startsWith("/auth/login");

  // Protejează rutele /admin
  if (isAdminRoute) {
    if (!user || user.user_metadata?.role !== "admin") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirecționează adminii autentificați de pe pagina de login
  if (isLoginPage && user && user.user_metadata?.role === "admin") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const middleware = proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
