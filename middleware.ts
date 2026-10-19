import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSignInPath } from "@/lib/auth-redirect";

const isProtectedAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isProtectedRoute = createRouteMatcher((req) => {
  const { pathname } = req.nextUrl;
  return pathname.startsWith("/companions") && !pathname.includes("community");
});

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const deniedAdmin =
    isProtectedAdminRoute(req) &&
    (!userId || userId !== process.env.ADMIN_USER_ID);

  if (deniedAdmin || (!userId && isProtectedRoute(req))) {
    const destination = userId
      ? "/auth/login"
      : getSignInPath(`${req.nextUrl.pathname}${req.nextUrl.search}`);
    const response = NextResponse.redirect(new URL(destination, req.url));
    if (deniedAdmin)
      response.cookies.set("authorization", "1", {
        path: "/",
        maxAge: 10,
        sameSite: "lax",
      });
    return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
