import { createHmac } from "crypto";
import { db } from "./db";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export function isGmailConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getRedirectUri(): string {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/gmail/callback`;
}

// State parameter is HMAC-signed so the callback can verify it originated here.
export function signState(userId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || "dev-secret";
  const payload = `${userId}.${Date.now()}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 32);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyState(state: string): string | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const [userId, ts, sig] = decoded.split(".");
    const secret = process.env.NEXTAUTH_SECRET || "dev-secret";
    const expected = createHmac("sha256", secret)
      .update(`${userId}.${ts}`)
      .digest("hex")
      .slice(0, 32);
    if (sig !== expected) return null;
    // Reject states older than 15 minutes
    if (Date.now() - Number(ts) > 15 * 60 * 1000) return null;
    return userId;
  } catch {
    return null;
  }
}

export function getAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: signState(userId),
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${await res.text()}`);
  }
  return res.json();
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${await res.text()}`);
  }
  return res.json();
}

/** Returns a valid access token for the user, refreshing (and persisting) if expired. */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const account = await db.gmailAccount.findUnique({ where: { userId } });
  if (!account) return null;

  const expiresSoon =
    !account.tokenExpiry || account.tokenExpiry.getTime() - Date.now() < 60_000;

  if (!expiresSoon) return account.accessToken;
  if (!account.refreshToken) return account.accessToken;

  const refreshed = await refreshAccessToken(account.refreshToken);
  const updated = await db.gmailAccount.update({
    where: { userId },
    data: {
      accessToken: refreshed.access_token,
      tokenExpiry: new Date(Date.now() + refreshed.expires_in * 1000),
    },
  });
  return updated.accessToken;
}

export async function fetchGmailProfile(accessToken: string): Promise<{ emailAddress: string }> {
  const res = await fetch(`${GMAIL_API}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail profile fetch failed: ${await res.text()}`);
  return res.json();
}

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

function parseFrom(raw: string): { name: string; email: string } {
  const match = raw.match(/^(?:"?([^"<]*)"?\s*)?<?([^<>]+@[^<>]+)>?$/);
  if (match) {
    return { name: (match[1] || match[2]).trim(), email: match[2].trim() };
  }
  return { name: raw, email: raw };
}

export async function fetchInbox(
  accessToken: string,
  maxResults = 15
): Promise<{ messages: GmailMessage[]; unreadCount: number }> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  const [listRes, labelRes] = await Promise.all([
    fetch(`${GMAIL_API}/messages?labelIds=INBOX&maxResults=${maxResults}`, { headers }),
    fetch(`${GMAIL_API}/labels/INBOX`, { headers }),
  ]);
  if (!listRes.ok) throw new Error(`Gmail list failed: ${await listRes.text()}`);

  const list = await listRes.json();
  const label = labelRes.ok ? await labelRes.json() : { threadsUnread: 0 };
  const ids: { id: string }[] = list.messages || [];

  const messages = await Promise.all(
    ids.map(async ({ id }) => {
      const res = await fetch(
        `${GMAIL_API}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers }
      );
      if (!res.ok) return null;
      const msg = await res.json();
      const getHeader = (name: string) =>
        msg.payload?.headers?.find(
          (h: { name: string; value: string }) => h.name.toLowerCase() === name.toLowerCase()
        )?.value || "";
      const from = parseFrom(getHeader("From"));
      return {
        id: msg.id,
        threadId: msg.threadId,
        from: from.email,
        fromName: from.name,
        subject: getHeader("Subject") || "(no subject)",
        snippet: msg.snippet || "",
        date: getHeader("Date"),
        isUnread: (msg.labelIds || []).includes("UNREAD"),
      } as GmailMessage;
    })
  );

  return {
    messages: messages.filter((m): m is GmailMessage => m !== null),
    unreadCount: label.threadsUnread ?? 0,
  };
}
