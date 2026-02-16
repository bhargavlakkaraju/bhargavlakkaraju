import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoiceSchema } from "@/lib/validations";
import { generateInvoiceNumber } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    const where: any = { organizationId };
    if (status && status !== "ALL") {
      where.status = status;
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { payments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.invoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = invoiceSchema.parse(body);

    const organizationId = body.organizationId;
    const createdById = body.userId;

    if (!organizationId || !createdById) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const invoiceNumber = generateInvoiceNumber();

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    const lineItemsData = data.lineItems.map((item) => {
      const amount = item.quantity * item.unitPrice;
      const tax = amount * (item.taxRate / 100);
      subtotal += amount;
      taxAmount += tax;
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        amount: amount + tax,
        productId: item.productId || undefined,
      };
    });

    const totalAmount = subtotal + taxAmount - data.discountAmount;

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        customerId: data.customerId,
        organizationId,
        createdById,
        dueDate: new Date(data.dueDate),
        subtotal,
        taxAmount,
        discountAmount: data.discountAmount,
        totalAmount,
        notes: data.notes,
        terms: data.terms,
        lineItems: {
          create: lineItemsData,
        },
      },
      include: {
        customer: true,
        lineItems: true,
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
