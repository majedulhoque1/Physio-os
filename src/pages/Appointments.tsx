import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export function Appointments() {
  return (
    <EmptyState
      icon={CalendarDays}
      title="Appointments route ready"
      description="Calendar and list views will be added after the dashboard and data layer are in place."
    />
  );
}
