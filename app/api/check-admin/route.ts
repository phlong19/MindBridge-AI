import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST() {
  const { userId } = await auth();

  const isAdmin = Boolean(
    userId && process.env.ADMIN_USER_ID && userId === process.env.ADMIN_USER_ID,
  );

  return NextResponse.json({ isAdmin });
}
