import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-accent text-zinc-950 hover:bg-teal-300",
        variant === "secondary" &&
          "border border-border bg-card text-foreground hover:bg-card-hover",
        variant === "ghost" && "text-muted-strong hover:bg-white/5 hover:text-foreground",
        variant === "danger" && "bg-rose-500/15 text-danger hover:bg-rose-500/25",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-11 px-5 text-sm",
        className,
      )}
      {...props}
    />
  );
}
