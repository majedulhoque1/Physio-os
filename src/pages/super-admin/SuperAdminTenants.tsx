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

const STATUS_COLORS: Record<string, string> = {
  active: "#4ADE80",
  trialing: "#FEF08A",
  past_due: "#FF79C6",
  cancelled: "#e5e7eb",
  incomplete: "#FF79C6",
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400 font-bold text-xs">—</span>;
  return (
    <span
      className="nb-badge"
      style={{ background: STATUS_COLORS[status] ?? "#FF79C6" }}
    >
      {status}
    </span>
  );
}

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
          <h1 className="nb-heading text-4xl text-black">Tenants</h1>
          <p className="mt-1 text-sm font-bold text-gray-600 uppercase tracking-wide">
            Manage all clinic tenants on the platform
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="nb-btn inline-flex items-center gap-2 bg-black px-4 py-2.5 text-sm text-white"
        >
          <Plus className="h-4 w-4" />
          Create Tenant
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="nb-input w-full pl-10 pr-4 py-2.5 text-sm text-black placeholder:text-gray-400"
        />
      </div>

      {actionError && (
        <p
          className="px-3.5 py-2.5 text-sm font-bold text-black"
          style={{ border: "2px solid #000", background: "#FF79C6", borderRadius: "2px" }}
        >
          {actionError}
        </p>
      )}

      {/* Table */}
      <div className="nb-table-wrap">
        <table className="nb-table">
          <thead>
            <tr>
              <th>Clinic</th>
              <th>Product</th>
              <th>Owner</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Created</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center font-bold text-gray-500">
                  Loading tenants...
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center font-bold text-gray-500">
                  {search ? "No tenants match your search" : "No tenants yet"}
                </td>
              </tr>
            ) : (
              tenants.map((t) => (
                <tr key={t.external_id}>
                  <td
                    className="cursor-pointer"
                    onClick={() =>
                      t.product_key && t.product_key !== "physio_os"
                        ? navigate(`/super-admin/products/${t.product_key}/tenants/${t.external_id}`)
                        : navigate(`/super-admin/tenants/${t.external_id}`)
                    }
                  >
                    <p className="font-bold text-black">{t.name}</p>
                  </td>
                  <td>
                    <span className="nb-badge bg-black text-white text-xs">{t.product_key || "physio_os"}</span>
                  </td>
                  <td className="font-medium text-gray-700">{t.owner_email ?? "—"}</td>
                  <td>
                    <span className="nb-badge bg-white">{t.plan_key ?? "none"}</span>
                  </td>
                  <td>
                    <StatusBadge status={t.subscription_status} />
                  </td>
                  <td className="text-gray-600 text-xs font-medium">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => { setActionError(null); setEditing(t); }}
                        className="nb-btn inline-flex h-8 w-8 items-center justify-center bg-[#FEF08A] text-black"
                        title="Edit clinic name"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { setActionError(null); setDeleting(t); }}
                        className="nb-btn inline-flex h-8 w-8 items-center justify-center bg-[#FF79C6] text-black"
                        title="Delete tenant"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
          onCreated={() => { setShowCreate(false); refetch(); }}
        />
      )}

      {editing && (
        <EditTenantModal
          tenant={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refetch(); }}
          onError={(msg) => { setActionError(msg); setEditing(null); }}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          tenant={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => { setDeleting(null); refetch(); }}
          onError={(msg) => { setActionError(msg); setDeleting(null); }}
        />
      )}
    </div>
  );
}

function EditTenantModal({
  tenant, onClose, onSaved, onError,
}: {
  tenant: TenantListItem;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(tenant.name);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const result = await updateClinic({ clinic_id: tenant.external_id, name: name.trim() });
    setSaving(false);
    if (result.error) onError(result.error);
    else onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="nb-modal w-full max-w-md p-6">
        <h2 className="nb-heading text-2xl text-black">Edit Clinic</h2>
        <p className="mt-1 text-sm font-medium text-gray-600">Update the clinic name.</p>
        <label className="mt-4 mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="nb-input w-full px-3 py-2.5 text-sm text-black"
        />
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="nb-btn bg-white px-4 py-2.5 text-sm text-black"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="nb-btn bg-black px-4 py-2.5 text-sm text-white"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  tenant, onClose, onDeleted, onError,
}: {
  tenant: TenantListItem;
  onClose: () => void;
  onDeleted: () => void;
  onError: (msg: string) => void;
}) {
  const [deletingState, setDeletingState] = useState(false);

  async function handleDelete() {
    setDeletingState(true);
    const result = await deleteTenant(tenant.external_id);
    setDeletingState(false);
    if (result.error) onError(result.error);
    else onDeleted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="nb-modal w-full max-w-md p-6">
        <h2 className="nb-heading text-2xl text-black">Delete Tenant</h2>
        <p className="mt-2 text-sm font-medium text-gray-700">
          Delete <span className="font-bold text-black">{tenant.name}</span>? This permanently removes all patients, therapists, appointments, treatment plans, subscriptions, and invoices. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={deletingState}
            className="nb-btn bg-white px-4 py-2.5 text-sm text-black"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deletingState}
            className="nb-btn bg-[#FF79C6] px-4 py-2.5 text-sm text-black"
          >
            {deletingState ? "Deleting..." : "Delete tenant"}
          </button>
        </div>
      </div>
    </div>
  );
}
