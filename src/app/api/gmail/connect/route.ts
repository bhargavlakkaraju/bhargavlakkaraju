import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/api-auth";
import { getAuthUrl, isGmailConfigured } from "@/lib/gmail";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (!isGmailConfigured()) {
    return NextResponse.redirect(new URL("/dashboard/inbox?error=not_configured", req.url));
  }
  return NextResponse.redirect(getAuthUrl(ctx.userId));
}
