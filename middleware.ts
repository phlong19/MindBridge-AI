import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const env = process.env.NODE_ENV;

export default env === "development"
  ? () => NextResponse.next()
  : clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
