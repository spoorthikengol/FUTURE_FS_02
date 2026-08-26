"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ConversionChart,
  ForecastChart,
  FunnelViz,
  LeadGrowthChart,
  RevenueChart,
  SourceChart,
} from "@/components/dashboard/charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/client";
import { formatCurrency, formatPercent } from "@/lib/utils";

type Analytics = {
  kpis: {
    totalLeads: { value: number; change: number };
    newLeads: { value: number; change: number };
    contactedLeads: { value: number; change: number };
    qualifiedLeads: { value: number; change: number };
    convertedLeads: { value: number; change: number };
    conversionRate: { value: number; change: number };
    revenue: { value: number; change: number };
  };
  growth: { month: string; leads: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  conversionTrend: { month: string; rate: number }[];
  sources: { source: string; count: number }[];
  funnel: { status: string; count: number; percentOfTotal: number }[];
  forecast: {
    currentRevenue: number;
    expectedRevenue: number;
    forecastRevenue: number;
    growthPercentage: number;
    series: { month: string; actual: number | null; forecast: number | null }[];
  };
  roi: {
    marketingSpend: number;
    revenueGenerated: number;
    roiPercentage: number;
    revenuePerLead: number;
    costPerLead: number;
    conversionRate: number;
  };
  roiBySource: { source: string; spend: number; revenue: number; roi: number; costPerLead: number }[];
  roiByCampaign: { id: string; name: string; month: string; spend: number; revenue: number; roi: number; leads: number }[];
  roiByMonth: { month: string; spend: number; revenue: number; roi: number }[];
};

const RANGE_OPTIONS = [
  { label: "Last 3 months", months: 3 },
  { label: "Last 6 months", months: 6 },
  { label: "All 8 months", months: 8 },
] as const;

function takeLastMonths<T>(series: T[], months: number): T[] {
  return series.slice(Math.max(0, series.length - months));
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const [rangeMonths, setRangeMonths] = useState<(typeof RANGE_OPTIONS)[number]["months"]>(6);

  async function load() {
    try {
      setData(await api<Analytics>("/api/analytics"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!data) return null;
    return {
      growth: takeLastMonths(data.growth, rangeMonths),
      monthlyRevenue: takeLastMonths(data.monthlyRevenue, rangeMonths),
      conversionTrend: takeLastMonths(data.conversionTrend, rangeMonths),
      forecastSeries: takeLastMonths(data.forecast.series, rangeMonths),
    };
  }, [data, rangeMonths]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data || !filtered) return <Skeleton className="h-96" />;

  if (data.kpis.totalLeads.value === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted">Interactive performance, forecasting, and ROI views.</p>
        </div>
        <EmptyState
          title="No lead data yet"
          description="Once leads start coming in, this page will show KPI trends, revenue forecasting, the conversion funnel, and ROI by source and campaign."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted">Interactive performance, forecasting, and ROI views.</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          Date range
          <select
            value={rangeMonths}
            onChange={(event) => setRangeMonths(Number(event.target.value) as (typeof RANGE_OPTIONS)[number]["months"])}
            className="rounded-lg border border-border bg-transparent px-2 py-1.5 text-sm text-foreground"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.months} value={option.months} className="bg-background">
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Total leads" value={data.kpis.totalLeads.value} change={data.kpis.totalLeads.change} />
        <KpiCard label="New" value={data.kpis.newLeads.value} change={data.kpis.newLeads.change} />
        <KpiCard label="Contacted" value={data.kpis.contactedLeads.value} change={data.kpis.contactedLeads.change} />
        <KpiCard label="Qualified" value={data.kpis.qualifiedLeads.value} change={data.kpis.qualifiedLeads.change} />
        <KpiCard label="Converted" value={data.kpis.convertedLeads.value} change={data.kpis.convertedLeads.change} />
        <KpiCard label="Conversion rate" value={data.kpis.conversionRate.value} change={data.kpis.conversionRate.change} percent />
        <KpiCard label="Revenue" value={data.kpis.revenue.value} change={data.kpis.revenue.change} money />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <LeadGrowthChart data={filtered.growth} />
        <RevenueChart data={filtered.monthlyRevenue} />
        <ConversionChart data={filtered.conversionTrend} />
        <SourceChart data={data.sources} />
      </div>
      <FunnelViz data={data.funnel} />
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted">Current revenue</p><p className="mt-2 text-xl font-semibold">{formatCurrency(data.forecast.currentRevenue)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Expected revenue</p><p className="mt-2 text-xl font-semibold">{formatCurrency(data.forecast.expectedRevenue)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Forecast revenue</p><p className="mt-2 text-xl font-semibold">{formatCurrency(data.forecast.forecastRevenue)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Growth</p><p className="mt-2 text-xl font-semibold">{formatPercent(data.forecast.growthPercentage)}</p></Card>
      </div>
      <ForecastChart data={filtered.forecastSeries} />
      <Card>
        <CardHeader title="ROI analysis" description="Marketing efficiency by spend, source, campaign, and month." />
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Marketing spend" value={formatCurrency(data.roi.marketingSpend)} />
          <Stat label="Revenue generated" value={formatCurrency(data.roi.revenueGenerated)} />
          <Stat label="ROI" value={data.roi.marketingSpend ? formatPercent(data.roi.roiPercentage) : "No spend data"} />
          <Stat label="Revenue per lead" value={formatCurrency(data.roi.revenuePerLead)} />
          <Stat label="Cost per lead" value={data.roi.marketingSpend ? formatCurrency(data.roi.costPerLead) : "No spend data"} />
          <Stat label="Conversion rate" value={formatPercent(data.roi.conversionRate)} />
        </div>
        <div className="mt-6 overflow-x-auto">
          <p className="mb-2 text-xs text-muted">By source</p>
          <Table
            rows={data.roiBySource.map((row) => [
              row.source,
              formatCurrency(row.spend),
              formatCurrency(row.revenue),
              row.spend ? formatPercent(row.roi) : "No spend data",
              row.spend ? formatCurrency(row.costPerLead) : "\u2014",
            ])}
            headers={["Source", "Spend", "Revenue", "ROI", "CPL"]}
          />
        </div>
        <div className="mt-6 overflow-x-auto">
          <p className="mb-2 text-xs text-muted">By campaign</p>
          <Table
            rows={data.roiByCampaign.map((row) => [
              row.name,
              row.month,
              formatCurrency(row.spend),
              formatCurrency(row.revenue),
              row.spend ? formatPercent(row.roi) : "No spend data",
            ])}
            headers={["Campaign", "Month", "Spend", "Revenue", "ROI"]}
          />
        </div>
        <div className="mt-6 overflow-x-auto">
          <p className="mb-2 text-xs text-muted">By month</p>
          <Table
            rows={data.roiByMonth.map((row) => [
              row.month,
              formatCurrency(row.spend),
              formatCurrency(row.revenue),
              row.spend ? formatPercent(row.roi) : "No spend data",
            ])}
            headers={["Month", "Spend", "Revenue", "ROI"]}
          />
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table className="min-w-full text-left text-sm">
      <thead className="text-xs text-muted">
        <tr>{headers.map((header) => <th key={header} className="py-2 pr-4">{header}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-t border-border">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="py-2 pr-4">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}