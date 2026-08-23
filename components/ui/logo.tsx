import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-zinc-950">
        V
      </span>
      <span className="text-sm font-semibold tracking-tight">VeloraCRM</span>
    </div>
  );
}
