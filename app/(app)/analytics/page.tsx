"use client";

import { useEffect, useState } from "react";
import {
  ConversionChart,
  ForecastChart,
  FunnelViz,
  LeadGrowthChart,
  RevenueChart,
  SourceChart,
} from "@/components/dashboard/charts";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/client";
import { formatCurrency, formatPercent } from "@/lib/utils";

type Analytics = {
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

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

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

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted">Interactive performance, forecasting, and ROI views.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <LeadGrowthChart data={data.growth} />
        <RevenueChart data={data.monthlyRevenue} />
        <ConversionChart data={data.conversionTrend} />
        <SourceChart data={data.sources} />
      </div>
      <FunnelViz data={data.funnel} />
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted">Current revenue</p><p className="mt-2 text-xl font-semibold">{formatCurrency(data.forecast.currentRevenue)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Expected revenue</p><p className="mt-2 text-xl font-semibold">{formatCurrency(data.forecast.expectedRevenue)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Forecast revenue</p><p className="mt-2 text-xl font-semibold">{formatCurrency(data.forecast.forecastRevenue)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Growth</p><p className="mt-2 text-xl font-semibold">{formatPercent(data.forecast.growthPercentage)}</p></Card>
      </div>
      <ForecastChart data={data.forecast.series} />
      <Card>
        <CardHeader title="ROI analysis" description="Marketing efficiency by spend, source, campaign, and month." />
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Marketing spend" value={formatCurrency(data.roi.marketingSpend)} />
          <Stat label="Revenue generated" value={formatCurrency(data.roi.revenueGenerated)} />
          <Stat label="ROI" value={formatPercent(data.roi.roiPercentage)} />
          <Stat label="Revenue per lead" value={formatCurrency(data.roi.revenuePerLead)} />
          <Stat label="Cost per lead" value={formatCurrency(data.roi.costPerLead)} />
          <Stat label="Conversion rate" value={formatPercent(data.roi.conversionRate)} />
        </div>
        <div className="mt-6 overflow-x-auto">
          <p className="mb-2 text-xs text-muted">By source</p>
          <Table
            rows={data.roiBySource.map((row) => [row.source, formatCurrency(row.spend), formatCurrency(row.revenue), formatPercent(row.roi), formatCurrency(row.costPerLead)])}
            headers={["Source", "Spend", "Revenue", "ROI", "CPL"]}
          />
        </div>
        <div className="mt-6 overflow-x-auto">
          <p className="mb-2 text-xs text-muted">By campaign</p>
          <Table
            rows={data.roiByCampaign.map((row) => [row.name, row.month, formatCurrency(row.spend), formatCurrency(row.revenue), formatPercent(row.roi)])}
            headers={["Campaign", "Month", "Spend", "Revenue", "ROI"]}
          />
        </div>
        <div className="mt-6 overflow-x-auto">
          <p className="mb-2 text-xs text-muted">By month</p>
          <Table
            rows={data.roiByMonth.map((row) => [row.month, formatCurrency(row.spend), formatCurrency(row.revenue), formatPercent(row.roi)])}
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
