import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Stethoscope,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import { SAStatCard } from "@/components/super-admin/SAStatCard";
import {
  useTenantDetail,
  updateSubscription,
  useTenantPatients,
  useTenantTherapists,
  useTenantAppointments,
  useTenantTreatmentPlans,
} from "@/hooks/useSuperAdmin";

type Tab = "overview" | "patients" | "appointments" | "therapists" | "plans";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "patients", label: "Patients" },
  { id: "appointments", label: "Appointments" },
  { id: "therapists", label: "Therapists" },
  { id: "plans", label: "Treatment Plans" },
];

function TabSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
    </div>
  );
}

function TabEmpty() {
  return (
    <p className="py-12 text-center text-sm text-gray-400">No records found.</p>
  );
}

function TabError({ message }: { message: string }) {
  return (
    <p className="py-12 text-center text-sm text-red-500">{message}</p>
  );
}

export function SuperAdminTenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { detail, isLoading, error, refetch } = useTenantDetail(id);

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [fetchedTabs, setFetchedTabs] = useState<Set<Tab>>(new Set());

  const patients = useTenantPatients(id);
  const therapists = useTenantTherapists(id);
  const appointments = useTenantAppointments(id);
  const plans = useTenantTreatmentPlans(id);

  const [planKey, setPlanKey] = useState<string>("");
  const [subStatus, setSubStatus] = useState<string>("");
  const [trialEnd, setTrialEnd] = useState<string>("");
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const sub = detail?.subscription;
  if (sub && !planKey && !subStatus) {
    setTimeout(() => {
      setPlanKey(sub.plan_key ?? "starter");
      setSubStatus(sub.status ?? "trialing");
      setTrialEnd(sub.trial_ends_at?.split("T")[0] ?? "");
    }, 0);
  }

  function handleTabClick(tab: Tab) {
    setActiveTab(tab);
    if (tab === "overview" || fetchedTabs.has(tab)) return;
    setFetchedTabs((prev) => new Set(prev).add(tab));
    if (tab === "patients") patients.fetch();
    if (tab === "therapists") therapists.fetch();
    if (tab === "appointments") appointments.fetch();
    if (tab === "plans") plans.fetch();
  }

  async function handleUpdate(field: "plan" | "status" | "trial") {
    if (!id) return;
    setSaving(field);
    setSaveError(null);

    const params: Parameters<typeof updateSubscription>[0] = { clinic_id: id };
    if (field === "plan") params.plan_key = planKey;
    if (field === "status") params.status = subStatus;
    if (field === "trial") params.trial_end = trialEnd || null;

    const result = await updateSubscription(params);
    setSaving(null);

    if (result.error) {
      setSaveError(result.error);
      return;
    }

    refetch();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-600">{error ?? "Tenant not found"}</p>
        <button
          onClick={() => navigate("/super-admin/tenants")}
          className="mt-4 text-sm font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600"
        >
          Back to tenants
        </button>
      </div>
    );
  }

  const { clinic, owner, stats } = detail;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => navigate("/super-admin/tenants")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tenants
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{clinic.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>Slug: {clinic.slug}</span>
          <span>Owner: {owner.full_name ?? owner.email ?? "—"}</span>
          {owner.email && <span>{owner.email}</span>}
          <span>
            Created:{" "}
            {clinic.created_at
              ? new Date(clinic.created_at).toLocaleDateString()
              : "—"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Usage Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SAStatCard icon={Users} label="Patients" value={stats.total_patients} />
            <SAStatCard icon={Stethoscope} label="Therapists" value={stats.total_therapists} />
            <SAStatCard icon={CalendarDays} label="Appointments" value={stats.total_appointments} />
            <SAStatCard icon={ClipboardList} label="Active Plans" value={stats.active_treatment_plans} />
          </div>

          {/* Subscription Management */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-6 text-base font-semibold text-gray-900">Subscription Management</h2>

            {saveError && (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {saveError}
              </p>
            )}

            {!sub ? (
              <p className="text-gray-400">No subscription found for this clinic.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Plan */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Plan</label>
                  <div className="flex gap-2">
                    <select
                      value={planKey}
                      onChange={(e) => setPlanKey(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    >
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                    <button
                      onClick={() => handleUpdate("plan")}
                      disabled={saving === "plan"}
                      className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 transition-colors"
                    >
                      {saving === "plan" ? "..." : "Save"}
                    </button>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
                  <div className="flex gap-2">
                    <select
                      value={subStatus}
                      onChange={(e) => setSubStatus(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    >
                      <option value="trialing">Trialing</option>
                      <option value="active">Active</option>
                      <option value="past_due">Past Due</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="incomplete">Incomplete</option>
                    </select>
                    <button
                      onClick={() => handleUpdate("status")}
                      disabled={saving === "status"}
                      className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 transition-colors"
                    >
                      {saving === "status" ? "..." : "Save"}
                    </button>
                  </div>
                </div>

                {/* Trial End */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Trial Ends</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={trialEnd}
                      onChange={(e) => setTrialEnd(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    />
                    <button
                      onClick={() => handleUpdate("trial")}
                      disabled={saving === "trial"}
                      className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 transition-colors"
                    >
                      {saving === "trial" ? "..." : "Save"}
                    </button>
                  </div>
                </div>

                {sub.current_period_start && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <p className="text-xs text-gray-400">
                      Current period:{" "}
                      {new Date(sub.current_period_start).toLocaleDateString()} —{" "}
                      {sub.current_period_end
                        ? new Date(sub.current_period_end).toLocaleDateString()
                        : "ongoing"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "patients" && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Patients</h2>
          </div>
          {patients.isLoading ? (
            <TabSpinner />
          ) : patients.error ? (
            <TabError message={patients.error} />
          ) : patients.data.length === 0 ? (
            <TabEmpty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Phone</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Age</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Gender</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Diagnosis</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Therapist</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Sessions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {patients.data.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-6 py-3 text-gray-600">{p.phone}</td>
                      <td className="px-6 py-3 text-gray-600">{p.age ?? "—"}</td>
                      <td className="px-6 py-3 text-gray-600">{p.gender ?? "—"}</td>
                      <td className="px-6 py-3 text-gray-600">{p.diagnosis ?? "—"}</td>
                      <td className="px-6 py-3 text-gray-600">{p.assigned_therapist_name ?? "—"}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === "active"
                            ? "bg-green-50 text-green-700"
                            : p.status === "completed"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{p.completed_sessions}/{p.total_sessions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "appointments" && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Appointments</h2>
          </div>
          {appointments.isLoading ? (
            <TabSpinner />
          ) : appointments.error ? (
            <TabError message={appointments.error} />
          ) : appointments.data.length === 0 ? (
            <TabEmpty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Patient</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Therapist</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Scheduled At</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Duration</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Session #</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {appointments.data.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900">{a.patient_name}</td>
                      <td className="px-6 py-3 text-gray-600">{a.therapist_name}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {new Date(a.scheduled_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.status === "completed"
                            ? "bg-green-50 text-green-700"
                            : a.status === "scheduled" || a.status === "confirmed"
                            ? "bg-blue-50 text-blue-700"
                            : a.status === "missed" || a.status === "cancelled"
                            ? "bg-red-50 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{a.duration_mins} min</td>
                      <td className="px-6 py-3 text-gray-600">{a.session_number ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "therapists" && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Therapists</h2>
          </div>
          {therapists.isLoading ? (
            <TabSpinner />
          ) : therapists.error ? (
            <TabError message={therapists.error} />
          ) : therapists.data.length === 0 ? (
            <TabEmpty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Phone</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Specialization</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {therapists.data.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900">{t.name}</td>
                      <td className="px-6 py-3 text-gray-600">{t.phone ?? "—"}</td>
                      <td className="px-6 py-3 text-gray-600">{t.specialization ?? "—"}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.status === "active"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "plans" && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Treatment Plans</h2>
          </div>
          {plans.isLoading ? (
            <TabSpinner />
          ) : plans.error ? (
            <TabError message={plans.error} />
          ) : plans.data.length === 0 ? (
            <TabEmpty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Patient</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Therapist</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Diagnosis</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Sessions</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Fee/Session</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Total Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {plans.data.map((tp) => (
                    <tr key={tp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900">{tp.patient_name}</td>
                      <td className="px-6 py-3 text-gray-600">{tp.therapist_name}</td>
                      <td className="px-6 py-3 text-gray-600">{tp.diagnosis ?? "—"}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          tp.status === "active"
                            ? "bg-green-50 text-green-700"
                            : tp.status === "completed"
                            ? "bg-blue-50 text-blue-700"
                            : tp.status === "abandoned"
                            ? "bg-red-50 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {tp.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {tp.completed_sessions}/{tp.total_sessions ?? "?"}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {tp.fee_per_session != null ? `৳${tp.fee_per_session}` : "—"}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {tp.total_fee != null ? `৳${tp.total_fee}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
