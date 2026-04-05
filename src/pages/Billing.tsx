import { CheckCircle, CreditCard, Plus, X } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { useBilling, type CreateBillingInput } from "@/hooks/useBilling";
import { usePatients } from "@/hooks/usePatients";
import type { BillingStatus, PaymentMethod, StatusTone } from "@/types";

function billingStatusTone(status: BillingStatus | null): StatusTone {
  switch (status) {
    case "paid":
      return "green";
    case "partial":
      return "yellow";
    case "due":
      return "red";
    default:
      return "gray";
  }
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(amount);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_FILTERS: { label: string; value: BillingStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Due", value: "due" },
  { label: "Partial", value: "partial" },
  { label: "Paid", value: "paid" },
];

const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
  { label: "Cash", value: "cash" },
  { label: "bKash", value: "bkash" },
  { label: "Nagad", value: "nagad" },
  { label: "Card", value: "card" },
];

interface AddPaymentFormValues {
  amount: string;
  package_name: string;
  patient_id: string;
  payment_method: PaymentMethod;
  sessions_included: string;
  status: BillingStatus;
}

function AddPaymentModal({
  clinicId,
  onClose,
  onSubmit,
  isSaving,
  patients,
}: {
  clinicId: string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: CreateBillingInput) => void;
  patients: { id: string; name: string }[];
}) {
  const [values, setValues] = useState<AddPaymentFormValues>({
    amount: "",
    package_name: "",
    patient_id: patients[0]?.id ?? "",
    payment_method: "cash",
    sessions_included: "",
    status: "due",
  });

  function set(key: keyof AddPaymentFormValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount <= 0) return;

    onSubmit({
      amount,
      clinic_id: clinicId,
      package_name: values.package_name.trim() || null,
      patient_id: values.patient_id,
      payment_method: values.payment_method,
      sessions_included: values.sessions_included ? parseInt(values.sessions_included, 10) : null,
      status: values.status,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Record Payment</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Patient</label>
            <select
              value={values.patient_id}
              onChange={(e) => set("patient_id", e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Amount (BDT)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={values.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="2500"
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Payment method
              </label>
              <select
                value={values.payment_method}
                onChange={(e) => set("payment_method", e.target.value as PaymentMethod)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Package name
                <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                type="text"
                value={values.package_name}
                onChange={(e) => set("package_name", e.target.value)}
                placeholder="10-session package"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Sessions included
                <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={values.sessions_included}
                onChange={(e) => set("sessions_included", e.target.value)}
                placeholder="10"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
            <select
              value={values.status}
              onChange={(e) => set("status", e.target.value as BillingStatus)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="due">Due</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Billing() {
  const { can, clinicId } = useAuth();
  const { records, isLoading, error, totalRevenue, totalDue, createRecord, markAsPaid } =
    useBilling();
  const { patients } = usePatients();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<BillingStatus | "all">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const patientMap = new Map(patients.map((p) => [p.id, p.name]));

  const filtered =
    statusFilter === "all" ? records : records.filter((r) => r.status === statusFilter);

  async function handleCreate(input: CreateBillingInput) {
    setIsSaving(true);
    const result = await createRecord(input);
    setIsSaving(false);

    if (result.error) {
      toast({ title: "Could not save record", description: result.error, variant: "error" });
      return;
    }

    setIsModalOpen(false);
    toast({ title: "Payment recorded", variant: "success" });
  }

  async function handleMarkPaid(id: string, patientName: string) {
    const result = await markAsPaid(id);
    if (result.error) {
      toast({ title: "Could not update record", description: result.error, variant: "error" });
      return;
    }
    toast({ title: `${patientName} marked as paid`, variant: "success" });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Track payments, dues, and session packages."
        actions={can("manage_billing") ? (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Record payment
          </button>
        ) : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total collected
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">৳ {formatAmount(totalRevenue)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Outstanding dues
          </p>
          <p className="mt-1 text-2xl font-bold text-danger">৳ {formatAmount(totalDue)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total records
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">{records.length}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? "bg-primary text-white"
                : "border border-border bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No billing records"
          description={
            statusFilter === "all"
              ? "Record a payment above to start tracking."
              : `No ${statusFilter} records found.`
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Package
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Method
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((record) => {
                const patientName = patientMap.get(record.patient_id) ?? "Unknown";
                return (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-foreground">{patientName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {record.package_name ?? (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                      {record.sessions_included ? (
                        <span className="ml-1 text-xs">({record.sessions_included} sessions)</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                      ৳ {formatAmount(Number(record.amount))}
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">
                      {record.payment_method ?? "cash"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={record.status ?? "due"}
                        tone={billingStatusTone(record.status)}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(record.paid_at ?? record.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {record.status !== "paid" ? (
                        <button
                          type="button"
                          onClick={() => handleMarkPaid(record.id, patientName)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-success/30 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/10"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Mark paid
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && clinicId ? (
        <AddPaymentModal
          clinicId={clinicId}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreate}
          isSaving={isSaving}
          patients={patients.map((p) => ({ id: p.id, name: p.name }))}
        />
      ) : isModalOpen && !clinicId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-surface p-6 text-sm text-muted-foreground shadow-xl">
            No clinic loaded. Please sign in.
          </div>
        </div>
      ) : null}
    </div>
  );
}
