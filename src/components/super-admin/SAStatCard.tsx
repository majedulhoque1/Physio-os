import type { LucideIcon } from "lucide-react";

interface SAStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accentColor?: string;
}

export function SAStatCard({ icon: Icon, label, value, accentColor = "#4ADE80" }: SAStatCardProps) {
  return (
    <div className="nb-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
            {label}
          </p>
          <p className="nb-heading mt-1.5 text-3xl text-black">{value}</p>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center"
          style={{ background: accentColor, border: "2px solid #000", borderRadius: "2px" }}
        >
          <Icon className="h-4 w-4 text-black" />
        </div>
      </div>
    </div>
  );
}
