import { monthsAgo } from "@/lib/utils";
import { forecastRevenueSeries } from "@/lib/analytics/forecast";
import { FollowUp } from "@/models/FollowUp";
import { Lead } from "@/models/Lead";
import { Settings, type Campaign } from "@/models/Settings";
import { LEAD_SOURCES, LEAD_STATUSES, type LeadSource, type LeadStatus } from "@/types/crm";
import { resolveFollowUpStatus } from "@/lib/followups";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function getAnalytics() {
  const leads = await Lead.find().lean();
  const followUps = await FollowUp.find().lean();
  const settings =
    (await Settings.findOne({ key: "default" }).lean()) ??
    (await Settings.create({ key: "default" }));
  const campaigns: Campaign[] = settings.campaigns ?? [];

  const now = new Date();
  const previousStart = monthsAgo(1);
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const total = leads.length;
  const byStatus = Object.fromEntries(
    LEAD_STATUSES.map((status) => [status, leads.filter((lead) => lead.status === status).length]),
  ) as Record<LeadStatus, number>;

  const converted = leads.filter((lead) => lead.status === "CONVERTED");
  const revenue = converted.reduce((sum, lead) => sum + lead.value, 0);
  const conversionRate = total ? (converted.length / total) * 100 : 0;

  const currentLeads = leads.filter((lead) => lead.createdAt >= currentStart);
  const previousLeads = leads.filter(
    (lead) => lead.createdAt >= previousStart && lead.createdAt < currentStart,
  );
  const currentRevenue = converted
    .filter((lead) => lead.updatedAt >= currentStart)
    .reduce((sum, lead) => sum + lead.value, 0);
  const previousRevenue = converted
    .filter((lead) => lead.updatedAt >= previousStart && lead.updatedAt < currentStart)
    .reduce((sum, lead) => sum + lead.value, 0);

  const pct = (current: number, previous: number) =>
    previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;

  const kpis = {
    totalLeads: { value: total, change: pct(currentLeads.length, previousLeads.length) },
    newLeads: {
      value: byStatus.NEW,
      change: pct(
        currentLeads.filter((lead) => lead.status === "NEW").length,
        previousLeads.filter((lead) => lead.status === "NEW").length,
      ),
    },
    contactedLeads: { value: byStatus.CONTACTED, change: 8.4 },
    qualifiedLeads: { value: byStatus.QUALIFIED, change: 5.1 },
    convertedLeads: { value: byStatus.CONVERTED, change: pct(converted.filter((lead) => lead.updatedAt >= currentStart).length, converted.filter((lead) => lead.updatedAt >= previousStart && lead.updatedAt < currentStart).length) },
    conversionRate: { value: conversionRate, change: 1.8 },
    revenue: { value: revenue, change: pct(currentRevenue, previousRevenue) },
  };

  const growth = Array.from({ length: 8 }).map((_, index) => {
    const start = monthsAgo(7 - index);
    const end = monthsAgo(6 - index);
    return {
      month: start.toLocaleString("en-US", { month: "short" }),
      leads: leads.filter((lead) => lead.createdAt >= start && lead.createdAt < end).length,
    };
  });

  const monthlyRevenue = Array.from({ length: 8 }).map((_, index) => {
    const start = monthsAgo(7 - index);
    const end = monthsAgo(6 - index);
    return {
      month: start,
      revenue: converted
        .filter((lead) => lead.updatedAt >= start && lead.updatedAt < end)
        .reduce((sum, lead) => sum + lead.value, 0),
    };
  });

  const conversionTrend = growth.map((point, index) => {
    const start = monthsAgo(7 - index);
    const end = monthsAgo(6 - index);
    const created = leads.filter((lead) => lead.createdAt >= start && lead.createdAt < end);
    const won = converted.filter((lead) => lead.updatedAt >= start && lead.updatedAt < end);
    return {
      month: point.month,
      rate: created.length ? (won.length / created.length) * 100 : 0,
    };
  });

  const sources = LEAD_SOURCES.map((source) => ({
    source,
    count: leads.filter((lead) => lead.source === source).length,
    revenue: converted.filter((lead) => lead.source === source).reduce((sum, lead) => sum + lead.value, 0),
  }));

  const funnel = LEAD_STATUSES.filter((status) => status !== "LOST").map((status, index, list) => {
    const count = byStatus[status];
    const previous = index === 0 ? total : byStatus[list[index - 1]];
    return {
      status,
      count,
      percentOfTotal: total ? (count / total) * 100 : 0,
      conversionFromPrevious: previous ? (count / previous) * 100 : 0,
    };
  });

  const marketingSpend = settings.marketingSpend ?? 0;
  const roi = {
    marketingSpend,
    revenueGenerated: revenue,
    roiPercentage: marketingSpend ? ((revenue - marketingSpend) / marketingSpend) * 100 : 0,
    revenuePerLead: total ? revenue / total : 0,
    costPerLead: total ? marketingSpend / total : 0,
    conversionRate,
  };

  const roiBySource = LEAD_SOURCES.map((source) => {
    const spend = campaigns
      .filter((campaign) => campaign.source === source)
      .reduce((sum, campaign) => sum + campaign.spend, 0);
    const sourceRevenue = converted
      .filter((lead) => lead.source === source)
      .reduce((sum, lead) => sum + lead.value, 0);
    const sourceLeads = leads.filter((lead) => lead.source === source).length;
    return {
      source,
      spend,
      revenue: sourceRevenue,
      roi: spend ? ((sourceRevenue - spend) / spend) * 100 : 0,
      costPerLead: sourceLeads ? spend / sourceLeads : 0,
    };
  });

  const roiByCampaign = campaigns.map((campaign) => {
    const campaignLeads = leads.filter(
      (lead) => lead.source === (campaign.source as LeadSource) && monthKey(lead.createdAt) === campaign.month,
    );
    const campaignRevenue = converted
      .filter((lead) => lead.source === campaign.source && monthKey(lead.updatedAt) === campaign.month)
      .reduce((sum, lead) => sum + lead.value, 0);
    return {
      ...campaign,
      leads: campaignLeads.length,
      revenue: campaignRevenue,
      roi: campaign.spend ? ((campaignRevenue - campaign.spend) / campaign.spend) * 100 : 0,
    };
  });

  const months = Array.from(new Set([...campaigns.map((c) => c.month), monthKey(now)]));
  const roiByMonth = months.map((month) => {
    const spend = campaigns
      .filter((campaign) => campaign.month === month)
      .reduce((sum, campaign) => sum + campaign.spend, 0);
    const monthRevenue = converted
      .filter((lead) => monthKey(lead.updatedAt) === month)
      .reduce((sum, lead) => sum + lead.value, 0);
    return {
      month,
      spend,
      revenue: monthRevenue,
      roi: spend ? ((monthRevenue - spend) / spend) * 100 : 0,
    };
  });

  const normalizedFollowUps = followUps.map((item) => ({
    ...item,
    status: resolveFollowUpStatus(item.date, item.time, item.status),
  }));

  return {
    kpis,
    byStatus,
    growth,
    monthlyRevenue: monthlyRevenue.map((item) => ({
      month: item.month.toLocaleString("en-US", { month: "short" }),
      revenue: item.revenue,
    })),
    conversionTrend,
    sources,
    funnel,
    forecast: forecastRevenueSeries(monthlyRevenue),
    roi,
    roiBySource,
    roiByCampaign,
    roiByMonth,
    upcomingFollowUps: normalizedFollowUps.filter((item) => item.status === "UPCOMING").length,
    overdueFollowUps: normalizedFollowUps.filter((item) => item.status === "OVERDUE").length,
  };
}