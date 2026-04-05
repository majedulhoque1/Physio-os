import { CreditCard } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export function Billing() {
  return (
    <EmptyState
      icon={CreditCard}
      title="Billing route ready"
      description="The billing shell is in place for payment tracking, dues, and package management."
    />
  );
}
