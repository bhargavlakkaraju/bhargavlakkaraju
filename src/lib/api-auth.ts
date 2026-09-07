import { NextRequest } from "next/server";
import { prisma } from "./db";

/**
 * Authenticates a public API request via `Authorization: Bearer <key>`
 * or an `x-api-key` header. Returns the ApiKey record or null.
 */
export async function authenticateApiKey(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const key = bearer || req.headers.get("x-api-key");
  if (!key) return null;

  const apiKey = await prisma.apiKey.findUnique({ where: { key } });
  if (!apiKey || apiKey.revoked) return null;

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });
  return apiKey;
}
