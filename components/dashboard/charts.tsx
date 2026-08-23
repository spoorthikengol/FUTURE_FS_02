"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
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

export function FunnelViz({
  data,
}: {
  data: { status: string; count: number; percentOfTotal: number }[];
}) {
  return (
    <Card>
      <CardHeader title="Conversion funnel" description="NEW → CONVERTED with counts" />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <Tooltip contentStyle={tooltipStyle} />
            <Funnel dataKey="count" data={data} isAnimationActive>
              {data.map((entry, index) => (
                <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
              ))}
              <LabelList position="right" fill="#d4d4d8" dataKey="status" />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 space-y-2">
        {data.map((item) => (
          <div key={item.status} className="flex items-center justify-between text-xs text-muted">
            <span>{item.status}</span>
            <span>
              {item.count} · {item.percentOfTotal.toFixed(0)}%
            </span>
          </div>
        ))}
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
