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
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  DollarSign,
  Filter,
  Gauge,
  Layers3,
  LineChart,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

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
  roiBySource: {
    source: string;
    spend: number;
    revenue: number;
    roi: number;
    costPerLead: number;
  }[];
  roiByCampaign: {
    id: string;
    name: string;
    month: string;
    spend: number;
    revenue: number;
    roi: number;
    leads: number;
  }[];
  roiByMonth: {
    month: string;
    spend: number;
    revenue: number;
    roi: number;
  }[];
};

const RANGE_OPTIONS = [
  { label: "Last 3 months", months: 3 },
  { label: "Last 6 months", months: 6 },
  { label: "All 8 months", months: 8 },
] as const;

function takeLastMonths<T>(series: T[], months: number): T[] {
  return series.slice(Math.max(0, series.length - months));
}

function PremiumStat({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/70 p-4 shadow-[0_12px_40px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/15 hover:bg-card hover:shadow-[0_18px_45px_-28px_rgba(0,0,0,0.9)]">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.035] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            {label}
          </p>

          <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {value}
          </p>

          {description ? (
            <p className="mt-1 text-[11px] text-muted">{description}</p>
          ) : null}
        </div>

        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035] text-muted-strong transition-all duration-300 group-hover:scale-105 group-hover:text-foreground">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: typeof Activity;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035] text-muted-strong">
        <Icon className="h-4 w-4" />
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          {eyebrow}
        </p>

        <h2 className="mt-0.5 text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h2>

        <p className="mt-0.5 text-xs text-muted">{description}</p>
      </div>
    </div>
  );
}

