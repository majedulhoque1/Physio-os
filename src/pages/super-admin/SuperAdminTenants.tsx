import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { CreateTenantModal } from "@/components/super-admin/CreateTenantModal";
import {
  useTenantList,
  updateClinic,
  deleteTenant,
  type TenantListItem,
} from "@/hooks/useSuperAdmin";

export function SuperAdminTenants() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<TenantListItem | null>(null);
  const [deleting, setDeleting] = useState<TenantListItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { tenants, isLoading, refetch } = useTenantList(search);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all clinic tenants on the platform
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Tenant
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        />
      </div>

      {actionError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Clinic</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  Loading tenants...
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  {search ? "No tenants match your search" : "No tenants yet"}
                </td>
              </tr>
            ) : (
              tenants.map((t) => (
                <tr
                  key={t.clinic_id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td
                    className="px-4 py-3 cursor-pointer"
                    onClick={() => navigate(`/super-admin/tenants/${t.clinic_id}`)}
                  >
                    <p className="font-medium text-gray-900">{t.clinic_name}</p>
                    <p className="text-xs text-gray-400">{t.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.owner_email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                      {t.plan_key ?? "none"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.subscription_status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setActionError(null);
                          setEditing(t);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        title="Edit clinic name"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setActionError(null);
                          setDeleting(t);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete tenant"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refetch();
          }}
        />
      )}

      {editing && (
        <EditTenantModal
          tenant={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
          onError={(msg) => {
            setActionError(msg);
            setEditing(null);
          }}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          tenant={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            refetch();
          }}
          onError={(msg) => {
            setActionError(msg);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

function EditTenantModal({
  tenant,
  onClose,
  onSaved,
  onError,
}: {
  tenant: TenantListItem;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(tenant.clinic_name);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const result = await updateClinic({ clinic_id: tenant.clinic_id, name: name.trim() });
    setSaving(false);
    if (result.error) onError(result.error);
    else onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Edit Clinic</h2>
        <p className="mt-1 text-sm text-gray-500">Update the clinic name.</p>
        <label className="mt-4 mb-1.5 block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        />
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  tenant,
  onClose,
  onDeleted,
  onError,
}: {
  tenant: TenantListItem;
  onClose: () => void;
  onDeleted: () => void;
  onError: (msg: string) => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [deletingState, setDeletingState] = useState(false);

  async function handleDelete() {
    setDeletingState(true);
    const result = await deleteTenant(tenant.clinic_id);
    setDeletingState(false);
    if (result.error) onError(result.error);
    else onDeleted();
  }

  const canDelete = confirmText === tenant.clinic_name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Delete Tenant</h2>
        <p className="mt-2 text-sm text-gray-600">
          This will permanently delete <span className="font-semibold">{tenant.clinic_name}</span> and all its patients, therapists, appointments, treatment plans, subscriptions and invoices. This cannot be undone.
        </p>
        <p className="mt-4 text-sm text-gray-700">
          Type <span className="font-mono font-semibold">{tenant.clinic_name}</span> to confirm:
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/10"
        />
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={deletingState}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || deletingState}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {deletingState ? "Deleting..." : "Delete tenant"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400">—</span>;

  const colors: Record<string, string> = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    trialing: "border-amber-200 bg-amber-50 text-amber-700",
    past_due: "border-red-200 bg-red-50 text-red-700",
    cancelled: "border-gray-200 bg-gray-100 text-gray-500",
    incomplete: "border-orange-200 bg-orange-50 text-orange-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        colors[status] ?? colors.incomplete
      }`}
    >
      {status}
    </span>
  );
}
