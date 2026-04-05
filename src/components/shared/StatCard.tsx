import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  trend: string;
  trendDirection: "down" | "up";
  value: string;
  valueTone?: "danger" | "default";
}

export function StatCard({
  label,
  trend,
  trendDirection,
  value,
  valueTone = "default",
}: StatCardProps) {
  const TrendIcon = trendDirection === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <article className="rounded-lg border border-border bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={cn(
              "text-[28px] font-semibold leading-none tracking-tight",
              valueTone === "danger" ? "text-danger" : "text-foreground",
            )}
          >
            {value}
          </p>
          <p className="mt-3 text-[13px] font-medium text-muted-foreground">{label}</p>
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
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
