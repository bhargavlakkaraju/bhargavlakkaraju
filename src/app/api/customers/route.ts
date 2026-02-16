import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const search = searchParams.get("search");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    const where: any = { organizationId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
      ];
    }

    const customers = await db.customer.findMany({
      where,
      include: {
        _count: { select: { invoices: true, payments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = customerSchema.parse(body);
    const organizationId = body.organizationId;

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    const customer = await db.customer.create({
      data: {
        ...data,
        organizationId,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error creating customer:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
