import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Prospective client companies
  const companies = Object.fromEntries(
    await Promise.all(
      (
        [
          { name: "UrbanKart", domain: "urbankart.example", industry: "D2C e-commerce", location: "Bengaluru" },
          { name: "GreenLeaf Organics", domain: "greenleaf.example", industry: "FMCG / Organic foods", location: "Mumbai" },
          { name: "FinEdge", domain: "finedge.example", industry: "Fintech", location: "Gurugram" },
          { name: "AgroSpark", domain: "agrospark.example", industry: "Agritech", location: "Pune" },
          { name: "NimbusStay", domain: "nimbusstay.example", industry: "Travel / Hospitality", location: "Goa" },
        ] as const
      ).map(async (c) => [c.name, await prisma.company.upsert({ where: { name: c.name }, create: c, update: {} })])
    )
  );

  // Outreach campaigns (channels/pushes), `client` = target segment
  const coldEmail = await prisma.campaign.upsert({
    where: { name: "Cold email — D2C founders Q4" },
    create: {
      name: "Cold email — D2C founders Q4",
      client: "D2C brands, ₹5Cr+ revenue",
      status: "ACTIVE",
      notes: "Apollo list, 3-step sequence pitching performance marketing + AI chatbots.",
    },
    update: {},
  });
  const linkedin = await prisma.campaign.upsert({
    where: { name: "LinkedIn — agritech & fintech CMOs" },
    create: {
      name: "LinkedIn — agritech & fintech CMOs",
      client: "CMOs / growth heads",
      status: "ACTIVE",
    },
    update: {},
  });
  const referrals = await prisma.campaign.upsert({
    where: { name: "Referral follow-ups" },
    create: { name: "Referral follow-ups", client: "Warm intros from existing clients", status: "ACTIVE" },
    update: {},
  });

  const seedContacts = [
    { firstName: "Rohan", lastName: "Mehta", email: "rohan@urbankart.example", phone: "+91 9812340001", title: "Founder", status: "REPLIED", source: "apollo", campaignId: coldEmail.id, companyId: companies["UrbanKart"].id, customData: JSON.stringify({ industry: "D2C", employees: "51-200", monthlyAdSpend: "₹40L" }) },
    { firstName: "Kavya", lastName: "Sharma", email: "kavya@greenleaf.example", title: "CMO", status: "MEETING_BOOKED", source: "referral", campaignId: referrals.id, companyId: companies["GreenLeaf Organics"].id, phone: "+91 9812340002" },
    { firstName: "Arjun", lastName: "Bansal", email: "arjun@finedge.example", title: "Head of Growth", status: "CONTACTED", source: "linkedin", campaignId: linkedin.id, companyId: companies["FinEdge"].id },
    { firstName: "Neha", lastName: "Kulkarni", email: "neha@agrospark.example", title: "Co-founder", status: "CONTACTED", source: "linkedin", campaignId: linkedin.id, companyId: companies["AgroSpark"].id },
    { firstName: "Dev", lastName: "Pillai", email: "dev@nimbusstay.example", title: "CEO", status: "PROSPECT", source: "apollo", campaignId: coldEmail.id, companyId: companies["NimbusStay"].id },
    { firstName: "Ishita", lastName: "Rao", email: "ishita.rao@example.com", title: "Marketing Director", status: "CLIENT", source: "referral", campaignId: referrals.id, companyId: companies["GreenLeaf Organics"].id },
    { firstName: "Sameer", lastName: "Joshi", email: "sameer.j@example.com", title: "Founder", status: "NOT_INTERESTED", source: "apollo", campaignId: coldEmail.id },
  ];

  for (const c of seedContacts) {
    await prisma.contact.upsert({ where: { email: c.email }, create: c, update: c });
  }

  const rohan = await prisma.contact.findUnique({ where: { email: "rohan@urbankart.example" } });
  const kavya = await prisma.contact.findUnique({ where: { email: "kavya@greenleaf.example" } });
  const arjun = await prisma.contact.findUnique({ where: { email: "arjun@finedge.example" } });

  if ((await prisma.deal.count()) === 0 && rohan && kavya) {
    await prisma.deal.createMany({
      data: [
        { title: "UrbanKart — performance marketing retainer", value: 600000, stage: "PROPOSAL", contactId: rohan.id, companyId: companies["UrbanKart"].id, campaignId: coldEmail.id },
        { title: "GreenLeaf — brand campaign + AI chatbot", value: 850000, stage: "QUALIFIED", contactId: kavya.id, companyId: companies["GreenLeaf Organics"].id, campaignId: referrals.id },
        { title: "GreenLeaf — festive campaign (won)", value: 450000, stage: "WON", companyId: companies["GreenLeaf Organics"].id, campaignId: referrals.id },
        { title: "FinEdge — growth marketing pilot", value: 300000, stage: "LEAD_IN", contactId: arjun?.id, companyId: companies["FinEdge"].id, campaignId: linkedin.id },
      ],
    });
  }

  if ((await prisma.activity.count()) === 0 && rohan && kavya && arjun) {
    await prisma.activity.createMany({
      data: [
        { type: "EMAIL", content: "Sent step 1 of cold sequence — D2C case study angle.", contactId: rohan.id },
        { type: "EMAIL", content: "Rohan replied: interested, asked for pricing ranges and a relevant case study.", contactId: rohan.id },
        { type: "TASK", content: "Send UrbanKart proposal follow-up with D2C case study", contactId: rohan.id, dueAt: new Date(Date.now() + 24 * 3600 * 1000) },
        { type: "MEETING", content: "Intro call booked for Thursday — Kavya + their brand manager. Agenda: festive campaign + always-on chatbot.", contactId: kavya.id },
        { type: "LINKEDIN", content: "Connected with Arjun, sent opener referencing their Series B announcement.", contactId: arjun.id },
      ],
    });
  }

  if ((await prisma.automation.count()) === 0) {
    await prisma.automation.createMany({
      data: [
        {
          name: "New apollo prospects → first-touch task",
          trigger: "CONTACT_CREATED",
          conditions: JSON.stringify({ source: "apollo" }),
          actions: JSON.stringify([
            { type: "ADD_TAG", value: "cold-outreach" },
            { type: "CREATE_TASK", value: "Send personalised first outreach email" },
          ]),
        },
        {
          name: "Prospect replied → book the intro call",
          trigger: "STATUS_CHANGED",
          conditions: JSON.stringify({ status: "REPLIED" }),
          actions: JSON.stringify([
            { type: "ADD_TAG", value: "hot" },
            { type: "CREATE_TASK", value: "Reply within 4 hours and propose two intro-call slots" },
          ]),
        },
        {
          name: "Meeting booked → open a pitch",
          trigger: "STATUS_CHANGED",
          conditions: JSON.stringify({ status: "MEETING_BOOKED" }),
          actions: JSON.stringify([{ type: "CREATE_DEAL", title: "New-business pitch", value: 300000 }]),
        },
      ],
    });
  }

  // Backfill prospect scores
  const { heuristicScore } = await import("../src/lib/scoring");
  const allContacts = await prisma.contact.findMany({ include: { deals: true, activities: true } });
  for (const contact of allContacts) {
    const { score, reason } = heuristicScore(contact);
    await prisma.contact.update({ where: { id: contact.id }, data: { score, scoreReason: reason } });
  }

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
