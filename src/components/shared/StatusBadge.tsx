import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/types";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
  {
    variants: {
      tone: {
        blue: "border-sky-100 bg-sky-50 text-sky-700",
        green: "border-emerald-100 bg-emerald-50 text-emerald-700",
        red: "border-rose-100 bg-rose-50 text-rose-700",
        yellow: "border-amber-100 bg-amber-50 text-amber-700",
        indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
        purple: "border-violet-100 bg-violet-50 text-violet-700",
        orange: "border-orange-100 bg-orange-50 text-orange-700",
        gray: "border-slate-200 bg-slate-100 text-slate-700",
      },
    },
    defaultVariants: {
      tone: "gray",
    },
  },
);

interface StatusBadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    Omit<VariantProps<typeof badgeVariants>, "tone"> {
  label: string;
  tone?: StatusTone;
}

export function StatusBadge({
  className,
  label,
  tone,
  ...props
}: StatusBadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {label}
    </span>
  );
}
