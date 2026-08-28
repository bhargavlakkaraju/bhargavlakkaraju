import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionContext } from "@/lib/api-auth";
import { fetchInbox, getValidAccessToken, isGmailConfigured } from "@/lib/gmail";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await db.gmailAccount.findUnique({
    where: { userId: ctx.userId },
    select: { email: true, connectedAt: true },
  });

  if (!account) {
    return NextResponse.json({
      connected: false,
      configured: isGmailConfigured(),
    });
  }

  try {
    const accessToken = await getValidAccessToken(ctx.userId);
    if (!accessToken) throw new Error("No access token");
    const { messages, unreadCount } = await fetchInbox(accessToken, 15);
    return NextResponse.json({
      connected: true,
      configured: true,
      email: account.email,
      unreadCount,
      messages,
    });
  } catch (e) {
    console.error("Gmail inbox error:", e);
    return NextResponse.json(
      {
        connected: true,
        configured: true,
        email: account.email,
        error: "Failed to fetch inbox. Try reconnecting your account.",
      },
      { status: 502 }
    );
  }
}