function TrendIndicator({ value }: { value: number }) {
  const positive = value >= 0;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        positive
          ? "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300"
          : "border-rose-400/15 bg-rose-400/[0.07] text-rose-300"
      }`}
    >
      {positive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function PremiumTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-black/10">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/[0.025]">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="whitespace-nowrap px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className="border-t border-white/[0.05] transition-colors duration-200 hover:bg-white/[0.025]"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`whitespace-nowrap px-4 py-3 ${
                    cellIndex === 0
                      ? "font-medium text-foreground"
                      : "text-muted-strong"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const [rangeMonths, setRangeMonths] =
    useState<(typeof RANGE_OPTIONS)[number]["months"]>(6);

  async function load() {
    try {
      setData(await api<Analytics>("/api/analytics"));
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load analytics",
      );
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
      conversionTrend: takeLastMonths(
        data.conversionTrend,
        rangeMonths,
      ),
      forecastSeries: takeLastMonths(
        data.forecast.series,
        rangeMonths,
      ),
    };
  }, [data, rangeMonths]);

  if (error) {
    return <ErrorState message={error} onRetry={load} />;
  }

  if (!data || !filtered) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (data.kpis.totalLeads.value === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/80 bg-card/70 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035]">
              <BarChart3 className="h-5 w-5 text-muted-strong" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Analytics
              </h1>
              <p className="mt-1 text-sm text-muted">
                Interactive performance, forecasting, and ROI views.
              </p>
            </div>
          </div>
        </div>

        <EmptyState
          title="No lead data yet"
          description="Once leads start coming in, this page will show KPI trends, revenue forecasting, the conversion funnel, and ROI by source and campaign."
        />
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-8">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/70 p-5 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-6">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-accent/[0.04] blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
              <Sparkles className="h-3 w-3" />
              Performance overview
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Analytics
            </h1>

            <p className="mt-1.5 max-w-xl text-sm text-muted">
              Track pipeline performance, revenue momentum, conversion trends,
              forecasting, and marketing efficiency.
            </p>
          </div>

          <label className="flex items-center gap-2 self-start rounded-xl border border-border bg-black/10 px-3 py-2 text-xs text-muted transition-all duration-200 hover:border-white/15 hover:bg-white/[0.025] sm:self-auto">
            <CalendarDays className="h-3.5 w-3.5" />

            <span className="hidden sm:inline">Date range</span>

            <select
              value={rangeMonths}
              onChange={(event) =>
                setRangeMonths(
                  Number(event.target.value) as (typeof RANGE_OPTIONS)[number]["months"],
                )
              }
              className="cursor-pointer bg-transparent text-xs font-medium text-foreground outline-none"
            >
              {RANGE_OPTIONS.map((option) => (
                <option
                  key={option.months}
                  value={option.months}
                  className="bg-background"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* KPI GRID */}
      <section>
        <SectionHeader
          icon={Gauge}
          eyebrow="At a glance"
          title="Pipeline health"
          description="Your most important CRM performance indicators."
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <KpiCard
            label="Total leads"
            value={data.kpis.totalLeads.value}
            change={data.kpis.totalLeads.change}
          />

          <KpiCard
            label="New"
            value={data.kpis.newLeads.value}
            change={data.kpis.newLeads.change}
          />

          <KpiCard
            label="Contacted"
            value={data.kpis.contactedLeads.value}
            change={data.kpis.contactedLeads.change}
          />

          <KpiCard
            label="Qualified"
            value={data.kpis.qualifiedLeads.value}
            change={data.kpis.qualifiedLeads.change}
          />

          <KpiCard
            label="Converted"
            value={data.kpis.convertedLeads.value}
            change={data.kpis.convertedLeads.change}
          />

          <KpiCard
            label="Conversion rate"
            value={data.kpis.conversionRate.value}
            change={data.kpis.conversionRate.change}
            percent
          />

          <KpiCard
            label="Revenue"
            value={data.kpis.revenue.value}
            change={data.kpis.revenue.change}
            money
          />
        </div>
      </section>

      {/* CHARTS */}
      <section>
        <SectionHeader
          icon={LineChart}
          eyebrow="Performance"
          title="Growth & conversion"
          description="Understand how your pipeline is changing over time."
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="group rounded-2xl transition-all duration-300 hover:-translate-y-0.5">
            <LeadGrowthChart data={filtered.growth} />
          </div>

          <div className="group rounded-2xl transition-all duration-300 hover:-translate-y-0.5">
            <RevenueChart data={filtered.monthlyRevenue} />
          </div>

          <div className="group rounded-2xl transition-all duration-300 hover:-translate-y-0.5">
            <ConversionChart data={filtered.conversionTrend} />
          </div>

          <div className="group rounded-2xl transition-all duration-300 hover:-translate-y-0.5">
            <SourceChart data={data.sources} />
          </div>
        </div>
      </section>

      {/* FUNNEL */}
      <section>
        <SectionHeader
          icon={Layers3}
          eyebrow="Pipeline"
          title="Conversion funnel"
          description="See where leads are moving through your sales process."
        />

        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/70 shadow-[0_14px_50px_-35px_rgba(0,0,0,0.9)]">
          <FunnelViz data={data.funnel} />
        </div>
      </section>

      {/* FORECAST */}
      <section>
        <SectionHeader
          icon={TrendingUp}
          eyebrow="Forecast"
          title="Revenue outlook"
          description="Current performance compared with expected future revenue."
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PremiumStat
            icon={DollarSign}
            label="Current revenue"
            value={formatCurrency(data.forecast.currentRevenue)}
            description="Revenue generated so far"
          />

          <PremiumStat
            icon={Target}
            label="Expected revenue"
            value={formatCurrency(data.forecast.expectedRevenue)}
            description="Based on current pipeline"
          />

          <PremiumStat
            icon={Wallet}
            label="Forecast revenue"
            value={formatCurrency(data.forecast.forecastRevenue)}
            description="Projected performance"
          />

          <div className="group relative overflow-hidden rounded-2xl border border-accent/15 bg-accent/[0.035] p-4 shadow-[0_12px_40px_-30px_rgba(0,0,0,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/25 hover:bg-accent/[0.05]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                  Growth
                </p>

                <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                  {formatPercent(data.forecast.growthPercentage)}
                </p>

                <div className="mt-2">
                  <TrendIndicator value={data.forecast.growthPercentage} />
                </div>
              </div>

              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-accent/10 bg-accent/[0.05]">
                <TrendingUp className="h-4 w-4 text-accent" />
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border/80 bg-card/70 shadow-[0_14px_50px_-35px_rgba(0,0,0,0.9)]">
          <ForecastChart data={filtered.forecastSeries} />
        </div>
      </section>

      {/* ROI */}
      <section>
        <SectionHeader
          icon={Wallet}
          eyebrow="Marketing efficiency"
          title="ROI analysis"
          description="Measure how effectively your marketing spend generates revenue."
        />

        <Card className="overflow-hidden border-border/80 bg-card/70 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.9)]">
          <CardHeader
            title="Marketing performance"
            description="Efficiency across spend, sources, campaigns, and time."
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PremiumStat
              icon={Wallet}
              label="Marketing spend"
              value={formatCurrency(data.roi.marketingSpend)}
            />

            <PremiumStat
              icon={DollarSign}
              label="Revenue generated"
              value={formatCurrency(data.roi.revenueGenerated)}
            />

            <PremiumStat
              icon={TrendingUp}
              label="ROI"
              value={
                data.roi.marketingSpend
                  ? formatPercent(data.roi.roiPercentage)
                  : "No spend data"
              }
            />

            <PremiumStat
              icon={Users}
              label="Revenue per lead"
              value={formatCurrency(data.roi.revenuePerLead)}
            />

            <PremiumStat
              icon={Activity}
              label="Cost per lead"
              value={
                data.roi.marketingSpend
                  ? formatCurrency(data.roi.costPerLead)
                  : "No spend data"
              }
            />

            <PremiumStat
              icon={Target}
              label="Conversion rate"
              value={formatPercent(data.roi.conversionRate)}
            />
          </div>

          <div className="mt-7">
            <div className="mb-3 flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted" />
              <p className="text-xs font-medium text-foreground">
                Performance by source
              </p>
            </div>

            <PremiumTable
              rows={data.roiBySource.map((row) => [
                row.source,
                formatCurrency(row.spend),
                formatCurrency(row.revenue),
                row.spend
                  ? formatPercent(row.roi)
                  : "No spend data",
                row.spend
                  ? formatCurrency(row.costPerLead)
                  : "—",
              ])}
              headers={["Source", "Spend", "Revenue", "ROI", "CPL"]}
            />
          </div>

          <div className="mt-7">
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-muted" />
              <p className="text-xs font-medium text-foreground">
                Performance by campaign
              </p>
            </div>

            <PremiumTable
              rows={data.roiByCampaign.map((row) => [
                row.name,
                row.month,
                formatCurrency(row.spend),
                formatCurrency(row.revenue),
                row.spend
                  ? formatPercent(row.roi)
                  : "No spend data",
              ])}
              headers={[
                "Campaign",
                "Month",
                "Spend",
                "Revenue",
                "ROI",
              ]}
            />
          </div>

          <div className="mt-7">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-muted" />
              <p className="text-xs font-medium text-foreground">
                Performance by month
              </p>
            </div>

            <PremiumTable
              rows={data.roiByMonth.map((row) => [
                row.month,
                formatCurrency(row.spend),
                formatCurrency(row.revenue),
                row.spend
                  ? formatPercent(row.roi)
                  : "No spend data",
              ])}
              headers={["Month", "Spend", "Revenue", "ROI"]}
            />
          </div>
        </Card>
      </section>
    </div>
  );
}