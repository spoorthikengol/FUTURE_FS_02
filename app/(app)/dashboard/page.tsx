"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  ConversionChart,
  FunnelViz,
  LeadGrowthChart,
  RevenueChart,
  SourceChart,
} from "@/components/dashboard/charts";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/client";
import { formatCurrency, formatDateTime, relativeTime } from "@/lib/utils";

type Analytics = {
  kpis: Record<string, { value: number; change: number }>;
  growth: { month: string; leads: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  conversionTrend: { month: string; rate: number }[];
  sources: { source: string; count: number }[];
  funnel: { status: string; count: number; percentOfTotal: number }[];
};

type ActivityItem = {
  id: string;
  description: string;
  createdAt: string;
};

type FollowUpItem = {
  id: string;
  description: string;
  date: string;
  time: string;
  status: string;
  leadName: string;
  company: string;
  leadId: string;
};

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [metrics, events, tasks] = await Promise.all([
        api<Analytics>("/api/analytics"),
        api<ActivityItem[]>("/api/activity?limit=8"),
        api<FollowUpItem[]>("/api/followups"),
      ]);
      setAnalytics(metrics);
      setActivity(events);
      setFollowUps(tasks.filter((item) => item.status !== "COMPLETED").slice(0, 6));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!analytics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    );
  }

  const k = analytics.kpis;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Overview</p>
        <h1 className="mt-1 text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted">Turn leads into relationships with a live view of pipeline health.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total leads" value={k.totalLeads.value} change={k.totalLeads.change} />
        <KpiCard label="New leads" value={k.newLeads.value} change={k.newLeads.change} />
        <KpiCard label="Contacted" value={k.contactedLeads.value} change={k.contactedLeads.change} />
        <KpiCard label="Qualified" value={k.qualifiedLeads.value} change={k.qualifiedLeads.change} />
        <KpiCard label="Converted" value={k.convertedLeads.value} change={k.convertedLeads.change} />
        <KpiCard label="Conversion rate" value={k.conversionRate.value} change={k.conversionRate.change} percent />
        <KpiCard label="Revenue" value={k.revenue.value} change={k.revenue.change} money />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <LeadGrowthChart data={analytics.growth} />
        <RevenueChart data={analytics.monthlyRevenue} />
        <ConversionChart data={analytics.conversionTrend} />
        <SourceChart data={analytics.sources} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <FunnelViz data={analytics.funnel} />
        <div className="space-y-4">
          <Card>
            <CardHeader title="Recent activity" action={<Link className="text-xs text-accent" href="/activity">View all</Link>} />
            <ul className="space-y-3">
              {activity.map((item) => (
                <li key={item.id} className="text-sm">
                  <p>{item.description}</p>
                  <p className="text-xs text-muted">{relativeTime(item.createdAt)}</p>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Upcoming follow-ups" />
            <ul className="space-y-3">
              {followUps.length === 0 ? (
                <p className="text-sm text-muted">No open follow-ups.</p>
              ) : (
                followUps.map((item) => (
                  <li key={item.id} className="text-sm">
                    <Link href={`/leads/${item.leadId}`} className="hover:text-accent">
                      {item.leadName} · {item.company}
                    </Link>
                    <p className="text-xs text-muted">
                      {item.description} · {formatDateTime(item.date)}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
