import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const daysFromNow = (days: number, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);

async function main() {
  console.log("Seeding agency demo data...");

  // Wipe existing data (dependency order) so re-seeding is idempotent.
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.gmailAccount.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.workflowLog.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: {
      name: "Northlight Studio",
      slug: "northlight-studio",
      email: "hello@northlight.studio",
      phone: "+1 (555) 010-2030",
      address: "500 Harbor Blvd, Floor 4",
      city: "Austin",
      state: "TX",
      country: "US",
      currency: "USD",
      taxRate: 8.25,
    },
  });

  const passwordHash = await bcrypt.hash("password123", 12);
  const mkUser = (name: string, email: string, role: string) =>
    prisma.user.create({
      data: { name, email, passwordHash, role, organizationId: org.id },
    });

  const alex = await mkUser("Alex Rivera", "admin@agency.com", "OWNER");
  const sam = await mkUser("Sam Chen", "sam@agency.com", "MEMBER");
  const priya = await mkUser("Priya Patel", "priya@agency.com", "MEMBER");
  const marcus = await mkUser("Marcus Johnson", "marcus@agency.com", "MEMBER");
  const elena = await mkUser("Elena Rodriguez", "elena@agency.com", "MEMBER");

  const mkClient = (name: string, email: string, company: string) =>
    prisma.customer.create({
      data: { name, email, company, organizationId: org.id },
    });

  const techstart = await mkClient("TechStart Inc", "finance@techstart.io", "TechStart");
  const greenleaf = await mkClient("GreenLeaf Organics", "ap@greenleaf.com", "GreenLeaf");
  const summit = await mkClient("Summit Financial", "billing@summitfin.com", "Summit");
  const bluewave = await mkClient("BlueWave Media", "accounts@bluewave.tv", "BlueWave");

  // ── Projects ──────────────────────────────────────────────────────
  const websiteRedesign = await prisma.project.create({
    data: {
      name: "TechStart Website Redesign",
      description: "Full marketing site redesign: new IA, design system, and Next.js build.",
      status: "ACTIVE",
      health: "ON_TRACK",
      startDate: daysFromNow(-30),
      dueDate: daysFromNow(21),
      budget: 48000,
      clientId: techstart.id,
      leadId: sam.id,
      organizationId: org.id,
    },
  });

  const brandIdentity = await prisma.project.create({
    data: {
      name: "GreenLeaf Brand Identity",
      description: "Logo refresh, packaging system, and brand guidelines for retail launch.",
      status: "ACTIVE",
      health: "AT_RISK",
      startDate: daysFromNow(-45),
      dueDate: daysFromNow(7),
      budget: 32000,
      clientId: greenleaf.id,
      leadId: priya.id,
      organizationId: org.id,
    },
  });

  const seoRetainer = await prisma.project.create({
    data: {
      name: "Summit SEO Retainer",
      description: "Monthly SEO and content retainer: 8 articles, technical audits, reporting.",
      status: "ACTIVE",
      health: "ON_TRACK",
      startDate: daysFromNow(-90),
      dueDate: daysFromNow(60),
      budget: 6500,
      clientId: summit.id,
      leadId: elena.id,
      organizationId: org.id,
    },
  });

  const socialCampaign = await prisma.project.create({
    data: {
      name: "BlueWave Q3 Social Campaign",
      description: "Paid social campaign across three platforms. Waiting on client creative approval.",
      status: "ON_HOLD",
      health: "AT_RISK",
      startDate: daysFromNow(-14),
      dueDate: daysFromNow(35),
      budget: 18000,
      clientId: bluewave.id,
      leadId: elena.id,
      organizationId: org.id,
    },
  });

  const internalSite = await prisma.project.create({
    data: {
      name: "Northlight Portfolio Refresh",
      description: "Internal: update our own portfolio site with 2026 case studies.",
      status: "ACTIVE",
      health: "ON_TRACK",
      startDate: daysFromNow(-10),
      dueDate: daysFromNow(30),
      leadId: alex.id,
      organizationId: org.id,
    },
  });

  // ── Tasks ─────────────────────────────────────────────────────────
  const tasks: {
    title: string;
    status: string;
    priority: string;
    assigneeId: string;
    projectId: string;
    dueInDays?: number;
    completedHoursAgo?: number;
  }[] = [
    // Website redesign
    { title: "Homepage hero design v2", status: "IN_REVIEW", priority: "HIGH", assigneeId: priya.id, projectId: websiteRedesign.id, dueInDays: 2 },
    { title: "Build pricing page components", status: "IN_PROGRESS", priority: "HIGH", assigneeId: marcus.id, projectId: websiteRedesign.id, dueInDays: 4 },
    { title: "CMS migration plan", status: "TODO", priority: "MEDIUM", assigneeId: marcus.id, projectId: websiteRedesign.id, dueInDays: 6 },
    { title: "Copy deck for product pages", status: "IN_PROGRESS", priority: "MEDIUM", assigneeId: elena.id, projectId: websiteRedesign.id, dueInDays: 3 },
    { title: "Design system tokens", status: "DONE", priority: "HIGH", assigneeId: priya.id, projectId: websiteRedesign.id, completedHoursAgo: 26 },
    { title: "Sitemap & IA workshop", status: "DONE", priority: "MEDIUM", assigneeId: sam.id, projectId: websiteRedesign.id, completedHoursAgo: 96 },
    { title: "Analytics & event tracking spec", status: "TODO", priority: "LOW", assigneeId: sam.id, projectId: websiteRedesign.id, dueInDays: 10 },

    // Brand identity
    { title: "Final logo lockups", status: "IN_PROGRESS", priority: "URGENT", assigneeId: priya.id, projectId: brandIdentity.id, dueInDays: 1 },
    { title: "Packaging dielines for 3 SKUs", status: "BLOCKED", priority: "HIGH", assigneeId: priya.id, projectId: brandIdentity.id, dueInDays: -2 },
    { title: "Brand guidelines document", status: "TODO", priority: "HIGH", assigneeId: sam.id, projectId: brandIdentity.id, dueInDays: 5 },
    { title: "Color & typography exploration", status: "DONE", priority: "MEDIUM", assigneeId: priya.id, projectId: brandIdentity.id, completedHoursAgo: 120 },
    { title: "Print vendor quotes", status: "TODO", priority: "MEDIUM", assigneeId: alex.id, projectId: brandIdentity.id, dueInDays: 4 },

    // SEO retainer
    { title: "August content calendar", status: "DONE", priority: "MEDIUM", assigneeId: elena.id, projectId: seoRetainer.id, completedHoursAgo: 50 },
    { title: "Write: '2026 retirement checklist'", status: "IN_PROGRESS", priority: "MEDIUM", assigneeId: elena.id, projectId: seoRetainer.id, dueInDays: 2 },
    { title: "Technical audit: core web vitals", status: "IN_PROGRESS", priority: "HIGH", assigneeId: marcus.id, projectId: seoRetainer.id, dueInDays: 5 },
    { title: "Monthly performance report", status: "TODO", priority: "MEDIUM", assigneeId: elena.id, projectId: seoRetainer.id, dueInDays: 7 },
    { title: "Fix broken internal links", status: "DONE", priority: "LOW", assigneeId: marcus.id, projectId: seoRetainer.id, completedHoursAgo: 8 },

    // Social campaign (on hold)
    { title: "Campaign concept deck", status: "DONE", priority: "HIGH", assigneeId: elena.id, projectId: socialCampaign.id, completedHoursAgo: 200 },
    { title: "Ad creative set A (awaiting approval)", status: "BLOCKED", priority: "HIGH", assigneeId: priya.id, projectId: socialCampaign.id, dueInDays: -1 },
    { title: "Audience & budget plan", status: "IN_REVIEW", priority: "MEDIUM", assigneeId: sam.id, projectId: socialCampaign.id, dueInDays: 3 },

    // Internal
    { title: "Select 4 case studies to feature", status: "IN_PROGRESS", priority: "LOW", assigneeId: alex.id, projectId: internalSite.id, dueInDays: 6 },
    { title: "Shoot new team photos", status: "TODO", priority: "LOW", assigneeId: alex.id, projectId: internalSite.id, dueInDays: 14 },
  ];

  for (const t of tasks) {
    await prisma.task.create({
      data: {
        title: t.title,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assigneeId,
        projectId: t.projectId,
        organizationId: org.id,
        dueDate: t.dueInDays !== undefined ? daysFromNow(t.dueInDays, 17) : undefined,
        completedAt: t.completedHoursAgo !== undefined ? hoursAgo(t.completedHoursAgo) : undefined,
      },
    });
  }

  // ── Invoices & payments ───────────────────────────────────────────
  const paidInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-1041",
      status: "PAID",
      issueDate: daysFromNow(-20),
      dueDate: daysFromNow(-5),
      subtotal: 16000,
      taxAmount: 0,
      totalAmount: 16000,
      paidAmount: 16000,
      customerId: techstart.id,
      organizationId: org.id,
      createdById: alex.id,
      lineItems: {
        create: [
          { description: "Website redesign — milestone 1 (discovery + IA)", quantity: 1, unitPrice: 16000, amount: 16000 },
        ],
      },
    },
  });

  await prisma.payment.create({
    data: {
      amount: 16000,
      method: "BANK_TRANSFER",
      status: "COMPLETED",
      reference: "TRF-20841",
      paidAt: daysFromNow(-4, 11),
      invoiceId: paidInvoice.id,
      customerId: techstart.id,
      organizationId: org.id,
      recordedById: alex.id,
    },
  });

  const retainerInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-1042",
      status: "PAID",
      issueDate: daysFromNow(-8),
      dueDate: daysFromNow(2),
      subtotal: 6500,
      totalAmount: 6500,
      paidAmount: 6500,
      customerId: summit.id,
      organizationId: org.id,
      createdById: alex.id,
      lineItems: {
        create: [{ description: "SEO retainer — this month", quantity: 1, unitPrice: 6500, amount: 6500 }],
      },
    },
  });

  await prisma.payment.create({
    data: {
      amount: 6500,
      method: "STRIPE",
      status: "COMPLETED",
      reference: "ch_3Nx82k",
      paidAt: daysFromNow(-2, 15),
      invoiceId: retainerInvoice.id,
      customerId: summit.id,
      organizationId: org.id,
      recordedById: alex.id,
    },
  });

  const overdueInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-1038",
      status: "OVERDUE",
      issueDate: daysFromNow(-36),
      dueDate: daysFromNow(-6),
      subtotal: 12800,
      totalAmount: 12800,
      paidAmount: 0,
      customerId: greenleaf.id,
      organizationId: org.id,
      createdById: alex.id,
      lineItems: {
        create: [
          { description: "Brand identity — milestone 2 (concepts)", quantity: 1, unitPrice: 12800, amount: 12800 },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-1043",
      status: "SENT",
      issueDate: daysFromNow(-3),
      dueDate: daysFromNow(12),
      subtotal: 9000,
      totalAmount: 9000,
      paidAmount: 0,
      customerId: bluewave.id,
      organizationId: org.id,
      createdById: alex.id,
      lineItems: {
        create: [
          { description: "Q3 social campaign — strategy & concepts", quantity: 1, unitPrice: 9000, amount: 9000 },
        ],
      },
    },
  });

  // ── Expenses (this month) ─────────────────────────────────────────
  await Promise.all(
    [
      { description: "Studio rent", amount: 3800, category: "Rent", vendor: "Harbor Properties", days: -12 },
      { description: "Figma & Adobe licenses", amount: 412, category: "Software", vendor: "Figma / Adobe", days: -9 },
      { description: "Vercel + AWS hosting", amount: 286.4, category: "Technology", vendor: "Vercel / AWS", days: -6 },
      { description: "Freelance illustrator (GreenLeaf)", amount: 1500, category: "Contractors", vendor: "J. Okafor", days: -3 },
    ].map((e) =>
      prisma.expense.create({
        data: {
          description: e.description,
          amount: e.amount,
          category: e.category,
          vendor: e.vendor,
          date: daysFromNow(e.days),
          organizationId: org.id,
        },
      })
    )
  );

  // ── Activity feed ─────────────────────────────────────────────────
  const activities: {
    type: string;
    message: string;
    actorId?: string;
    hoursAgo: number;
  }[] = [
    { type: "TASK_COMPLETED", message: 'completed "Fix broken internal links"', actorId: marcus.id, hoursAgo: 8 },
    { type: "PAYMENT_RECEIVED", message: "recorded a $6,500 payment from Summit Financial (INV-1042)", actorId: alex.id, hoursAgo: 12 },
    { type: "TASK_STATUS", message: 'moved "Homepage hero design v2" to in review', actorId: priya.id, hoursAgo: 15 },
    { type: "NOTE", message: "GreenLeaf asked to push the retail launch review to Friday", actorId: sam.id, hoursAgo: 18 },
    { type: "TASK_STATUS", message: '"Ad creative set A" is blocked — waiting on BlueWave approval', actorId: elena.id, hoursAgo: 22 },
    { type: "TASK_COMPLETED", message: 'completed "Design system tokens"', actorId: priya.id, hoursAgo: 26 },
    { type: "INVOICE_SENT", message: "sent invoice INV-1043 ($9,000) to BlueWave Media", actorId: alex.id, hoursAgo: 30 },
    { type: "TASK_CREATED", message: 'created task "Monthly performance report" and assigned it to Elena Rodriguez', actorId: elena.id, hoursAgo: 34 },
    { type: "PROJECT_UPDATE", message: 'marked "GreenLeaf Brand Identity" as at risk — packaging vendor delay', actorId: priya.id, hoursAgo: 40 },
    { type: "TASK_COMPLETED", message: 'completed "August content calendar"', actorId: elena.id, hoursAgo: 50 },
    { type: "NOTE", message: "TechStart kickoff for milestone 2 went well; build phase starts Monday", actorId: sam.id, hoursAgo: 60 },
    { type: "PAYMENT_RECEIVED", message: "recorded a $16,000 payment from TechStart Inc (INV-1041)", actorId: alex.id, hoursAgo: 96 },
    { type: "TASK_COMPLETED", message: 'completed "Sitemap & IA workshop"', actorId: sam.id, hoursAgo: 96 },
    { type: "CLIENT_ADDED", message: "added BlueWave Media as a client", actorId: alex.id, hoursAgo: 340 },
  ];

  for (const a of activities) {
    await prisma.activity.create({
      data: {
        type: a.type,
        message: a.message,
        actorId: a.actorId,
        organizationId: org.id,
        createdAt: hoursAgo(a.hoursAgo),
      },
    });
  }

  // ── Reminders & workflows ─────────────────────────────────────────
  await prisma.reminder.create({
    data: {
      type: "PAYMENT_OVERDUE",
      message: "Invoice INV-1038 (GreenLeaf) is overdue — send follow-up",
      scheduledFor: daysFromNow(1, 9),
      invoiceId: overdueInvoice.id,
      organizationId: org.id,
    },
  });

  await prisma.workflow.create({
    data: {
      name: "Auto-Send Payment Reminders",
      description: "Automatically email clients when invoices go overdue",
      trigger: "INVOICE_OVERDUE",
      actions: JSON.stringify([
        { type: "SEND_EMAIL", config: { template: "payment_reminder" } },
        { type: "CREATE_NOTIFICATION", config: { title: "Invoice overdue" } },
      ]),
      isActive: true,
      organizationId: org.id,
    },
  });

  console.log("Agency demo data seeded!");
  console.log("\nLogin credentials:\n  Email: admin@agency.com\n  Password: password123");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
