"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  change,
  money,
  percent,
}: {
  label: string;
  value: number;
  change: number;
  money?: boolean;
  percent?: boolean;
}) {
  const up = change >= 0;
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">
        {money ? formatCurrency(value) : percent ? formatPercent(value) : value.toLocaleString()}
      </p>
      <p className={cn("mt-2 flex items-center gap-1 text-xs", up ? "text-success" : "text-danger")}>
        {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        {formatPercent(Math.abs(change))} vs last month
      </p>
    </Card>
  );
}
