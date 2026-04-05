import { Stethoscope } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export function TherapistWorkspace() {
  return (
    <EmptyState
      icon={Stethoscope}
      title="Therapist workspace route ready"
      description="The therapist daily workspace is routed and waiting for the session input workflow."
    />
  );
}
