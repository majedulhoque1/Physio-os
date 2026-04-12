import { useEffect, useState } from "react";
import { CheckCircle, CreditCard, Zap } from "lucide-react";
import { useUpgradePendingList, useSAInvoiceList } from "@/hooks/useSubscription";
import { approveTenant } from "@/hooks/useSuperAdmin";

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
    if (result.error) {
      setApproveError(result.error);
      return;
    }
    refetchRequests();
    refetchInvoices();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plan &amp; Billing</h1>
        <p className="mt-1 text-sm text-gray-500">Manage plans, approve upgrades, and view invoice history</p>
      </div>

      {/* Plan Catalog */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-900">Plan Catalog</h2>
        <div className="max-w-xs rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Basic</p>
              <p className="text-sm text-gray-500">৳5,000 / month</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              Session reminder automation
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              Missed session follow-up
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              Unlimited patients &amp; therapists
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              7-day free trial
            </li>
          </ul>
          <p className="mt-3 text-xs text-gray-400">plan_key: starter · Manual approval · BDT only</p>
        </div>
      </section>

      {/* Pending Upgrade Requests */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-900 flex items-center gap-2">
          Pending Upgrade Requests
          {requests.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {requests.length}
            </span>
          )}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Clinic</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Requested</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {reqLoading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
              ) : reqError ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-red-500">{reqError}</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No pending requests</td></tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.clinic_id} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.clinic_name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.owner_email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        {r.subscription_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(r.upgrade_requested_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleApprove(r.clinic_id)}
                        disabled={approvingId === r.clinic_id}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-60 transition-colors"
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
          <p className="mt-2 text-sm text-red-600">{approveError}</p>
        )}
      </section>

      {/* Invoice History */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-900 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-gray-500" />
          Invoice History
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Clinic</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid</th>
              </tr>
            </thead>
            <tbody>
              {invLoading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
              ) : invError ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-red-500">{invError}</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No invoices yet</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">{inv.clinic_name}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      ৳{(inv.amount_due_cents / 100).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        inv.status === "paid"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : inv.status === "open"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-gray-200 bg-gray-100 text-gray-600"
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {inv.due_at ? new Date(inv.due_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
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
