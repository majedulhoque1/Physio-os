import { useEffect, useState } from "react";
import { CheckCircle, CreditCard, Zap } from "lucide-react";
import { useUpgradePendingList, useSAInvoiceList } from "@/hooks/useSubscription";
import { approveTenant } from "@/hooks/useSuperAdmin";

const STATUS_COLORS: Record<string, string> = {
  active: "#4ADE80",
  trialing: "#FEF08A",
  past_due: "#FF79C6",
  cancelled: "#e5e7eb",
  incomplete: "#FF79C6",
  paid: "#4ADE80",
  open: "#FEF08A",
};

function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <span
      className="nb-badge"
      style={{ background: STATUS_COLORS[status] ?? "#e5e7eb" }}
    >
      {status}
    </span>
  );
}

export function SuperAdminBilling() {
  const { requests, isLoading: reqLoading, error: reqError, refetch: refetchRequests } =
    useUpgradePendingList();
  const { invoices, isLoading: invLoading, error: invError, refetch: refetchInvoices } =
    useSAInvoiceList();

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);

  useEffect(() => {
    refetchRequests();
    refetchInvoices();
  }, [refetchRequests, refetchInvoices]);

  async function handleApprove(clinicId: string) {
    setApprovingId(clinicId);
    setApproveError(null);
    const result = await approveTenant({ clinic_id: clinicId, plan_key: "starter" });
    setApprovingId(null);
    if (result.error) { setApproveError(result.error); return; }
    refetchRequests();
    refetchInvoices();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="nb-heading text-4xl text-black">Plan &amp; Billing</h1>
        <p className="mt-1 text-sm font-bold text-gray-600 uppercase tracking-wide">
          Manage plans, approve upgrades, and view invoice history
        </p>
      </div>

      {/* Plan Catalog */}
      <section>
        <h2 className="nb-heading text-xl text-black mb-4">Plan Catalog</h2>
        <div className="nb-card max-w-xs p-5">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="flex h-9 w-9 items-center justify-center"
              style={{ background: "#4ADE80", border: "2px solid #000", borderRadius: "2px" }}
            >
              <Zap className="h-4 w-4 text-black" />
            </div>
            <div>
              <p className="nb-heading text-lg text-black">Basic</p>
              <p className="text-sm font-bold text-gray-600">৳5,000 / month</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm font-medium text-gray-700">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-black shrink-0" />
              Session reminder automation
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-black shrink-0" />
              Missed session follow-up
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-black shrink-0" />
              Unlimited patients &amp; therapists
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-black shrink-0" />
              7-day free trial
            </li>
          </ul>
          <p className="mt-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
            plan_key: starter · Manual approval · BDT only
          </p>
        </div>
      </section>

      {/* Pending Upgrade Requests */}
      <section>
        <h2 className="nb-heading text-xl text-black mb-4 flex items-center gap-2">
          Pending Upgrade Requests
          {requests.length > 0 && (
            <span
              className="nb-badge"
              style={{ background: "#FF79C6" }}
            >
              {requests.length}
            </span>
          )}
        </h2>
        <div className="nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>Clinic</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reqLoading ? (
                <tr><td colSpan={5} className="py-10 text-center font-bold text-gray-500">Loading...</td></tr>
              ) : reqError ? (
                <tr><td colSpan={5} className="py-10 text-center font-bold text-black">{reqError}</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center font-bold text-gray-500">No pending requests</td></tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.clinic_id}>
                    <td className="font-bold text-black">{r.clinic_name}</td>
                    <td className="font-medium text-gray-700">{r.owner_email ?? "—"}</td>
                    <td>
                      <span
                        className="nb-badge"
                        style={{ background: "#FEF08A" }}
                      >
                        {r.subscription_status}
                      </span>
                    </td>
                    <td className="text-gray-600 text-xs font-medium">
                      {new Date(r.upgrade_requested_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        onClick={() => handleApprove(r.clinic_id)}
                        disabled={approvingId === r.clinic_id}
                        className="nb-btn bg-black px-3 py-1.5 text-xs text-white"
                      >
                        {approvingId === r.clinic_id ? "..." : "Approve"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {approveError && (
          <p
            className="mt-2 px-3 py-2 text-sm font-bold text-black"
            style={{ border: "2px solid #000", background: "#FF79C6", borderRadius: "2px" }}
          >
            {approveError}
          </p>
        )}
      </section>

      {/* Invoice History */}
      <section>
        <h2 className="nb-heading text-xl text-black mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-black" />
          Invoice History
        </h2>
        <div className="nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>Clinic</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due</th>
                <th>Paid</th>
              </tr>
            </thead>
            <tbody>
              {invLoading ? (
                <tr><td colSpan={5} className="py-10 text-center font-bold text-gray-500">Loading...</td></tr>
              ) : invError ? (
                <tr><td colSpan={5} className="py-10 text-center font-bold text-black">{invError}</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center font-bold text-gray-500">No invoices yet</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-bold text-black">{inv.clinic_name}</td>
                    <td className="font-bold text-black">৳{(inv.amount_due_cents / 100).toLocaleString()}</td>
                    <td><InvoiceStatusBadge status={inv.status} /></td>
                    <td className="text-gray-600 text-xs font-medium">
                      {inv.due_at ? new Date(inv.due_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="text-gray-600 text-xs font-medium">
                      {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
