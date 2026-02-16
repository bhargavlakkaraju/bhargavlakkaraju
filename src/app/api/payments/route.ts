import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentSchema } from "@/lib/validations";

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

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        include: {
          invoice: { select: { id: true, invoiceNumber: true } },
          customer: { select: { id: true, name: true } },
          recordedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.payment.count({ where }),
    ]);

    return NextResponse.json({
      payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = paymentSchema.parse(body);

    const organizationId = body.organizationId;
    const recordedById = body.userId;

    if (!organizationId || !recordedById) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get the invoice to validate and find customer
    const invoice = await db.invoice.findUnique({
      where: { id: data.invoiceId },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const remainingBalance = invoice.totalAmount - invoice.paidAmount;
    if (data.amount > remainingBalance) {
      return NextResponse.json(
        { error: `Payment amount exceeds remaining balance of ${remainingBalance}` },
        { status: 400 }
      );
    }

    // Create payment and update invoice in a transaction
    const result = await db.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          amount: data.amount,
          method: data.method,
          status: "COMPLETED",
          reference: data.reference,
          notes: data.notes,
          paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
          invoiceId: data.invoiceId,
          customerId: invoice.customerId,
          organizationId,
          recordedById,
        },
      });

      const newPaidAmount = invoice.paidAmount + data.amount;
      const newStatus =
        newPaidAmount >= invoice.totalAmount ? "PAID" : "PARTIALLY_PAID";

      await tx.invoice.update({
        where: { id: data.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });

      return payment;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error recording payment:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
