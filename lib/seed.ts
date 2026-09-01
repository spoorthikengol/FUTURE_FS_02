import bcrypt from "bcryptjs";
import { FollowUp } from "@/models/FollowUp";
import { Activity } from "@/models/Activity";
import { Lead } from "@/models/Lead";
import { Note } from "@/models/Note";
import { Settings } from "@/models/Settings";
import { User } from "@/models/User";
import type { LeadPriority, LeadSource, LeadStatus } from "@/types/crm";

let seeded = false;

type SeedLead = {
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  message: string;
  source: LeadSource;
  status: LeadStatus;
  value: number;
  priority: LeadPriority;
  daysAgo: number;
  lastContactDaysAgo: number | null;
  followUpInDays: number | null;
  notes: string[];
  followUps: { offsetDays: number; time: string; description: string; completed?: boolean }[];
};

const DEMO_LEADS: SeedLead[] = [
  {
    name: "Sarah Johnson",
    email: "sarah.johnson@acmetech.com",
    phone: "+1 (415) 555-0142",
    company: "Acme Technologies",
    jobTitle: "VP of Operations",
    message: "We are evaluating a CRM to replace spreadsheets for a 40-person sales team.",
    source: "LinkedIn",
    status: "QUALIFIED",
    value: 48000,
    priority: "HIGH",
    daysAgo: 18,
    lastContactDaysAgo: 2,
    followUpInDays: 1,
    notes: [
      "Discovery call went well. They need pipeline visibility and reporting.",
      "Budget approved for Q3 if we can demo integrations.",
    ],
    followUps: [
      { offsetDays: 1, time: "10:00", description: "Product demo with ops and sales leads" },
    ],
  },
  {
    name: "Daniel Cho",
    email: "dcho@novasystems.io",
    phone: "+1 (206) 555-0198",
    company: "Nova Systems",
    jobTitle: "Head of Growth",
    message: "Need better lead scoring and follow-up reminders for inbound campaigns.",
    source: "Website",
    status: "PROPOSAL",
    value: 72000,
    priority: "URGENT",
    daysAgo: 32,
    lastContactDaysAgo: 1,
    followUpInDays: 0,
    notes: ["Sent proposal for Growth plan. Waiting on legal review."],
    followUps: [{ offsetDays: 0, time: "15:30", description: "Proposal follow-up call" }],
  },
  {
    name: "Amelia Wright",
    email: "amelia@vertexlabs.co",
    phone: "+1 (512) 555-0110",
    company: "Vertex Labs",
    jobTitle: "Founder",
    message: "Looking for a lightweight CRM with AI summaries for a seed-stage team.",
    source: "Referral",
    status: "CONTACTED",
    value: 18000,
    priority: "MEDIUM",
    daysAgo: 7,
    lastContactDaysAgo: 4,
    followUpInDays: 2,
    notes: ["Introduced by Marcus at Harbor & Co."],
    followUps: [{ offsetDays: 2, time: "11:00", description: "Share starter plan pricing" }],
  },
  {
    name: "Priya Raman",
    email: "priya.raman@brightedge.com",
    phone: "+1 (646) 555-0177",
    company: "BrightEdge",
    jobTitle: "Revenue Operations Manager",
    message: "Current tool is noisy. We want cleaner analytics and source attribution.",
    source: "Google",
    status: "CONVERTED",
    value: 96000,
    priority: "HIGH",
    daysAgo: 64,
    lastContactDaysAgo: 9,
    followUpInDays: null,
    notes: ["Closed annual contract. Onboarding scheduled."],
    followUps: [
      {
        offsetDays: -9,
        time: "09:00",
        description: "Kickoff call",
        completed: true,
      },
    ],
  },
  {
    name: "Marcus Hale",
    email: "mhale@cloudnest.app",
    phone: "+1 (303) 555-0124",
    company: "CloudNest",
    jobTitle: "Sales Director",
    message: "Need Kanban pipeline and mobile-friendly follow-ups.",
    source: "Instagram",
    status: "NEW",
    value: 24000,
    priority: "MEDIUM",
    daysAgo: 1,
    lastContactDaysAgo: null,
    followUpInDays: 3,
    notes: [],
    followUps: [{ offsetDays: 3, time: "14:00", description: "Intro call" }],
  },
  {
    name: "Elena Vasquez",
    email: "elena@orbitsolutions.com",
    phone: "+1 (617) 555-0183",
    company: "Orbit Solutions",
    jobTitle: "Chief Commercial Officer",
    message: "Enterprise evaluation. Security review required before procurement.",
    source: "Referral",
    status: "PROPOSAL",
    value: 140000,
    priority: "URGENT",
    daysAgo: 41,
    lastContactDaysAgo: 3,
    followUpInDays: 4,
    notes: ["Security questionnaire completed. Legal is reviewing DPA."],
    followUps: [{ offsetDays: 4, time: "16:00", description: "Procurement checkpoint" }],
  },
  {
    name: "Noah Patel",
    email: "noah@luminahealth.org",
    phone: "+1 (312) 555-0108",
    company: "Lumina Health",
    jobTitle: "Partnerships Lead",
    message: "Exploring CRM for clinic partnership pipeline.",
    source: "Website",
    status: "QUALIFIED",
    value: 36000,
    priority: "HIGH",
    daysAgo: 21,
    lastContactDaysAgo: 5,
    followUpInDays: 1,
    notes: ["HIPAA discussion needed before close."],
    followUps: [{ offsetDays: 1, time: "13:00", description: "Compliance walkthrough" }],
  },
  {
    name: "Grace Kim",
    email: "grace.kim@peakline.io",
    phone: "+1 (503) 555-0166",
    company: "Peakline Logistics",
    jobTitle: "COO",
    message: "We generate 200+ inbound leads monthly and lose track of follow-ups.",
    source: "Google",
    status: "CONTACTED",
    value: 54000,
    priority: "HIGH",
    daysAgo: 11,
    lastContactDaysAgo: 6,
    followUpInDays: -1,
    notes: ["Requested a sample activity timeline."],
    followUps: [{ offsetDays: -1, time: "09:30", description: "Send case study" }],
  },
  {
    name: "James Okonkwo",
    email: "james@harborandco.com",
    phone: "+1 (212) 555-0190",
    company: "Harbor & Co",
    jobTitle: "Managing Partner",
    message: "Boutique consultancy. Need a simple but premium-looking CRM.",
    source: "LinkedIn",
    status: "CONVERTED",
    value: 28000,
    priority: "MEDIUM",
    daysAgo: 88,
    lastContactDaysAgo: 20,
    followUpInDays: null,
    notes: ["Referred Vertex Labs after a successful onboarding."],
    followUps: [],
  },
  {
    name: "Sofia Berg",
    email: "sofia@quantify.ai",
    phone: "+1 (650) 555-0133",
    company: "Quantify AI",
    jobTitle: "GTM Lead",
    message: "Interested in AI insights layered on our existing pipeline process.",
    source: "Website",
    status: "NEW",
    value: 41000,
    priority: "HIGH",
    daysAgo: 0,
    lastContactDaysAgo: null,
    followUpInDays: 2,
    notes: [],
    followUps: [{ offsetDays: 2, time: "10:30", description: "Qualify use case" }],
  },
  {
    name: "Liam O'Connor",
    email: "liam@northwindretail.com",
    phone: "+1 (617) 555-0144",
    company: "Northwind Retail",
    jobTitle: "Ecommerce Director",
    message: "Seasonal campaign tracking is a mess. Need ROI by source.",
    source: "Instagram",
    status: "LOST",
    value: 19000,
    priority: "LOW",
    daysAgo: 50,
    lastContactDaysAgo: 30,
    followUpInDays: null,
    notes: ["Went with an existing Shopify-native tool. Revisit next year."],
    followUps: [],
  },
  {
    name: "Hannah Lee",
    email: "hannah@pulsemedia.co",
    phone: "+1 (323) 555-0171",
    company: "Pulse Media",
    jobTitle: "Account Director",
    message: "Agency needs a shared pipeline across 6 account managers.",
    source: "Referral",
    status: "CONTACTED",
    value: 33000,
    priority: "MEDIUM",
    daysAgo: 9,
    lastContactDaysAgo: 2,
    followUpInDays: 5,
    notes: ["Asked about seats and permissions."],
    followUps: [{ offsetDays: 5, time: "12:00", description: "Team trial setup" }],
  },
  {
    name: "Owen Brooks",
    email: "owen@helixbio.com",
    phone: "+1 (858) 555-0129",
    company: "Helix Bio",
    jobTitle: "Business Development",
    message: "Need follow-up discipline for conference leads.",
    source: "Other",
    status: "QUALIFIED",
    value: 67000,
    priority: "HIGH",
    daysAgo: 15,
    lastContactDaysAgo: 1,
    followUpInDays: 6,
    notes: ["Met at BioInvest. Strong intent, longer sales cycle."],
    followUps: [{ offsetDays: 6, time: "11:30", description: "Share security overview" }],
  },
  {
    name: "Maya Chen",
    email: "maya@stackyard.dev",
    phone: "+1 (415) 555-0188",
    company: "Stackyard",
    jobTitle: "CEO",
    message: "We want AI-generated follow-up emails that still sound human.",
    source: "LinkedIn",
    status: "PROPOSAL",
    value: 22000,
    priority: "MEDIUM",
    daysAgo: 27,
    lastContactDaysAgo: 4,
    followUpInDays: 2,
    notes: ["Liked the email generator demo."],
    followUps: [{ offsetDays: 2, time: "16:30", description: "Close starter plan" }],
  },
  {
    name: "Theo Laurent",
    email: "theo@riverbank.finance",
    phone: "+1 (212) 555-0155",
    company: "Riverbank Finance",
    jobTitle: "Client Success Lead",
    message: "Evaluating CRM for wealth advisor lead intake.",
    source: "Google",
    status: "NEW",
    value: 88000,
    priority: "HIGH",
    daysAgo: 3,
    lastContactDaysAgo: null,
    followUpInDays: 1,
    notes: [],
    followUps: [{ offsetDays: 1, time: "09:15", description: "Compliance intro" }],
  },
  {
    name: "Isla Moreau",
    email: "isla@atlasenergy.com",
    phone: "+1 (713) 555-0119",
    company: "Atlas Energy",
    jobTitle: "Commercial Manager",
    message: "Need pipeline reporting for regional sales managers.",
    source: "Website",
    status: "CONTACTED",
    value: 51000,
    priority: "MEDIUM",
    daysAgo: 13,
    lastContactDaysAgo: 8,
    followUpInDays: -2,
    notes: ["Requested Excel export. Explained analytics dashboards instead."],
    followUps: [{ offsetDays: -2, time: "14:45", description: "Overdue: send dashboard walkthrough" }],
  },
  {
    name: "Kai Nakamura",
    email: "kai@emberstudio.co",
    phone: "+1 (206) 555-0160",
    company: "Ember Studio",
    jobTitle: "Producer",
    message: "Creative studio with bursty inbound. Need priority flags.",
    source: "Instagram",
    status: "NEW",
    value: 12000,
    priority: "LOW",
    daysAgo: 5,
    lastContactDaysAgo: null,
    followUpInDays: 7,
    notes: [],
    followUps: [{ offsetDays: 7, time: "17:00", description: "Low-priority check-in" }],
  },
  {
    name: "Chloe Nguyen",
    email: "chloe@kiteandco.com",
    phone: "+1 (415) 555-0102",
    company: "Kite & Co",
    jobTitle: "Head of Sales",
    message: "We outgrew Airtable. Need conversion funnel reporting.",
    source: "Referral",
    status: "CONVERTED",
    value: 45000,
    priority: "HIGH",
    daysAgo: 110,
    lastContactDaysAgo: 14,
    followUpInDays: null,
    notes: ["Expansion conversation for extra seats next quarter."],
    followUps: [
      { offsetDays: -14, time: "10:00", description: "QBR", completed: true },
    ],
  },
  {
    name: "Benito Alvarez",
    email: "benito@solargrid.energy",
    phone: "+1 (480) 555-0181",
    company: "Solargrid",
    jobTitle: "Sales Ops",
    message: "Field team needs follow-up dates that actually get used.",
    source: "Google",
    status: "QUALIFIED",
    value: 39000,
    priority: "MEDIUM",
    daysAgo: 19,
    lastContactDaysAgo: 3,
    followUpInDays: 3,
    notes: ["Interested in mobile layout and reminders."],
    followUps: [{ offsetDays: 3, time: "08:45", description: "Field team demo" }],
  },
  {
    name: "Ava Singh",
    email: "ava@nimbusapps.io",
    phone: "+1 (917) 555-0149",
    company: "Nimbus Apps",
    jobTitle: "Founder",
    message: "Pre-seed. Price-sensitive but loves the AI assistant concept.",
    source: "Website",
    status: "CONTACTED",
    value: 9000,
    priority: "LOW",
    daysAgo: 6,
    lastContactDaysAgo: 1,
    followUpInDays: 4,
    notes: ["Wants a founder discount. Keep warm."],
    followUps: [{ offsetDays: 4, time: "13:15", description: "Share startup plan" }],
  },
  {
    name: "Henry Walsh",
    email: "henry@acmetech.com",
    phone: "+1 (415) 555-0148",
    company: "Acme Technologies",
    jobTitle: "IT Director",
    message: "Technical evaluation parallel to Sarah's commercial thread.",
    source: "LinkedIn",
    status: "CONTACTED",
    value: 0,
    priority: "MEDIUM",
    daysAgo: 16,
    lastContactDaysAgo: 7,
    followUpInDays: 2,
    notes: ["SSO and audit logs are must-haves."],
    followUps: [{ offsetDays: 2, time: "15:00", description: "Security architecture review" }],
  },
];

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(9, 0, 0, 0);
  return date;
}

