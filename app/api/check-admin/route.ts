import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { userId } = await request.json();
  console.log(userId);

  const isAdmin = userId === process.env.ADMIN_USER_ID;

  return NextResponse.json({ isAdmin });
}
