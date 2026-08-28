import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionContext } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await db.gmailAccount.findUnique({ where: { userId: ctx.userId } });
  if (account) {
    // Best-effort token revocation with Google.
    try {
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(account.accessToken)}`,
        { method: "POST" }
      );
    } catch {
      // Ignore revocation failures; we still remove the local record.
    }
    await db.gmailAccount.delete({ where: { userId: ctx.userId } });
  }

  return NextResponse.json({ ok: true });
}
