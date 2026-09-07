import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const syngenta = await prisma.company.upsert({
    where: { name: "Syngenta" },
    create: { name: "Syngenta", industry: "Agritech", location: "Pune" },
    update: {},
  });
  const bharatAgro = await prisma.company.upsert({
    where: { name: "Bharat Agro Retail" },
    create: { name: "Bharat Agro Retail", industry: "Agri retail", location: "Nagpur" },
    update: {},
  });

  const pexalon = await prisma.campaign.upsert({
    where: { name: "Pexalon" },
    create: { name: "Pexalon", client: "Syngenta", status: "ACTIVE", notes: "Full-funnel CRM tracking from day one." },
    update: {},
  });
  const tejPage = await prisma.campaign.upsert({
    where: { name: "Tej/Page AI Chatbot" },
    create: { name: "Tej/Page AI Chatbot", client: "Syngenta", status: "ACTIVE" },
    update: {},
  });
  const segways = await prisma.campaign.upsert({
    where: { name: "Segways" },
    create: { name: "Segways", client: "Syngenta", status: "PAUSED" },
    update: {},
  });

  const seedContacts = [
    { firstName: "Asha", lastName: "Patel", email: "asha.patel@example.com", phone: "+91 9812340001", status: "QUALIFIED", source: "chatbot", campaignId: tejPage.id, companyId: bharatAgro.id, customData: JSON.stringify({ crop: "cotton", district: "Nagpur" }) },
    { firstName: "Ravi", lastName: "Deshmukh", email: "ravi.d@example.com", phone: "+91 9812340002", status: "NEW", source: "landing-page", campaignId: pexalon.id },
    { firstName: "Meera", lastName: "Iyer", email: "meera.iyer@example.com", status: "CONTACTED", source: "csv-import", campaignId: pexalon.id },
    { firstName: "Snehal", lastName: "Kulkarni", email: "snehal.k@syngenta-example.com", title: "Marketing Lead", status: "CUSTOMER", source: "manual", companyId: syngenta.id, campaignId: pexalon.id },
    { firstName: "Vikram", lastName: "Rao", email: "vikram.rao@example.com", phone: "+91 9812340005", status: "NEW", source: "lucky-draw", campaignId: segways.id },
    { firstName: "Priya", lastName: "Nair", email: "priya.nair@example.com", status: "LOST", source: "chatbot", campaignId: tejPage.id },
  ];

  for (const c of seedContacts) {
    await prisma.contact.upsert({ where: { email: c.email }, create: c, update: {} });
  }

  const snehal = await prisma.contact.findUnique({ where: { email: "snehal.k@syngenta-example.com" } });
  const asha = await prisma.contact.findUnique({ where: { email: "asha.patel@example.com" } });

  if ((await prisma.deal.count()) === 0) {
    await prisma.deal.createMany({
      data: [
        { title: "Pexalon retainer renewal", value: 450000, stage: "NEGOTIATION", contactId: snehal?.id, companyId: syngenta.id, campaignId: pexalon.id },
        { title: "Lucky draw backend build", value: 300000, stage: "WON", companyId: syngenta.id, campaignId: segways.id },
        { title: "Root Scan QR rollout — phase 2", value: 250000, stage: "PROPOSAL", companyId: syngenta.id },
        { title: "Bharat Agro dealer activation", value: 120000, stage: "LEAD_IN", contactId: asha?.id, companyId: bharatAgro.id, campaignId: tejPage.id },
      ],
    });
  }

  if ((await prisma.activity.count()) === 0 && snehal && asha) {
    await prisma.activity.createMany({
      data: [
        { type: "MEETING", content: "Kickoff review — client wants full CRM tracking from day one to end of funnel.", contactId: snehal.id },
        { type: "TASK", content: "Reconcile pending retainer invoices (Jan–Mar) and share new invoice structure.", contactId: snehal.id, dueAt: new Date(Date.now() + 3 * 24 * 3600 * 1000) },
        { type: "CALL", content: "Asked about nematode detection accuracy; shared Root Scan demo link.", contactId: asha.id },
      ],
    });
  }

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
