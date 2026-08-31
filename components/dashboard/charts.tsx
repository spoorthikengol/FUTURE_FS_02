"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/card";

const tooltipStyle = {
  backgroundColor: "#111113",
  border: "1px solid #27272a",
  borderRadius: 8,
  color: "#f4f4f5",
};

const COLORS = ["#2dd4bf", "#60a5fa", "#c4b5fd", "#fbbf24", "#fb7185", "#94a3b8"];

export function LeadGrowthChart({ data }: { data: { month: string; leads: number }[] }) {
  return (
    <Card>
      <CardHeader title="Lead growth" description="New leads created over time" />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid stroke="#27272a" vertical={false} />
            <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
            <YAxis stroke="#71717a" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area dataKey="leads" stroke="#2dd4bf" fill="rgba(45,212,191,0.15)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function RevenueChart({ data }: { data: { month: string; revenue: number }[] }) {
  return (
    <Card>
      <CardHeader title="Revenue" description="Closed-won value by month" />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="#27272a" vertical={false} />
            <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
            <YAxis stroke="#71717a" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="revenue" fill="#2dd4bf" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function ConversionChart({ data }: { data: { month: string; rate: number }[] }) {
  return (
    <Card>
      <CardHeader title="Conversion" description="Monthly conversion percentage" />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#27272a" vertical={false} />
            <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
            <YAxis stroke="#71717a" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line dataKey="rate" stroke="#60a5fa" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function SourceChart({ data }: { data: { source: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader title="Lead sources" description="Where pipeline is originating" />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="source" innerRadius={50} outerRadius={80}>
              {data.map((entry, index) => (
                <Cell key={entry.source} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

type FunnelStageStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "CONVERTED";

const FUNNEL_STAGE_META: Record<
  FunnelStageStatus,
  { order: number; description: string; text: string; bar: string; ring: string; glow: string; visualWidth: string }
> = {
  NEW: {
    order: 1,
    description: "New opportunities",
    text: "text-teal-300",
    bar: "bg-teal-400",
    ring: "border-teal-400/40",
    glow: "shadow-[0_0_10px_rgba(45,212,191,0.35)]",
    visualWidth: "100%",
  },
  CONTACTED: {
    order: 2,
    description: "Initial engagement",
    text: "text-blue-300",
    bar: "bg-blue-400",
    ring: "border-blue-400/40",
    glow: "shadow-[0_0_10px_rgba(96,165,250,0.35)]",
    visualWidth: "88%",
  },
  QUALIFIED: {
    order: 3,
    description: "Sales qualified",
    text: "text-violet-300",
    bar: "bg-violet-400",
    ring: "border-violet-400/40",
    glow: "shadow-[0_0_10px_rgba(167,139,250,0.35)]",
    visualWidth: "76%",
  },
  PROPOSAL: {
    order: 4,
    description: "Proposal sent",
    text: "text-amber-300",
    bar: "bg-amber-400",
    ring: "border-amber-400/40",
    glow: "shadow-[0_0_10px_rgba(251,191,36,0.35)]",
    visualWidth: "64%",
  },
  CONVERTED: {
    order: 5,
    description: "Successfully converted",
    text: "text-rose-300",
    bar: "bg-rose-400",
    ring: "border-rose-400/40",
    glow: "shadow-[0_0_14px_rgba(251,113,133,0.45)]",
    visualWidth: "52%",
  },
};

function isFunnelStageStatus(status: string): status is FunnelStageStatus {
  return status in FUNNEL_STAGE_META;
}

export function FunnelViz({
  data,
}: {
  data: { status: string; count: number; percentOfTotal: number }[];
}) {
  const stages = data
    .filter((item) => isFunnelStageStatus(item.status))
    .sort((a, b) => FUNNEL_STAGE_META[a.status as FunnelStageStatus].order - FUNNEL_STAGE_META[b.status as FunnelStageStatus].order);

  const converted = data.find((item) => item.status === "CONVERTED");
  // Total leads (including LOST, which this funnel intentionally excludes from its
  // stage list) is recovered from the same percentOfTotal math the backend already
  // computed -- no second calculation system, just inverting count = total * pct/100
  // using whichever stage carries the most signal for numerical stability.
  const totalBasis = [...data].sort((a, b) => b.percentOfTotal - a.percentOfTotal)[0];
  const totalLeads = totalBasis && totalBasis.percentOfTotal > 0 ? Math.round(totalBasis.count / (totalBasis.percentOfTotal / 100)) : 0;
  const convertedCount = converted?.count ?? 0;
  const conversionRate = converted?.percentOfTotal ?? 0;

  return (
    <Card>
      <CardHeader
        title="Conversion funnel"
        description="Lead progression from first contact to conversion"
        action={
          <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            {conversionRate.toFixed(0)}% converted
          </span>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-gradient-to-b from-white/[0.03] to-transparent p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted">Total leads</p>
          <p className="mt-1.5 text-xl font-semibold text-foreground">{totalLeads.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-gradient-to-b from-white/[0.03] to-transparent p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted">Converted</p>
          <p className="mt-1.5 text-xl font-semibold text-foreground">{convertedCount.toLocaleString()} won</p>
        </div>
        <div className="rounded-xl border border-border bg-gradient-to-b from-white/[0.03] to-transparent p-4 col-span-2 sm:col-span-1">
          <p className="text-[11px] uppercase tracking-wide text-muted">Conversion</p>
          <p className="mt-1.5 text-xl font-semibold text-accent">{conversionRate.toFixed(0)}% overall</p>
        </div>
      </div>

      <div className="space-y-3.5">
        {stages.map((item) => {
          const meta = FUNNEL_STAGE_META[item.status as FunnelStageStatus];
          const isConverted = item.status === "CONVERTED";
          return (
            <div
              key={item.status}
              className="mx-auto transition-all duration-200"
              style={{ maxWidth: meta.visualWidth }}
            >
              <div
                className={`group rounded-2xl border border-border bg-white/[0.02] px-5 py-4.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 sm:px-6 sm:py-5 ${
                  isConverted ? "border-rose-400/20" : ""
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium ${meta.text} ${meta.ring}`}
                    >
                      {String(meta.order).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium tracking-wide text-foreground">{item.status}</p>
                      <p className="text-xs text-muted">{meta.description}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-4 sm:justify-end">
                    <div className="h-[5px] w-28 overflow-hidden rounded-full bg-white/[0.06] sm:w-36">
                      <div
                        className={`h-full rounded-full ${meta.bar} ${meta.glow} transition-all duration-300`}
                        style={{ width: `${Math.min(100, Math.max(0, item.percentOfTotal))}%` }}
                      />
                    </div>
                    <div className="w-16 text-right">
                      <p className="text-sm font-semibold text-foreground">{item.count.toLocaleString()}</p>
                      <p className={`text-xs ${isConverted ? "text-rose-300" : "text-muted"}`}>
                        {item.percentOfTotal.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function ForecastChart({
  data,
}: {
  data: { month: string; actual: number | null; forecast: number | null }[];
}) {
  return (
    <Card>
      <CardHeader
        title="Revenue forecast"
        description="Solid line is actual closed revenue. Dashed line is a statistical projection, not a guarantee."
      />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#27272a" vertical={false} />
            <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
            <YAxis stroke="#71717a" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Line dataKey="actual" stroke="#2dd4bf" strokeWidth={2} connectNulls={false} />
            <Line
              dataKey="forecast"
              stroke="#94a3b8"
              strokeDasharray="6 4"
              strokeWidth={2}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}