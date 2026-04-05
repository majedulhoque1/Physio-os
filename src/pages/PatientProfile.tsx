import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export function PatientProfile() {
  return (
    <EmptyState
      icon={ClipboardList}
      title="Patient profile route ready"
      description="The dynamic patient detail route is connected and ready for tabs, progress tracking, and billing history."
    />
  );
}
