import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export function Analytics() {
  return (
    <EmptyState
      icon={BarChart3}
      title="Analytics route ready"
      description="Charts and performance reporting will be added after the operational modules are built."
    />
  );
}
