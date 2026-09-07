import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { heuristicScore } from "@/lib/scoring";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Recomputes the lead score for every contact. */
export async function POST() {
  const contacts = await prisma.contact.findMany({ include: { deals: true, activities: true } });
  for (const contact of contacts) {
    const { score, reason } = heuristicScore(contact);
    await prisma.contact.update({ where: { id: contact.id }, data: { score, scoreReason: reason } });
  }
  return NextResponse.json({ rescored: contacts.length });
}
