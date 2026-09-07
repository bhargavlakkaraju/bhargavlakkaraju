import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Read endpoint for external tools: list contacts, optionally filtered.
 *   GET /api/v1/contacts?status=NEW&campaign=Pexalon&limit=100
 */
export async function GET(req: NextRequest) {
  const apiKey = await authenticateApiKey(req);
  if (!apiKey) {
    return NextResponse.json({ error: "Missing or invalid API key" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const limit = Math.min(Number(params.get("limit")) || 100, 500);
  const status = params.get("status") ?? undefined;
  const campaign = params.get("campaign") ?? undefined;

  const contacts = await prisma.contact.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(campaign ? { campaign: { name: campaign } } : {}),
    },
    include: { company: true, campaign: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    count: contacts.length,
    contacts: contacts.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      status: c.status,
      source: c.source,
      tags: c.tags,
      company: c.company?.name ?? null,
      campaign: c.campaign?.name ?? null,
      customData: c.customData ? JSON.parse(c.customData) : null,
      createdAt: c.createdAt,
    })),
  });
}
