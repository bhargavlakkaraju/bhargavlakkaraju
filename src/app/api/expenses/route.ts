import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenseSchema } from "@/lib/validations";
import { suggestExpenseCategory } from "@/lib/ai-engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const category = searchParams.get("category");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    const where: any = { organizationId };
    if (category && category !== "ALL") {
      where.category = category;
    }

    const expenses = await db.expense.findMany({
      where,
      orderBy: { date: "desc" },
    });

    // Aggregate by category
    const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({ expenses, byCategory, total });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = expenseSchema.parse(body);
    const organizationId = body.organizationId;

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    // AI auto-categorization if no category provided
    let category = data.category;
    if (!category || category === "auto") {
      category = suggestExpenseCategory(data.description, data.vendor || "");
    }

    const expense = await db.expense.create({
      data: {
        description: data.description,
        amount: data.amount,
        category,
        date: data.date ? new Date(data.date) : new Date(),
        vendor: data.vendor,
        notes: data.notes,
        organizationId,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
