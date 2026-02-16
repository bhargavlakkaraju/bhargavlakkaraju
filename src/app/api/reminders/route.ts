import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, getPaymentReminderTemplate, getOverdueNoticeTemplate } from "@/lib/email";
import { calculateOptimalReminderTime } from "@/lib/ai-engine";
import { formatCurrency } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const status = searchParams.get("status");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    const where: any = { organizationId };
    if (status && status !== "ALL") {
      where.status = status;
    }

    const reminders = await db.reminder.findMany({
      where,
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            totalAmount: true,
            dueDate: true,
            customer: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { scheduledFor: "asc" },
    });

    return NextResponse.json({ reminders });
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, message, scheduledFor, invoiceId, organizationId } = body;

    if (!organizationId || !type || !scheduledFor) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const reminder = await db.reminder.create({
      data: {
        type,
        message,
        scheduledFor: new Date(scheduledFor),
        invoiceId: invoiceId || undefined,
        organizationId,
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error("Error creating reminder:", error);
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}

/**
 * Process pending reminders (called by cron job or scheduled task)
 */
export async function PUT(req: NextRequest) {
  try {
    const now = new Date();

    // Find all pending reminders that are due
    const dueReminders = await db.reminder.findMany({
      where: {
        status: "PENDING",
        scheduledFor: { lte: now },
      },
      include: {
        invoice: {
          include: {
            customer: true,
            organization: true,
          },
        },
        organization: true,
      },
    });

    const results = [];

    for (const reminder of dueReminders) {
      try {
        if (reminder.invoice && reminder.invoice.customer) {
          const customer = reminder.invoice.customer;
          const org = reminder.invoice.organization;

          let emailTemplate;
          if (reminder.type === "PAYMENT_OVERDUE") {
            const daysOverdue = Math.ceil(
              (now.getTime() - reminder.invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            emailTemplate = getOverdueNoticeTemplate({
              customerName: customer.name,
              invoiceNumber: reminder.invoice.invoiceNumber,
              amount: formatCurrency(reminder.invoice.totalAmount),
              dueDate: reminder.invoice.dueDate.toLocaleDateString(),
              daysOverdue,
              organizationName: org.name,
            });
          } else {
            emailTemplate = getPaymentReminderTemplate({
              customerName: customer.name,
              invoiceNumber: reminder.invoice.invoiceNumber,
              amount: formatCurrency(reminder.invoice.totalAmount),
              dueDate: reminder.invoice.dueDate.toLocaleDateString(),
              organizationName: org.name,
            });
          }

          await sendEmail({
            to: customer.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
          });
        }

        // Mark as sent
        await db.reminder.update({
          where: { id: reminder.id },
          data: { status: "SENT", sentAt: now },
        });

        results.push({ id: reminder.id, status: "SENT" });
      } catch (error: any) {
        await db.reminder.update({
          where: { id: reminder.id },
          data: { status: "FAILED" },
        });
        results.push({ id: reminder.id, status: "FAILED", error: error.message });
      }
    }

    return NextResponse.json({
      processed: dueReminders.length,
      results,
    });
  } catch (error) {
    console.error("Error processing reminders:", error);
    return NextResponse.json({ error: "Failed to process reminders" }, { status: 500 });
  }
}
