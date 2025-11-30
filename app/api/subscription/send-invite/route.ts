import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, teamId } = await req.json();

    if (!email || !teamId) {
      return NextResponse.json(
        { error: "Email and team ID are required" },
        { status: 400 }
      );
    }

    // TODO: Implement invitation sending
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Send invite error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


