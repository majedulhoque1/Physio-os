import type { LucideIcon } from "lucide-react";

interface SAStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
}

export function SAStatCard({ icon: Icon, label, value }: SAStatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>
      </div>
    </div>
  );
}
