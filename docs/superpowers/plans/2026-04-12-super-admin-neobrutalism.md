# Super Admin Neobrutalism Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a neobrutalism visual theme (bold black borders, flat offset shadows, polka-dot background, Anton font, green/yellow/pink accents) to all super admin pages and components without touching any clinic dashboard files.

**Architecture:** A single scoped CSS file (`src/styles/super-admin.css`) defines all neobrutalism primitive classes (`.nb-card`, `.nb-btn`, `.nb-input`, etc.) and is imported only inside `SuperAdminShell.tsx` so styles never leak to the clinic dashboard. Anton font is loaded via Google Fonts in `index.html`. All 10 super admin files are restyled using these primitives plus Tailwind utilities.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide icons, Google Fonts (Anton)

---

## File Map

| File | Action |
|---|---|
| `index.html` | Add Anton Google Font `<link>` |
| `src/styles/super-admin.css` | **Create** — neobrutalism CSS primitives |
| `src/components/super-admin/SuperAdminShell.tsx` | Restyle shell, sidebar, nav, import CSS |
| `src/components/super-admin/SAStatCard.tsx` | Restyle stat cards |
| `src/components/super-admin/CreateTenantModal.tsx` | Convert dark→neobrutalism white |
| `src/pages/super-admin/SuperAdminLogin.tsx` | Restyle login page |
| `src/pages/super-admin/SuperAdminDashboard.tsx` | Restyle dashboard |
| `src/pages/super-admin/SuperAdminTenants.tsx` | Restyle tenants + inline modals + badges |
| `src/pages/super-admin/SuperAdminBilling.tsx` | Restyle billing |
| `src/pages/super-admin/SuperAdminTenantDetail.tsx` | Restyle tenant detail |
| `src/pages/super-admin/SuperAdminSettings.tsx` | Restyle settings |

---

## Task 1: Add Anton font + create CSS primitives file

**Files:**
- Modify: `index.html`
- Create: `src/styles/super-admin.css`

- [ ] **Step 1: Add Anton font link to `index.html`**

Replace the `<title>Physio OS</title>` line with:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Anton&display=swap" rel="stylesheet" />
    <title>Physio OS</title>
```

- [ ] **Step 2: Create `src/styles/super-admin.css`**

```css
/* ─── Neobrutalism primitives for Super Admin only ─── */
/* Imported once in SuperAdminShell.tsx — never affects clinic dashboard */

