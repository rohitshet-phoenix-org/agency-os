import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Organization
  const org = await prisma.organization.upsert({
    where: { slug: "phoenix-digital" },
    update: {},
    create: {
      name: "Phoenix Digital Agency",
      slug: "phoenix-digital",
      website: "https://phoenixdigital.com",
      timezone: "America/New_York",
    },
  });

  // Admin user
  const passwordHash = await bcrypt.hash("password123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@phoenixdigital.com" },
    update: {},
    create: {
      email: "admin@phoenixdigital.com",
      name: "Alex Admin",
      passwordHash,
    },
  });

  // Account manager
  const manager = await prisma.user.upsert({
    where: { email: "sarah@phoenixdigital.com" },
    update: {},
    create: {
      email: "sarah@phoenixdigital.com",
      name: "Sarah Manager",
      passwordHash,
    },
  });

  // Link users to org
  await prisma.organizationUser.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: admin.id } },
    update: {},
    create: { organizationId: org.id, userId: admin.id, role: "ADMIN" },
  });

  await prisma.organizationUser.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: manager.id } },
    update: {},
    create: { organizationId: org.id, userId: manager.id, role: "ACCOUNT_MANAGER" },
  });

  // Leads
  const lead1 = await prisma.lead.upsert({
    where: { id: "lead-techcorp-001" },
    update: {},
    create: {
      id: "lead-techcorp-001",
      organizationId: org.id,
      name: "John Smith",
      email: "john@techcorp.com",
      company: "TechCorp Inc",
      website: "https://techcorp.com",
      status: "QUALIFIED",
      source: "REFERRAL",
      score: 85,
      estimatedValue: 36000,
      notes: "Very interested in SEO + social media package",
    },
  });

  const lead2 = await prisma.lead.upsert({
    where: { id: "lead-ecomplus-001" },
    update: {},
    create: {
      id: "lead-ecomplus-001",
      organizationId: org.id,
      name: "Maria Garcia",
      email: "maria@ecomplus.io",
      company: "EcomPlus",
      status: "PROPOSAL_SENT",
      source: "INBOUND_ADS",
      score: 72,
      estimatedValue: 24000,
    },
  });

  await prisma.leadActivity.createMany({
    data: [
      { leadId: lead1.id, type: "call", title: "Discovery call", body: "Great fit for our full-service package", createdBy: admin.id },
      { leadId: lead1.id, type: "email", title: "Proposal sent", body: "Sent detailed proposal with pricing", createdBy: manager.id },
      { leadId: lead2.id, type: "meeting", title: "Intro meeting", body: "Client interested in email marketing", createdBy: admin.id },
    ],
    
  });

  // Clients
  const client1 = await prisma.client.upsert({
    where: { id: "client-acme-001" },
    update: {},
    create: {
      id: "client-acme-001",
      organizationId: org.id,
      name: "David Chen",
      email: "david@acmecorp.com",
      company: "Acme Corporation",
      website: "https://acmecorp.com",
      industry: "Technology",
      contractValue: 48000,
      billingCycle: "MONTHLY",
      portalPassword: passwordHash,
    },
  });

  const client2 = await prisma.client.upsert({
    where: { id: "client-bloom-001" },
    update: {},
    create: {
      id: "client-bloom-001",
      organizationId: org.id,
      name: "Lisa Wong",
      email: "lisa@bloomretail.com",
      company: "Bloom Retail",
      website: "https://bloomretail.com",
      industry: "Retail & E-commerce",
      contractValue: 30000,
      billingCycle: "MONTHLY",
      portalPassword: passwordHash,
    },
  });

  // Onboarding
  const onboarding1 = await prisma.onboarding.upsert({
    where: { clientId: client1.id },
    update: {},
    create: {
      clientId: client1.id,
      status: "COMPLETED",
      completedAt: new Date("2025-01-15"),
    },
  });

  await prisma.onboardingItem.createMany({
    data: [
      { onboardingId: onboarding1.id, title: "Brand assets upload", isCompleted: true, completedAt: new Date("2025-01-10"), order: 1 },
      { onboardingId: onboarding1.id, title: "Access credentials shared", isCompleted: true, completedAt: new Date("2025-01-12"), order: 2 },
      { onboardingId: onboarding1.id, title: "Kickoff call completed", isCompleted: true, completedAt: new Date("2025-01-15"), order: 3 },
      { onboardingId: onboarding1.id, title: "Strategy document approved", isCompleted: true, completedAt: new Date("2025-01-15"), order: 4 },
    ],
    
  });

  // Projects
  const project1 = await prisma.project.upsert({
    where: { id: "proj-acme-seo-001" },
    update: {},
    create: {
      id: "proj-acme-seo-001",
      organizationId: org.id,
      clientId: client1.id,
      name: "Acme SEO & Content Q1 2026",
      description: "Full SEO optimization and content marketing campaign",
      status: "ACTIVE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-31"),
    },
  });

  const project2 = await prisma.project.upsert({
    where: { id: "proj-bloom-social-001" },
    update: {},
    create: {
      id: "proj-bloom-social-001",
      organizationId: org.id,
      clientId: client2.id,
      name: "Bloom Social Media Management",
      description: "Instagram, Facebook and TikTok content and scheduling",
      status: "ACTIVE",
      startDate: new Date("2026-01-15"),
    },
  });

  // Tasks
  const task1 = await prisma.task.upsert({
    where: { id: "task-001" },
    update: {},
    create: {
      id: "task-001",
      projectId: project1.id,
      title: "Keyword research for blog content",
      description: "Research 50 target keywords for Q1 content calendar",
      status: "DONE",
      priority: "HIGH",
      assigneeId: manager.id,
      creatorId: admin.id,
      dueDate: new Date("2026-01-20"),
      estimatedHrs: 4,
      completedAt: new Date("2026-01-19"),
    },
  });

  const task2 = await prisma.task.upsert({
    where: { id: "task-002" },
    update: {},
    create: {
      id: "task-002",
      projectId: project1.id,
      title: "On-page SEO audit",
      description: "Audit all existing pages for technical SEO issues",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assigneeId: manager.id,
      creatorId: admin.id,
      dueDate: new Date("2026-02-01"),
      estimatedHrs: 8,
    },
  });

  const task3 = await prisma.task.upsert({
    where: { id: "task-003" },
    update: {},
    create: {
      id: "task-003",
      projectId: project2.id,
      title: "Create March content calendar",
      description: "Design and write captions for 30 posts",
      status: "TODO",
      priority: "MEDIUM",
      assigneeId: manager.id,
      creatorId: admin.id,
      dueDate: new Date("2026-02-25"),
      estimatedHrs: 6,
    },
  });

  // Comments
  await prisma.comment.createMany({
    data: [
      { taskId: task1.id, userId: manager.id, body: "Found 52 great keywords — uploading to shared sheet" },
      { taskId: task1.id, userId: admin.id, body: "Excellent work! Make sure to include long-tail keywords." },
      { taskId: task2.id, userId: manager.id, body: "Starting with the top 10 pages by traffic first" },
    ],
    
  });

  // Analytics integrations
  const integration1 = await prisma.analyticsIntegration.upsert({
    where: { clientId_platform_accountId: { clientId: client1.id, platform: "ga4", accountId: "GA4-ACME-001" } },
    update: {},
    create: {
      clientId: client1.id,
      platform: "ga4",
      accountId: "GA4-ACME-001",
      isActive: true,
    },
  });

  // Metric snapshots
  const dates = ["2026-01-01", "2026-02-01", "2026-03-01"];
  for (const d of dates) {
    await prisma.metricSnapshot.upsert({
      where: { integrationId_date_metric: { integrationId: integration1.id, date: new Date(d), metric: "sessions" } },
      update: {},
      create: { integrationId: integration1.id, date: new Date(d), metric: "sessions", value: Math.floor(Math.random() * 5000) + 8000 },
    });
    await prisma.metricSnapshot.upsert({
      where: { integrationId_date_metric: { integrationId: integration1.id, date: new Date(d), metric: "conversions" } },
      update: {},
      create: { integrationId: integration1.id, date: new Date(d), metric: "conversions", value: Math.floor(Math.random() * 100) + 150 },
    });
  }

  // Report template
  const template = await prisma.reportTemplate.upsert({
    where: { id: "tmpl-monthly-001" },
    update: {},
    create: {
      id: "tmpl-monthly-001",
      organizationId: org.id,
      name: "Monthly Performance Report",
      config: JSON.stringify({ sections: ["traffic", "conversions", "social", "seo", "ads"], charts: ["line", "bar", "pie"] }),
      isDefault: true,
    },
  });

  // Social accounts
  const socialAcct = await prisma.socialAccount.upsert({
    where: { organizationId_platform_accountId: { organizationId: org.id, platform: "INSTAGRAM", accountId: "ig-bloom-001" } },
    update: {},
    create: {
      organizationId: org.id,
      clientId: client2.id,
      platform: "INSTAGRAM",
      accountId: "ig-bloom-001",
      accountName: "@bloomretail",
      isActive: true,
    },
  });

  // Social posts
  await prisma.socialPost.upsert({
    where: { id: "post-001" },
    update: {},
    create: {
      id: "post-001",
      socialAccountId: socialAcct.id,
      caption: "Spring collection is here! 🌸 Shop our latest arrivals. Link in bio.",
      mediaUrls: JSON.stringify(["https://cdn.bloomretail.com/spring-2026.jpg"]),
      hashtags: JSON.stringify(["#spring2026", "#fashion", "#bloomretail", "#newcollection"]),
      status: "PUBLISHED",
      scheduledAt: new Date("2026-03-01T10:00:00Z"),
      publishedAt: new Date("2026-03-01T10:00:05Z"),
    },
  });

  await prisma.socialPost.upsert({
    where: { id: "post-002" },
    update: {},
    create: {
      id: "post-002",
      socialAccountId: socialAcct.id,
      caption: "Behind the scenes: how we design our collections 🎨",
      mediaUrls: JSON.stringify(["https://cdn.bloomretail.com/bts-march.jpg"]),
      hashtags: JSON.stringify(["#behindthescenes", "#bloomretail", "#design"]),
      status: "SCHEDULED",
      scheduledAt: new Date("2026-03-25T14:00:00Z"),
    },
  });

  // Email list
  const emailList = await prisma.emailList.upsert({
    where: { id: "list-acme-newsletter" },
    update: {},
    create: {
      id: "list-acme-newsletter",
      organizationId: org.id,
      clientId: client1.id,
      name: "Acme Newsletter Subscribers",
      description: "Main newsletter list",
    },
  });

  await prisma.emailSubscriber.createMany({
    data: [
      { listId: emailList.id, email: "user1@example.com", firstName: "Alice", lastName: "Brown", tags: JSON.stringify(["customer", "vip"]) },
      { listId: emailList.id, email: "user2@example.com", firstName: "Bob", lastName: "Davis", tags: JSON.stringify(["prospect"]) },
      { listId: emailList.id, email: "user3@example.com", firstName: "Carol", lastName: "Evans", tags: JSON.stringify(["customer"]) },
    ],
    
  });

  const campaign = await prisma.emailCampaign.upsert({
    where: { id: "camp-march-newsletter" },
    update: {},
    create: {
      id: "camp-march-newsletter",
      organizationId: org.id,
      listId: emailList.id,
      name: "March Newsletter",
      subject: "March Updates from Acme Corporation",
      htmlBody: "<h1>March Updates</h1><p>Here is what happened this month...</p>",
      status: "COMPLETED",
      sentAt: new Date("2026-03-01"),
      totalSent: 3,
      totalOpened: 2,
      totalClicked: 1,
    },
  });

  // SEO project
  const seoProject = await prisma.seoProject.upsert({
    where: { organizationId_clientId_domain: { organizationId: org.id, clientId: client1.id, domain: "acmecorp.com" } },
    update: {},
    create: {
      organizationId: org.id,
      clientId: client1.id,
      domain: "acmecorp.com",
    },
  });

  const keyword1 = await prisma.seoKeyword.upsert({
    where: { seoProjectId_keyword_country: { seoProjectId: seoProject.id, keyword: "crm software", country: "US" } },
    update: {},
    create: { seoProjectId: seoProject.id, keyword: "crm software", targetUrl: "https://acmecorp.com/crm", country: "US" },
  });

  const keyword2 = await prisma.seoKeyword.upsert({
    where: { seoProjectId_keyword_country: { seoProjectId: seoProject.id, keyword: "project management tool", country: "US" } },
    update: {},
    create: { seoProjectId: seoProject.id, keyword: "project management tool", targetUrl: "https://acmecorp.com/pm", country: "US" },
  });

  await prisma.keywordRanking.createMany({
    data: [
      { keywordId: keyword1.id, position: 14, searchVolume: 22000, date: new Date("2026-01-01") },
      { keywordId: keyword1.id, position: 11, searchVolume: 22000, date: new Date("2026-02-01") },
      { keywordId: keyword1.id, position: 8, searchVolume: 22000, date: new Date("2026-03-01") },
      { keywordId: keyword2.id, position: 22, searchVolume: 18000, date: new Date("2026-01-01") },
      { keywordId: keyword2.id, position: 18, searchVolume: 18000, date: new Date("2026-02-01") },
      { keywordId: keyword2.id, position: 15, searchVolume: 18000, date: new Date("2026-03-01") },
    ],
    
  });

  // Ad account
  const adAccount = await prisma.adAccount.upsert({
    where: { organizationId_platform_accountId: { organizationId: org.id, platform: "GOOGLE_ADS", accountId: "gads-acme-001" } },
    update: {},
    create: {
      organizationId: org.id,
      clientId: client1.id,
      platform: "GOOGLE_ADS",
      accountId: "gads-acme-001",
      accountName: "Acme Google Ads",
      currency: "USD",
      isActive: true,
    },
  });

  const adCampaign = await prisma.adCampaign.upsert({
    where: { adAccountId_externalId: { adAccountId: adAccount.id, externalId: "camp-google-001" } },
    update: {},
    create: {
      adAccountId: adAccount.id,
      externalId: "camp-google-001",
      name: "Acme Brand Awareness Q1",
      status: "active",
      objective: "brand_awareness",
      dailyBudget: 200,
      totalBudget: 18000,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-31"),
    },
  });

  await prisma.adMetric.createMany({
    data: [
      { campaignId: adCampaign.id, date: new Date("2026-01-15"), impressions: 45000, clicks: 1200, spend: 890, conversions: 32, revenue: 4800, roas: 5.4 },
      { campaignId: adCampaign.id, date: new Date("2026-02-15"), impressions: 52000, clicks: 1450, spend: 1050, conversions: 41, revenue: 6200, roas: 5.9 },
      { campaignId: adCampaign.id, date: new Date("2026-03-15"), impressions: 61000, clicks: 1780, spend: 1200, conversions: 55, revenue: 8100, roas: 6.75 },
    ],
    
  });

  // Billing
  const invoice1 = await prisma.invoice.upsert({
    where: { number: "INV-2026-001" },
    update: {},
    create: {
      organizationId: org.id,
      clientId: client1.id,
      number: "INV-2026-001",
      status: "PAID",
      subtotal: 4000,
      tax: 400,
      total: 4400,
      dueDate: new Date("2026-01-31"),
      paidAt: new Date("2026-01-28"),
    },
  });

  await prisma.invoiceLineItem.createMany({
    data: [
      { invoiceId: invoice1.id, description: "SEO Services - January 2026", quantity: 1, unitPrice: 2500, total: 2500 },
      { invoiceId: invoice1.id, description: "Content Marketing - January 2026", quantity: 1, unitPrice: 1500, total: 1500 },
    ],
    
  });

  await prisma.payment.upsert({
    where: { id: "pay-001" },
    update: {},
    create: {
      id: "pay-001",
      invoiceId: invoice1.id,
      amount: 4400,
      method: "bank_transfer",
      reference: "TXN-2026-001",
      paidAt: new Date("2026-01-28"),
    },
  });

  const invoice2 = await prisma.invoice.upsert({
    where: { number: "INV-2026-002" },
    update: {},
    create: {
      organizationId: org.id,
      clientId: client2.id,
      number: "INV-2026-002",
      status: "SENT",
      subtotal: 2500,
      tax: 250,
      total: 2750,
      dueDate: new Date("2026-03-31"),
    },
  });

  await prisma.invoiceLineItem.createMany({
    data: [
      { invoiceId: invoice2.id, description: "Social Media Management - March 2026", quantity: 1, unitPrice: 2500, total: 2500 },
    ],
    
  });

  // Subscriptions
  await prisma.subscription.upsert({
    where: { clientId: client1.id },
    update: {},
    create: {
      clientId: client1.id,
      planName: "Growth Package",
      amount: 4000,
      billingCycle: "MONTHLY",
      nextBillingAt: new Date("2026-04-01"),
      isActive: true,
    },
  });

  await prisma.subscription.upsert({
    where: { clientId: client2.id },
    update: {},
    create: {
      clientId: client2.id,
      planName: "Starter Package",
      amount: 2500,
      billingCycle: "MONTHLY",
      nextBillingAt: new Date("2026-04-01"),
      isActive: true,
    },
  });

  // Approvals
  await prisma.approval.upsert({
    where: { id: "approval-001" },
    update: {},
    create: {
      id: "approval-001",
      clientId: client2.id,
      title: "March Social Media Calendar",
      description: "30 posts for Instagram and Facebook — March 2026",
      type: "social_post",
      status: "APPROVED",
      reviewedAt: new Date("2026-02-20"),
    },
  });

  await prisma.approval.upsert({
    where: { id: "approval-002" },
    update: {},
    create: {
      id: "approval-002",
      clientId: client1.id,
      title: "Q1 Strategy Deck",
      description: "Full strategy presentation for Q1 2026",
      type: "strategy",
      status: "PENDING",
      dueDate: new Date("2026-03-30"),
    },
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      { userId: admin.id, type: "TASK_DUE", title: "Task due tomorrow", body: "On-page SEO audit is due on Feb 1", link: `/tasks/task-002` },
      { userId: admin.id, type: "REPORT_READY", title: "Monthly report generated", body: "March report for Acme is ready", link: `/reports` },
      { userId: manager.id, type: "APPROVAL_NEEDED", title: "Approval needed", body: "Q1 Strategy Deck awaiting review", link: `/approvals/approval-002` },
    ],
    
  });

  // Webhook
  await prisma.webhook.upsert({
    where: { id: "webhook-001" },
    update: {},
    create: {
      id: "webhook-001",
      organizationId: org.id,
      url: "https://hooks.example.com/agency-os",
      events: JSON.stringify(["lead.created", "invoice.paid", "task.completed"]),
      secret: "whsec_test_secret_key_abc123",
      isActive: true,
    },
  });

  console.log("✅ Seed complete!");
  console.log(`   Org: ${org.name} (${org.slug})`);
  console.log(`   Admin: admin@phoenixdigital.com / password123`);
  console.log(`   Users: 2, Clients: 2, Projects: 2, Tasks: 3`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
