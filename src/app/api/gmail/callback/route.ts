import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exchangeCode, fetchGmailProfile, verifyState } from "@/lib/gmail";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/inbox?error=${error}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/inbox?error=missing_code", req.url));
  }

  const userId = verifyState(state);
  if (!userId) {
    return NextResponse.redirect(new URL("/dashboard/inbox?error=invalid_state", req.url));
  }

  try {
    const tokens = await exchangeCode(code);
    const profile = await fetchGmailProfile(tokens.access_token);

    await db.gmailAccount.upsert({
      where: { userId },
      create: {
        userId,
        email: profile.emailAddress,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
      },
      update: {
        email: profile.emailAddress,
        accessToken: tokens.access_token,
        // Google only returns a refresh token on first consent; keep the old one otherwise.
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
      },
    });

    return NextResponse.redirect(new URL("/dashboard/inbox?connected=1", req.url));
  } catch (e) {
    console.error("Gmail callback error:", e);
    return NextResponse.redirect(new URL("/dashboard/inbox?error=exchange_failed", req.url));
  }
}