/* Polka-dot page background — apply to <main> */
.nb-bg {
  background-image: radial-gradient(#000 1.5px, transparent 1.5px);
  background-size: 20px 20px;
  background-color: #ffffff;
}

/* Cards */
.nb-card {
  border: 3px solid #000;
  border-radius: 2px;
  box-shadow: 6px 6px 0 0 #000;
  background: #fff;
}

/* Modals (heavier shadow) */
.nb-modal {
  border: 3px solid #000;
  border-radius: 2px;
  box-shadow: 10px 10px 0 0 #000;
  background: #fff;
}

/* Buttons */
.nb-btn {
  border: 3px solid #000;
  border-radius: 2px;
  box-shadow: 4px 4px 0 0 #000;
  font-weight: 700;
  cursor: pointer;
  transition: box-shadow 0.08s ease, transform 0.08s ease;
}
.nb-btn:hover:not(:disabled) {
  box-shadow: 2px 2px 0 0 #000;
  transform: translate(2px, 2px);
}
.nb-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Inputs & selects */
.nb-input {
  border: 2px solid #000;
  border-radius: 2px;
  background: #fff;
  outline: none;
  transition: box-shadow 0.08s ease;
}
.nb-input:focus {
  border-width: 3px;
  box-shadow: 3px 3px 0 0 #000;
}
.nb-input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

/* Status / plan badges */
.nb-badge {
  border: 2px solid #000;
  border-radius: 2px;
  font-weight: 700;
  font-size: 0.7rem;
  padding: 1px 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  display: inline-flex;
  align-items: center;
}

/* Tables */
.nb-table-wrap {
  border: 3px solid #000;
  border-radius: 2px;
  overflow: hidden;
}
.nb-table {
  width: 100%;
}
.nb-table thead tr {
  background: #000;
  color: #fff;
}
.nb-table thead th {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  padding: 10px 16px;
  text-align: left;
}
.nb-table tbody tr {
  border-bottom: 2px solid #000;
}
.nb-table tbody tr:last-child {
  border-bottom: none;
}
.nb-table tbody tr:hover {
  background: #fef08a;
}
.nb-table tbody td {
  padding: 10px 16px;
}

/* Anton headings */
.nb-heading {
  font-family: 'Anton', Impact, 'Arial Black', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  line-height: 1.1;
}
```

- [ ] **Step 3: Commit**

```bash
git add index.html src/styles/super-admin.css
git commit -m "feat: add Anton font and neobrutalism CSS primitives for super admin"
```

---

## Task 2: Restyle `SuperAdminShell.tsx`

**Files:**
- Modify: `src/components/super-admin/SuperAdminShell.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  LogOut,
  Menu,
  X,
  Shield,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import "../../styles/super-admin.css";

const navItems = [
  { to: "/super-admin", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/super-admin/tenants", icon: Building2, label: "Tenants", end: false },
  { to: "/super-admin/billing", icon: CreditCard, label: "Billing", end: false },
  { to: "/super-admin/settings", icon: SettingsIcon, label: "Settings", end: false },
];

export function SuperAdminShell() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate("/super-admin/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-white transition-transform lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ borderRight: "3px solid #000" }}
      >
        {/* Brand */}
        <div
          className="flex h-14 items-center gap-2.5 px-4"
          style={{ borderBottom: "3px solid #000" }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center"
            style={{ background: "#000", border: "2px solid #000" }}
          >
            <Shield className="h-4 w-4" style={{ color: "#4ADE80" }} />
          </div>
          <div>
            <p className="nb-heading text-sm text-black leading-none">Physio OS</p>
            <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider font-bold">System Admin</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-black hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 text-sm font-bold transition-all ${
                  isActive
                    ? "bg-[#4ADE80] text-black"
                    : "text-black hover:bg-yellow-100"
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { border: "2px solid #000", borderRadius: "2px" }
                  : { border: "2px solid transparent", borderRadius: "2px" }
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3" style={{ borderTop: "3px solid #000" }}>
          <p className="mb-1.5 truncate px-2 text-xs text-gray-500 font-bold uppercase">Super Admin</p>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-bold text-black hover:bg-yellow-100 transition-colors"
            style={{ border: "2px solid transparent", borderRadius: "2px" }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header */}
        <header
          className="flex h-12 items-center gap-3 bg-white px-4 lg:hidden"
          style={{ borderBottom: "3px solid #000" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-black"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="nb-heading text-sm text-black">System Admin</span>
        </header>

        {/* Page content */}
        <main className="nb-bg flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/super-admin/SuperAdminShell.tsx
git commit -m "feat: apply neobrutalism to SuperAdminShell"
```

---

## Task 3: Restyle `SAStatCard.tsx`

**Files:**
- Modify: `src/components/super-admin/SAStatCard.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import type { LucideIcon } from "lucide-react";

interface SAStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
}

export function SAStatCard({ icon: Icon, label, value }: SAStatCardProps) {
  return (
    <div className="nb-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-black uppercase tracking-wider">
            {label}
          </p>
          <p className="nb-heading mt-1.5 text-3xl text-black">{value}</p>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center"
          style={{ background: "#4ADE80", border: "2px solid #000", borderRadius: "2px" }}
        >
          <Icon className="h-4 w-4 text-black" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/super-admin/SAStatCard.tsx
git commit -m "feat: apply neobrutalism to SAStatCard"
```

---

## Task 4: Restyle `SuperAdminLogin.tsx`

**Files:**
- Modify: `src/pages/super-admin/SuperAdminLogin.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const SA_EMAIL = "majedulhoqueofficials@gmail.com";

export function SuperAdminLogin() {
  const { signIn, isAuthenticated, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && isSuperAdmin) {
      navigate("/super-admin", { replace: true });
    }
  }, [isAuthenticated, isSuperAdmin, navigate]);

  if (isAuthenticated && isSuperAdmin) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const result = await signIn(SA_EMAIL, password);
    setIsLoading(false);
    if (result.error) { setError(result.error); return; }
    setTimeout(() => navigate("/super-admin", { replace: true }), 100);
  }

  return (
    <div
      className="nb-bg flex min-h-screen items-center justify-center px-4"
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span
            className="mx-auto inline-flex h-12 w-12 items-center justify-center"
            style={{ background: "#4ADE80", border: "3px solid #000", borderRadius: "2px" }}
          >
            <Shield className="h-6 w-6 text-black" />
          </span>
          <h1 className="nb-heading mt-4 text-4xl text-black">
            System Admin
          </h1>
          <p className="mt-1 text-sm font-bold text-gray-600 uppercase tracking-wider">
            Physio OS Platform Control
          </p>
        </div>

        {/* Login card */}
        <div className="nb-modal p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={SA_EMAIL}
                disabled
                className="nb-input w-full px-3.5 py-2.5 text-sm text-gray-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                autoFocus
                className="nb-input w-full px-3.5 py-2.5 text-sm text-black placeholder:text-gray-400"
              />
            </div>

            {error && (
              <p
                className="px-3.5 py-2.5 text-sm font-bold text-black"
                style={{ border: "2px solid #000", background: "#FF79C6", borderRadius: "2px" }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="nb-btn w-full bg-black px-4 py-2.5 text-sm text-white"
            >
              {isLoading ? "Authenticating..." : "Access Panel"}
            </button>
          </form>
        </div>

        <button
          onClick={() => navigate("/login")}
          className="mt-5 block w-full text-center text-xs font-bold text-gray-500 hover:text-black transition-colors uppercase tracking-wider"
        >
          Back to clinic login
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/super-admin/SuperAdminLogin.tsx
git commit -m "feat: apply neobrutalism to SuperAdminLogin"
```

---

## Task 5: Restyle `SuperAdminDashboard.tsx`

**Files:**
- Modify: `src/pages/super-admin/SuperAdminDashboard.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import { useNavigate } from "react-router-dom";
import { Building2, Users, CreditCard, DollarSign } from "lucide-react";
import { SAStatCard } from "@/components/super-admin/SAStatCard";
import { usePlatformStats, useTenantList } from "@/hooks/useSuperAdmin";

const STATUS_COLORS: Record<string, string> = {
  active: "#4ADE80",
  trialing: "#FEF08A",
  past_due: "#FF79C6",
  cancelled: "#e5e7eb",
  incomplete: "#FF79C6",
};

function SubscriptionStatusBadge({ status }: { status: string | null }) {
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

export function SuperAdminDashboard() {
  const { stats, isLoading: statsLoading } = usePlatformStats();
  const { tenants, isLoading: tenantsLoading } = useTenantList("");
  const navigate = useNavigate();
  const recentTenants = tenants.slice(0, 10);

  function formatMrr(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="nb-heading text-4xl text-black">Platform Overview</h1>
        <p className="mt-1 text-sm font-bold text-gray-600 uppercase tracking-wide">
          Cross-tenant metrics for Physio OS
        </p>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[88px] animate-pulse"
              style={{ border: "3px solid #000", borderRadius: "2px", background: "#e5e7eb" }}
            />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SAStatCard icon={Building2} label="Total Clinics" value={stats.total_clinics} />
          <SAStatCard icon={Users} label="Total Users" value={stats.total_users} />
          <SAStatCard icon={CreditCard} label="Active Subs" value={stats.active_subscriptions} />
          <SAStatCard icon={DollarSign} label="MRR" value={formatMrr(stats.mrr_cents)} />
        </div>
      ) : null}

      {/* Recent Tenants */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="nb-heading text-xl text-black">Recent Clinics</h2>
          <button
            onClick={() => navigate("/super-admin/tenants")}
            className="nb-btn bg-white text-black px-3 py-1.5 text-sm"
          >
            View all
          </button>
        </div>

        <div className="nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>Clinic</th>
                <th>Owner</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {tenantsLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center font-bold text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : recentTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center font-bold text-gray-500">
                    No clinics yet
                  </td>
                </tr>
              ) : (
                recentTenants.map((t) => (
                  <tr
                    key={t.clinic_id}
                    onClick={() => navigate(`/super-admin/tenants/${t.clinic_id}`)}
                    className="cursor-pointer"
                  >
                    <td>
                      <p className="font-bold text-black">{t.clinic_name}</p>
                      <p className="text-xs text-gray-500">{t.slug}</p>
                    </td>
                    <td className="font-medium text-gray-700">{t.owner_email ?? "—"}</td>
                    <td>
                      <span className="nb-badge bg-white">{t.plan_key ?? "none"}</span>
                    </td>
                    <td>
                      <SubscriptionStatusBadge status={t.subscription_status} />
                    </td>
                    <td className="text-gray-600 text-xs font-medium">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/super-admin/SuperAdminDashboard.tsx
git commit -m "feat: apply neobrutalism to SuperAdminDashboard"
```

---

## Task 6: Restyle `SuperAdminTenants.tsx`

**Files:**
- Modify: `src/pages/super-admin/SuperAdminTenants.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
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
                <td colSpan={6} className="py-12 text-center font-bold text-gray-500">
                  Loading tenants...
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center font-bold text-gray-500">
                  {search ? "No tenants match your search" : "No tenants yet"}
                </td>
              </tr>
            ) : (
              tenants.map((t) => (
                <tr key={t.clinic_id}>
                  <td
                    className="cursor-pointer"
                    onClick={() => navigate(`/super-admin/tenants/${t.clinic_id}`)}
                  >
                    <p className="font-bold text-black">{t.clinic_name}</p>
                    <p className="text-xs text-gray-500">{t.slug}</p>
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
    const result = await deleteTenant(tenant.clinic_id);
    setDeletingState(false);
    if (result.error) onError(result.error);
    else onDeleted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="nb-modal w-full max-w-md p-6">
        <h2 className="nb-heading text-2xl text-black">Delete Tenant</h2>
        <p className="mt-2 text-sm font-medium text-gray-700">
          Delete <span className="font-bold text-black">{tenant.clinic_name}</span>? This permanently removes all patients, therapists, appointments, treatment plans, subscriptions, and invoices. This cannot be undone.
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/super-admin/SuperAdminTenants.tsx
git commit -m "feat: apply neobrutalism to SuperAdminTenants"
```

---

## Task 7: Restyle `CreateTenantModal.tsx`

**Files:**
- Modify: `src/components/super-admin/CreateTenantModal.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import { useState } from "react";
import { X, Eye, EyeOff, Copy, Check } from "lucide-react";
import { createTenant } from "@/hooks/useSuperAdmin";

interface CreateTenantModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTenantModal({ onClose, onCreated }: CreateTenantModalProps) {
  const [clinicName, setClinicName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [planKey, setPlanKey] = useState("starter");
  const [tempPassword, setTempPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (tempPassword.length < 8) { setError("Temp password must be at least 8 characters."); return; }
    setIsSubmitting(true);
    const result = await createTenant({
      clinic_name: clinicName.trim(),
      owner_email: ownerEmail.trim(),
      plan_key: planKey,
      trial_end: null,
      temp_password: tempPassword,
    });
    setIsSubmitting(false);
    if (result.error) { setError(result.error); return; }
    setSuccess({ email: ownerEmail.trim(), password: tempPassword });
  }

  function handleCopy() {
    if (!success) return;
    navigator.clipboard.writeText(`Email: ${success.email}\nPassword: ${success.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleClose() {
    if (success) onCreated();
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="nb-modal w-full max-w-md">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "3px solid #000" }}
        >
          <h2 className="nb-heading text-2xl text-black">
            {success ? "Tenant Created" : "Create Tenant"}
          </h2>
          <button
            onClick={handleClose}
            className="nb-btn bg-white p-1 text-black"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="space-y-4 p-6">
            <p className="text-sm font-bold text-gray-700">
              Share these credentials with the clinic owner. They won't be shown again.
            </p>
            <div
              className="p-4 space-y-2 text-sm"
              style={{ border: "2px solid #000", background: "#FEF08A", borderRadius: "2px" }}
            >
              <div>
                <span className="font-bold text-black uppercase text-xs tracking-wide">Email: </span>
                <span className="font-mono font-bold text-black">{success.email}</span>
              </div>
              <div>
                <span className="font-bold text-black uppercase text-xs tracking-wide">Password: </span>
                <span className="font-mono font-bold text-black">{success.password}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="nb-btn flex-1 inline-flex items-center justify-center gap-2 bg-white px-4 py-2.5 text-sm text-black"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy credentials"}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="nb-btn flex-1 bg-[#4ADE80] px-4 py-2.5 text-sm text-black"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">
                Clinic Name
              </label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                required
                autoFocus
                placeholder="e.g. PhysioFirst Dhaka"
                className="nb-input w-full px-3.5 py-2.5 text-sm text-black placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">
                Owner Email
              </label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                required
                placeholder="owner@clinic.com"
                className="nb-input w-full px-3.5 py-2.5 text-sm text-black placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">
                Temp Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  className="nb-input w-full px-3.5 py-2.5 pr-10 text-sm text-black placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-black hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Used only if the owner account is newly created. Share with the clinic owner to log in.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">
                Plan
              </label>
              <select
                value={planKey}
                onChange={(e) => setPlanKey(e.target.value)}
                className="nb-input w-full px-3.5 py-2.5 text-sm text-black"
              >
                <option value="starter">Basic</option>
              </select>
            </div>

            {error && (
              <p
                className="px-3.5 py-2.5 text-sm font-bold text-black"
                style={{ border: "2px solid #000", background: "#FF79C6", borderRadius: "2px" }}
              >
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="nb-btn flex-1 bg-white px-4 py-2.5 text-sm text-black"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="nb-btn flex-1 bg-black px-4 py-2.5 text-sm text-white"
              >
                {isSubmitting ? "Creating..." : "Create Tenant"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/super-admin/CreateTenantModal.tsx
git commit -m "feat: apply neobrutalism to CreateTenantModal"
```

---

## Task 8: Restyle `SuperAdminBilling.tsx`

**Files:**
- Modify: `src/pages/super-admin/SuperAdminBilling.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/super-admin/SuperAdminBilling.tsx
git commit -m "feat: apply neobrutalism to SuperAdminBilling"
```

---

## Task 9: Restyle `SuperAdminTenantDetail.tsx`

**Files:**
- Modify: `src/pages/super-admin/SuperAdminTenantDetail.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Users, Stethoscope, CalendarDays, ClipboardList } from "lucide-react";
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

const STATUS_COLORS: Record<string, string> = {
  active: "#4ADE80",
  trialing: "#FEF08A",
  past_due: "#FF79C6",
  cancelled: "#e5e7eb",
  incomplete: "#FF79C6",
  completed: "#bfdbfe",
  abandoned: "#FF79C6",
  scheduled: "#bfdbfe",
  confirmed: "#bfdbfe",
  missed: "#FF79C6",
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400 font-bold text-xs">—</span>;
  return (
    <span className="nb-badge" style={{ background: STATUS_COLORS[status] ?? "#e5e7eb" }}>
      {status}
    </span>
  );
}

function TabSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div
        className="h-6 w-6 animate-spin"
        style={{ border: "3px solid #000", borderTopColor: "transparent", borderRadius: "50%" }}
      />
    </div>
  );
}

function TabEmpty() {
  return <p className="py-12 text-center text-sm font-bold text-gray-500 uppercase tracking-wide">No records found.</p>;
}

function TabError({ message }: { message: string }) {
  return <p className="py-12 text-center text-sm font-bold text-black">{message}</p>;
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
    if (result.error) { setSaveError(result.error); return; }
    refetch();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="h-7 w-7 animate-spin"
          style={{ border: "3px solid #000", borderTopColor: "transparent", borderRadius: "50%" }}
        />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="py-20 text-center">
        <p className="font-bold text-black">{error ?? "Tenant not found"}</p>
        <button
          onClick={() => navigate("/super-admin/tenants")}
          className="mt-4 nb-btn bg-white px-4 py-2 text-sm text-black inline-block"
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
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-black transition-colors uppercase tracking-wide"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tenants
        </button>
        <h1 className="nb-heading text-4xl text-black">{clinic.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-gray-600">
          <span>Slug: {clinic.slug}</span>
          <span>Owner: {owner.full_name ?? owner.email ?? "—"}</span>
          {owner.email && <span>{owner.email}</span>}
          <span>Created: {clinic.created_at ? new Date(clinic.created_at).toLocaleDateString() : "—"}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "3px solid #000" }}>
        <nav className="-mb-px flex gap-1" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`whitespace-nowrap pb-3 px-4 text-sm font-bold uppercase tracking-wide transition-colors ${
                activeTab === tab.id
                  ? "text-black"
                  : "text-gray-500 hover:text-black"
              }`}
              style={
                activeTab === tab.id
                  ? { borderBottom: "4px solid #000", marginBottom: "-3px" }
                  : {}
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SAStatCard icon={Users} label="Patients" value={stats.total_patients} />
            <SAStatCard icon={Stethoscope} label="Therapists" value={stats.total_therapists} />
            <SAStatCard icon={CalendarDays} label="Appointments" value={stats.total_appointments} />
            <SAStatCard icon={ClipboardList} label="Active Plans" value={stats.active_treatment_plans} />
          </div>

          <div className="nb-card p-6">
            <h2 className="nb-heading text-xl text-black mb-6">Subscription Management</h2>
            {saveError && (
              <p
                className="mb-4 px-3.5 py-2.5 text-sm font-bold text-black"
                style={{ border: "2px solid #000", background: "#FF79C6", borderRadius: "2px" }}
              >
                {saveError}
              </p>
            )}
            {!sub ? (
              <p className="font-bold text-gray-500">No subscription found for this clinic.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">Plan</label>
                  <div className="flex gap-2">
                    <select
                      value={planKey}
                      onChange={(e) => setPlanKey(e.target.value)}
                      className="nb-input flex-1 px-3 py-2.5 text-sm text-black"
                    >
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                    <button
                      onClick={() => handleUpdate("plan")}
                      disabled={saving === "plan"}
                      className="nb-btn bg-black px-4 py-2.5 text-sm text-white"
                    >
                      {saving === "plan" ? "..." : "Save"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">Status</label>
                  <div className="flex gap-2">
                    <select
                      value={subStatus}
                      onChange={(e) => setSubStatus(e.target.value)}
                      className="nb-input flex-1 px-3 py-2.5 text-sm text-black"
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
                      className="nb-btn bg-black px-4 py-2.5 text-sm text-white"
                    >
                      {saving === "status" ? "..." : "Save"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">Trial Ends</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={trialEnd}
                      onChange={(e) => setTrialEnd(e.target.value)}
                      className="nb-input flex-1 px-3 py-2.5 text-sm text-black"
                    />
                    <button
                      onClick={() => handleUpdate("trial")}
                      disabled={saving === "trial"}
                      className="nb-btn bg-black px-4 py-2.5 text-sm text-white"
                    >
                      {saving === "trial" ? "..." : "Save"}
                    </button>
                  </div>
                </div>
                {sub.current_period_start && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Current period:{" "}
                      {new Date(sub.current_period_start).toLocaleDateString()} —{" "}
                      {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "ongoing"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "patients" && (
        <div className="nb-table-wrap">
          <div className="px-6 py-4" style={{ borderBottom: "2px solid #000", background: "#000" }}>
            <h2 className="nb-heading text-lg text-white">Patients</h2>
          </div>
          {patients.isLoading ? <TabSpinner /> : patients.error ? <TabError message={patients.error} /> : patients.data.length === 0 ? <TabEmpty /> : (
            <table className="nb-table">
              <thead>
                <tr>
                  <th>Name</th><th>Phone</th><th>Age</th><th>Gender</th>
                  <th>Diagnosis</th><th>Therapist</th><th>Status</th><th>Sessions</th>
                </tr>
              </thead>
              <tbody>
                {patients.data.map((p) => (
                  <tr key={p.id}>
                    <td className="font-bold text-black">{p.name}</td>
                    <td className="font-medium text-gray-700">{p.phone}</td>
                    <td className="font-medium text-gray-700">{p.age ?? "—"}</td>
                    <td className="font-medium text-gray-700">{p.gender ?? "—"}</td>
                    <td className="font-medium text-gray-700">{p.diagnosis ?? "—"}</td>
                    <td className="font-medium text-gray-700">{p.assigned_therapist_name ?? "—"}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="font-medium text-gray-700">{p.completed_sessions}/{p.total_sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "appointments" && (
        <div className="nb-table-wrap">
          <div className="px-6 py-4" style={{ borderBottom: "2px solid #000", background: "#000" }}>
            <h2 className="nb-heading text-lg text-white">Appointments</h2>
          </div>
          {appointments.isLoading ? <TabSpinner /> : appointments.error ? <TabError message={appointments.error} /> : appointments.data.length === 0 ? <TabEmpty /> : (
            <table className="nb-table">
              <thead>
                <tr>
                  <th>Patient</th><th>Therapist</th><th>Scheduled At</th>
                  <th>Status</th><th>Duration</th><th>Session #</th>
                </tr>
              </thead>
              <tbody>
                {appointments.data.map((a) => (
                  <tr key={a.id}>
                    <td className="font-bold text-black">{a.patient_name}</td>
                    <td className="font-medium text-gray-700">{a.therapist_name}</td>
                    <td className="font-medium text-gray-700">{new Date(a.scheduled_at).toLocaleString()}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="font-medium text-gray-700">{a.duration_mins} min</td>
                    <td className="font-medium text-gray-700">{a.session_number ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "therapists" && (
        <div className="nb-table-wrap">
          <div className="px-6 py-4" style={{ borderBottom: "2px solid #000", background: "#000" }}>
            <h2 className="nb-heading text-lg text-white">Therapists</h2>
          </div>
          {therapists.isLoading ? <TabSpinner /> : therapists.error ? <TabError message={therapists.error} /> : therapists.data.length === 0 ? <TabEmpty /> : (
            <table className="nb-table">
              <thead>
                <tr>
                  <th>Name</th><th>Phone</th><th>Specialization</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {therapists.data.map((t) => (
                  <tr key={t.id}>
                    <td className="font-bold text-black">{t.name}</td>
                    <td className="font-medium text-gray-700">{t.phone ?? "—"}</td>
                    <td className="font-medium text-gray-700">{t.specialization ?? "—"}</td>
                    <td><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "plans" && (
        <div className="nb-table-wrap">
          <div className="px-6 py-4" style={{ borderBottom: "2px solid #000", background: "#000" }}>
            <h2 className="nb-heading text-lg text-white">Treatment Plans</h2>
          </div>
          {plans.isLoading ? <TabSpinner /> : plans.error ? <TabError message={plans.error} /> : plans.data.length === 0 ? <TabEmpty /> : (
            <table className="nb-table">
              <thead>
                <tr>
                  <th>Patient</th><th>Therapist</th><th>Diagnosis</th>
                  <th>Status</th><th>Sessions</th><th>Fee/Session</th><th>Total Fee</th>
                </tr>
              </thead>
              <tbody>
                {plans.data.map((tp) => (
                  <tr key={tp.id}>
                    <td className="font-bold text-black">{tp.patient_name}</td>
                    <td className="font-medium text-gray-700">{tp.therapist_name}</td>
                    <td className="font-medium text-gray-700">{tp.diagnosis ?? "—"}</td>
                    <td><StatusBadge status={tp.status} /></td>
                    <td className="font-medium text-gray-700">{tp.completed_sessions}/{tp.total_sessions ?? "?"}</td>
                    <td className="font-medium text-gray-700">{tp.fee_per_session != null ? `৳${tp.fee_per_session}` : "—"}</td>
                    <td className="font-medium text-gray-700">{tp.total_fee != null ? `৳${tp.total_fee}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/super-admin/SuperAdminTenantDetail.tsx
git commit -m "feat: apply neobrutalism to SuperAdminTenantDetail"
```

---

## Task 10: Restyle `SuperAdminSettings.tsx`

**Files:**
- Modify: `src/pages/super-admin/SuperAdminSettings.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import { useState } from "react";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function SuperAdminSettings() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword.length < 8) { setError("New password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    if (!supabase || !user?.email) { setError("Not authenticated"); return; }
    setIsLoading(true);
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (signInErr) { setIsLoading(false); setError("Current password is incorrect"); return; }
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
    setIsLoading(false);
    if (updateErr) { setError(updateErr.message); return; }
    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="nb-heading text-4xl text-black">Settings</h1>
        <p className="mt-1 text-sm font-bold text-gray-600 uppercase tracking-wide">
          Manage your super admin account
        </p>
      </div>

      <div className="nb-card p-6">
        <div className="mb-5 flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center"
            style={{ background: "#4ADE80", border: "2px solid #000", borderRadius: "2px" }}
          >
            <KeyRound className="h-4 w-4 text-black" />
          </div>
          <div>
            <h2 className="nb-heading text-xl text-black">Change Password</h2>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Update your admin password</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">
              Current password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="nb-input w-full px-3.5 py-2.5 text-sm text-black"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="nb-input w-full px-3.5 py-2.5 text-sm text-black"
            />
            <p className="mt-1 text-xs font-bold text-gray-500 uppercase tracking-wide">Minimum 8 characters</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="nb-input w-full px-3.5 py-2.5 text-sm text-black"
            />
          </div>

          {error && (
            <p
              className="px-3.5 py-2.5 text-sm font-bold text-black"
              style={{ border: "2px solid #000", background: "#FF79C6", borderRadius: "2px" }}
            >
              {error}
            </p>
          )}

          {success && (
            <p
              className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-bold text-black"
              style={{ border: "2px solid #000", background: "#4ADE80", borderRadius: "2px" }}
            >
              <CheckCircle2 className="h-4 w-4" />
              Password updated successfully
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="nb-btn bg-black px-4 py-2.5 text-sm text-white"
          >
            {isLoading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/super-admin/SuperAdminSettings.tsx
git commit -m "feat: apply neobrutalism to SuperAdminSettings"
```

---

## Self-Review

**Spec coverage:**
- ✅ CSS primitives file with all nb-* classes
- ✅ Anton font via Google Fonts
- ✅ Polka-dot background on main content area
- ✅ Sidebar neobrutalism (black border, green active state, yellow hover)
- ✅ All stat cards use nb-card + green icon box
- ✅ All tables use nb-table-wrap + nb-table with black header
- ✅ All buttons use nb-btn with correct color variants
- ✅ All inputs use nb-input
- ✅ All modals use nb-modal with 10px shadow
- ✅ All status badges use nb-badge with flat fill color map
- ✅ Login page fully restyled with polka-dot bg
- ✅ CreateTenantModal converted from dark to white neobrutalism
- ✅ Settings page included (was in spec, plan now covers it)
- ✅ No clinic dashboard files touched

**Placeholder scan:** No TBDs, no vague steps — all steps contain complete code.

**Type consistency:** `STATUS_COLORS` record defined locally in each page file that uses it. `nb-*` classes referenced consistently across all tasks. `SAStatCard` updated in Task 3 and used identically in Tasks 5 and 9.