export async function seedDatabase(force = false) {
  if (seeded && !force) return { seeded: false, reason: "already-ran" };

  const existingUsers = await User.countDocuments();
  if (existingUsers > 0 && !force) {
    seeded = true;
    return { seeded: false, reason: "existing-data" };
  }

  if (force) {
    await Promise.all([
      User.deleteMany({}),
      Lead.deleteMany({}),
      Note.deleteMany({}),
      FollowUp.deleteMany({}),
      Activity.deleteMany({}),
      Settings.deleteMany({}),
    ]);
  }

    const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error("Missing ADMIN_EMAIL or ADMIN_PASSWORD");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await User.create({
    name: "Alex Rivera",
    email: adminEmail.toLowerCase(),
    passwordHash,
    role: "admin",
  });

  const now = new Date().toISOString().slice(0, 7);
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthKey = lastMonth.toISOString().slice(0, 7);

  await Settings.create({
    key: "default",
    marketingSpend: 48500,
    campaigns: [
      { id: "c1", name: "Inbound Website Q3", source: "Website", spend: 12000, month: now },
      { id: "c2", name: "LinkedIn Thought Leadership", source: "LinkedIn", spend: 9800, month: now },
      { id: "c3", name: "Search Always-On", source: "Google", spend: 8600, month: now },
      { id: "c4", name: "Referral Partner Program", source: "Referral", spend: 4200, month: now },
      { id: "c5", name: "Social Proof Ads", source: "Instagram", spend: 5100, month: lastMonthKey },
      { id: "c6", name: "Conference Booth", source: "Other", spend: 8800, month: lastMonthKey },
    ],
  });

  for (const item of DEMO_LEADS) {
    const createdAt = daysFromNow(-item.daysAgo);
    const updatedAt = item.lastContactDaysAgo != null ? daysFromNow(-item.lastContactDaysAgo) : createdAt;
    const lead = await Lead.create({
      name: item.name,
      email: item.email,
      phone: item.phone,
      company: item.company,
      jobTitle: item.jobTitle,
      message: item.message,
      source: item.source,
      status: item.status,
      value: item.value,
      priority: item.priority,
      followUpDate: item.followUpInDays != null ? daysFromNow(item.followUpInDays) : null,
      lastContactedAt: item.lastContactDaysAgo != null ? daysFromNow(-item.lastContactDaysAgo) : null,
      createdAt,
      updatedAt,
    });

    await Activity.create({
      leadId: lead._id,
      type: "LEAD_CREATED",
      description: `${item.name} was added from ${item.source}`,
      metadata: { source: item.source },
      createdAt,
    });

    if (item.status !== "NEW") {
      await Activity.create({
        leadId: lead._id,
        type: item.status === "CONVERTED" ? "LEAD_CONVERTED" : "STATUS_CHANGED",
        description:
          item.status === "CONVERTED"
            ? `${item.name} converted ${item.company}`
            : `${item.name} moved ${item.company} to ${item.status}`,
        metadata: { status: item.status },
        createdAt: updatedAt,
      });
    }

    for (const content of item.notes) {
      const note = await Note.create({
        leadId: lead._id,
        content,
        author: "Alex Rivera",
        createdAt: updatedAt,
        updatedAt,
      });
      await Activity.create({
        leadId: lead._id,
        type: "NOTE_ADDED",
        description: `Alex Rivera added a note on ${item.company}`,
        metadata: { noteId: String(note._id) },
        createdAt: updatedAt,
      });
    }

    for (const follow of item.followUps) {
      const date = daysFromNow(follow.offsetDays);
      const followUp = await FollowUp.create({
        leadId: lead._id,
        date,
        time: follow.time,
        description: follow.description,
        status: follow.completed ? "COMPLETED" : follow.offsetDays < 0 ? "OVERDUE" : "UPCOMING",
      });
      await Activity.create({
        leadId: lead._id,
        type: follow.completed ? "FOLLOW_UP_COMPLETED" : "FOLLOW_UP_SCHEDULED",
        description: follow.completed
          ? `Follow-up completed for ${item.company}`
          : `Follow-up scheduled with ${item.name}`,
        metadata: { followUpId: String(followUp._id) },
        createdAt: date,
      });
    }
  }

  seeded = true;
  return { seeded: true, leads: DEMO_LEADS.length };
}
