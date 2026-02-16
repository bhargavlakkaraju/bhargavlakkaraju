import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run all queries in parallel
    const [
      totalRevenue,
      monthRevenue,
      outstandingInvoices,
      overdueInvoices,
      monthExpenses,
      recentInvoices,
      recentPayments,
      lowStockProducts,
      pendingReminders,
    ] = await Promise.all([
      // Total revenue (all paid invoices)
      db.invoice.aggregate({
        where: { organizationId, status: "PAID" },
        _sum: { paidAmount: true },
      }),
      // This month's revenue
      db.payment.aggregate({
        where: {
          organizationId,
          status: "COMPLETED",
          paidAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      // Outstanding invoices
      db.invoice.aggregate({
        where: {
          organizationId,
          status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID"] },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      // Overdue invoices
      db.invoice.aggregate({
        where: {
          organizationId,
          status: "OVERDUE",
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      // This month's expenses
      db.expense.aggregate({
        where: {
          organizationId,
          date: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      // Recent invoices
      db.invoice.findMany({
        where: { organizationId },
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      // Recent payments
      db.payment.findMany({
        where: { organizationId, status: "COMPLETED" },
        include: { customer: { select: { name: true } } },
        orderBy: { paidAt: "desc" },
        take: 5,
      }),
      // Low stock products
      db.product.findMany({
        where: {
          organizationId,
          isActive: true,
          reorderLevel: { gt: 0 },
        },
      }),
      // Pending reminders
      db.reminder.findMany({
        where: {
          organizationId,
          status: "PENDING",
          scheduledFor: { gte: now },
        },
        include: { invoice: { select: { invoiceNumber: true } } },
        orderBy: { scheduledFor: "asc" },
        take: 5,
      }),
    ]);

    const lowStock = lowStockProducts.filter((p) => p.quantity <= p.reorderLevel);

    return NextResponse.json({
      stats: {
        totalRevenue: totalRevenue._sum.paidAmount || 0,
        monthRevenue: monthRevenue._sum.amount || 0,
        outstandingAmount: outstandingInvoices._sum.totalAmount || 0,
        outstandingCount: outstandingInvoices._count || 0,
        overdueAmount: overdueInvoices._sum.totalAmount || 0,
        overdueCount: overdueInvoices._count || 0,
        monthExpenses: monthExpenses._sum.amount || 0,
        lowStockCount: lowStock.length,
      },
      recentInvoices,
      recentPayments,
      lowStockProducts: lowStock,
      pendingReminders,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
