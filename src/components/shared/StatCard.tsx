import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AccentColor = "indigo" | "emerald" | "blue" | "red";

interface StatCardProps {
  label: string;
  trend: string;
  trendDirection: "down" | "up";
  value: string;
  valueTone?: "danger" | "default";
  icon?: LucideIcon;
  accentColor?: AccentColor;
  className?: string;
}

const accentStyles: Record<AccentColor, { border: string; iconBg: string; iconText: string }> = {
  indigo: {
    border: "border-t-indigo-500",
    iconBg: "bg-indigo-50",
    iconText: "text-indigo-500",
  },
  emerald: {
    border: "border-t-emerald-500",
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-500",
  },
  blue: {
    border: "border-t-blue-500",
    iconBg: "bg-blue-50",
    iconText: "text-blue-500",
  },
  red: {
    border: "border-t-red-500",
    iconBg: "bg-red-50",
    iconText: "text-red-500",
  },
};

export function StatCard({
  label,
  trend,
  trendDirection,
  value,
  valueTone = "default",
  icon: Icon,
  accentColor,
  className,
}: StatCardProps) {
  const TrendIcon = trendDirection === "up" ? ArrowUpRight : ArrowDownRight;
  const accent = accentColor ? accentStyles[accentColor] : null;

  return (
    <article
      className={cn(
        "rounded-lg border border-border bg-surface p-4 sm:p-5 shadow-card border-t-[3px]",
        accent ? accent.border : "border-t-border",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {Icon && accent ? (
            <span
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                accent.iconBg,
                accent.iconText,
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
          ) : null}

          <div>
            <p
              className={cn(
                "text-2xl sm:text-[28px] font-semibold leading-none tracking-tight",
                valueTone === "danger" ? "text-danger" : "text-foreground",
              )}
            >
              {value}
            </p>
            <p className="mt-3 text-[13px] font-medium text-muted-foreground">{label}</p>
          </div>
        </div>

        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
            trendDirection === "up"
              ? "bg-success/10 text-success"
              : "bg-danger/10 text-danger",
          )}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          {trend}
        </span>
      </div>
    </article>
  );
}
