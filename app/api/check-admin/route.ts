import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { userId } = await request.json();

  const isAdmin = userId === process.env.ADMIN_USER_ID;

  return NextResponse.json({ isAdmin });
}
