import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: "Acme Corp",
      slug: "acme-corp",
      email: "admin@acme.com",
      phone: "+1 (555) 000-0000",
      address: "123 Business Ave, Suite 100",
      city: "San Francisco",
      state: "CA",
      zipCode: "94105",
      country: "US",
      currency: "USD",
      taxRate: 10,
    },
  });

  // Create admin user
  const passwordHash = await bcrypt.hash("password123", 12);
  const user = await prisma.user.create({
    data: {
      name: "John Doe",
      email: "admin@acme.com",
      passwordHash,
      role: "OWNER",
      organizationId: org.id,
    },
  });

  // Create categories
  const categories = await Promise.all(
    ["Services", "Hardware", "Accessories", "Software"].map((name) =>
      prisma.category.create({
        data: { name, organizationId: org.id },
      })
    )
  );

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Web Development Package",
        sku: "WEB-001",
        unitPrice: 3000,
        costPrice: 1200,
        quantity: 999,
        reorderLevel: 0,
        unit: "pkg",
        categoryId: categories[0].id,
        organizationId: org.id,
      },
    }),
    prisma.product.create({
      data: {
        name: "SEO Optimization",
        sku: "SEO-001",
        unitPrice: 1500,
        costPrice: 600,
        quantity: 999,
        reorderLevel: 0,
        unit: "pkg",
        categoryId: categories[0].id,
        organizationId: org.id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Widget A",
        sku: "WGT-A01",
        unitPrice: 49.99,
        costPrice: 22.5,
        quantity: 8,
        reorderLevel: 25,
        unit: "pcs",
        categoryId: categories[1].id,
        organizationId: org.id,
      },
    }),
  ]);

  // Create customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: "Acme Corp Client",
        email: "billing@client.acme.com",
        phone: "+1 (555) 123-4567",
        company: "Client Acme",
        organizationId: org.id,
      },
    }),
    prisma.customer.create({
      data: {
        name: "TechStart Inc",
        email: "finance@techstart.io",
        phone: "+1 (555) 234-5678",
        company: "TechStart",
        organizationId: org.id,
      },
    }),
    prisma.customer.create({
      data: {
        name: "GlobalTrade LLC",
        email: "ap@globaltrade.com",
        phone: "+1 (555) 345-6789",
        company: "GlobalTrade",
        organizationId: org.id,
      },
    }),
  ]);

  // Create invoices
  const invoice1 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2024-001",
      status: "PAID",
      dueDate: new Date("2024-02-20"),
      subtotal: 5000,
      taxAmount: 500,
      discountAmount: 250,
      totalAmount: 5250,
      paidAmount: 5250,
      notes: "Thank you for your business!",
      terms: "Payment is due within 30 days.",
      customerId: customers[0].id,
      organizationId: org.id,
      createdById: user.id,
      lineItems: {
        create: [
          { description: "Web Development - Homepage Redesign", quantity: 1, unitPrice: 3000, taxRate: 10, amount: 3300 },
          { description: "SEO Optimization Package", quantity: 1, unitPrice: 1500, taxRate: 10, amount: 1650 },
          { description: "Content Writing - 5 Blog Posts", quantity: 5, unitPrice: 100, taxRate: 10, amount: 550 },
        ],
      },
    },
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2024-002",
      status: "SENT",
      dueDate: new Date("2024-02-25"),
      subtotal: 3750,
      taxAmount: 0,
      totalAmount: 3750,
      paidAmount: 0,
      customerId: customers[1].id,
      organizationId: org.id,
      createdById: user.id,
      lineItems: {
        create: [
          { description: "Consulting Services - 25 hours", quantity: 25, unitPrice: 150, taxRate: 0, amount: 3750 },
        ],
      },
    },
  });

  // Create payment for invoice 1
  await prisma.payment.create({
    data: {
      amount: 5250,
      method: "BANK_TRANSFER",
      status: "COMPLETED",
      reference: "TRF-98765",
      paidAt: new Date("2024-02-15"),
      invoiceId: invoice1.id,
      customerId: customers[0].id,
      organizationId: org.id,
      recordedById: user.id,
    },
  });

  // Create expenses
  await Promise.all([
    prisma.expense.create({ data: { description: "Office Rent - February", amount: 2500, category: "Rent", vendor: "BuildingCo", date: new Date("2024-02-01"), organizationId: org.id } }),
    prisma.expense.create({ data: { description: "Cloud Hosting - AWS", amount: 847.32, category: "Technology", vendor: "Amazon Web Services", date: new Date("2024-02-03"), organizationId: org.id } }),
    prisma.expense.create({ data: { description: "Marketing - Google Ads", amount: 1200, category: "Marketing", vendor: "Google", date: new Date("2024-02-10"), organizationId: org.id } }),
  ]);

  // Create workflows
  await prisma.workflow.create({
    data: {
      name: "Auto-Send Payment Reminders",
      description: "Automatically send email reminders when invoices are overdue",
      trigger: "INVOICE_OVERDUE",
      actions: JSON.stringify([
        { type: "SEND_EMAIL", config: { template: "payment_reminder" } },
        { type: "CREATE_NOTIFICATION", config: { title: "Invoice overdue" } },
      ]),
      isActive: true,
      organizationId: org.id,
    },
  });

  await prisma.workflow.create({
    data: {
      name: "Low Stock Alert",
      description: "Notify when inventory falls below threshold",
      trigger: "LOW_STOCK",
      actions: JSON.stringify([
        { type: "CREATE_NOTIFICATION", config: { title: "Low stock alert" } },
        { type: "AI_SUGGEST", config: { task: "suggest_reorder_quantity" } },
      ]),
      isActive: true,
      organizationId: org.id,
    },
  });

  // Create reminders
  await prisma.reminder.create({
    data: {
      type: "PAYMENT_DUE",
      message: "Invoice INV-2024-002 payment due soon",
      scheduledFor: new Date("2024-02-22T09:00:00Z"),
      invoiceId: invoice2.id,
      organizationId: org.id,
    },
  });

  // Create notifications
  await prisma.notification.create({
    data: {
      title: "Payment Received",
      message: "Payment of $5,250.00 received from Acme Corp Client",
      type: "PAYMENT",
      userId: user.id,
    },
  });

  console.log("Database seeded successfully!");
  console.log(`\nLogin credentials:\n  Email: admin@acme.com\n  Password: password123`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
