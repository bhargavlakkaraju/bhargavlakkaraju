import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const lowStock = searchParams.get("lowStock") === "true";

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    const where: any = { organizationId };

    const products = await db.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = lowStock
      ? products.filter((p) => p.reorderLevel > 0 && p.quantity <= p.reorderLevel)
      : products;

    return NextResponse.json({ products: result });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = productSchema.parse(body);
    const organizationId = body.organizationId;

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    const product = await db.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        description: data.description,
        unitPrice: data.unitPrice,
        costPrice: data.costPrice,
        quantity: data.quantity,
        reorderLevel: data.reorderLevel,
        unit: data.unit,
        isActive: data.isActive,
        categoryId: data.categoryId || undefined,
        organizationId,
      },
    });

    // Create initial stock movement
    if (data.quantity > 0) {
      await db.stockMovement.create({
        data: {
          type: "IN",
          quantity: data.quantity,
          reason: "Initial stock",
          productId: product.id,
        },
      });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
