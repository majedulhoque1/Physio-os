import { Users } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export function Patients() {
  return (
    <EmptyState
      icon={Users}
      title="Patients route ready"
      description="The patient index page is wired into the shell and ready for list and profile work."
    />
  );
}
