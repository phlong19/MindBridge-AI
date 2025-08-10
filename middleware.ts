import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isProtectedRoute = createRouteMatcher((req) => {
  const { pathname } = req.nextUrl;
  return pathname.startsWith("/companions") && !pathname.includes("community");
});

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const response = NextResponse.redirect(
    new URL(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL!, req.url),
  );

  // admin route
  if (
    (!userId || userId !== process.env.ADMIN_USER_ID) &&
    isProtectedAdminRoute(req)
  ) {
    response.headers.append(
      "Set-Cookie",
      `authorization=1; Path=/; Max-Age=10; SameSite=Lax`,
    );

    return response;
  }

  // not authenticated
  if (isProtectedRoute(req) && !userId) {
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
