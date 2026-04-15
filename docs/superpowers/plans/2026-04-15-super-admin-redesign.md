# Super Admin Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the entire super admin section with a stats-first dashboard, consistent neobrutalist styling across all pages, and improved information density.

**Architecture:** Pure UI layer changes only — no data fetching, RPC calls, or routing changes. Existing `nb-*` CSS classes in `super-admin.css` are the design system. Each task touches one file (or the shared `SAStatCard` component), producing a visual improvement that is independently reviewable.

**Tech Stack:** React, TypeScript, Tailwind CSS, `super-admin.css` (`nb-*` classes), lucide-react icons

---

## File Map

| File | Change Type | What changes |
|---|---|---|
| `src/components/super-admin/SAStatCard.tsx` | Modify | Add optional `accentColor` prop |
| `src/pages/super-admin/SuperAdminDashboard.tsx` | Modify | Use `SAStatCard` with accent colors; per-product card grid |
| `src/pages/super-admin/SuperAdminProducts.tsx` | Modify | Replace plain table with `nb-card` grid |
| `src/pages/super-admin/SuperAdminSettings.tsx` | Modify | Full neobrutalist rebuild |
| `src/components/super-admin/SuperAdminShell.tsx` | Modify | Brand label fix |
| `src/pages/super-admin/SuperAdminTenants.tsx` | Read-only verify | Already styled — confirm search input has `nb-input` |
| `src/pages/super-admin/SuperAdminBilling.tsx` | Read-only verify | Already styled — no changes needed |

---

### Task 1: Add `accentColor` prop to `SAStatCard`

**Files:**
- Modify: `src/components/super-admin/SAStatCard.tsx`

- [ ] **Step 1: Update `SAStatCard` to accept `accentColor`**

Replace the entire file with:

```tsx
import type { LucideIcon } from "lucide-react";

interface SAStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accentColor?: string;
}

export function SAStatCard({ icon: Icon, label, value, accentColor = "#4ADE80" }: SAStatCardProps) {
  return (
    <div className="nb-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
            {label}
          </p>
          <p className="nb-heading mt-2 text-3xl text-black">{value}</p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center"
          style={{ background: accentColor, border: "2px solid #000", borderRadius: "2px" }}
        >
          <Icon className="h-5 w-5 text-black" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `SAStatCard`.

- [ ] **Step 3: Commit**

```bash
git add src/components/super-admin/SAStatCard.tsx
git commit -m "feat(super-admin): add accentColor prop to SAStatCard"
```

---

### Task 2: Redesign Dashboard — hero stats + per-product card grid

**Files:**
- Modify: `src/pages/super-admin/SuperAdminDashboard.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import { usePlatformStats } from "@/hooks/useSuperAdmin";
import { SAStatCard } from "@/components/super-admin/SAStatCard";
import { Users, Building2, TrendingUp, DollarSign, Package } from "lucide-react";

const PRODUCT_ACCENT: Record<string, string> = {
  physio_os: "#B4E7FF",
  construction_os: "#FEF08A",
};

export function SuperAdminDashboard() {
  const { stats, isLoading, error } = usePlatformStats();

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="nb-heading text-4xl text-black">Dashboard</h1>
          <p className="mt-1 text-sm font-bold text-gray-600 uppercase tracking-wide">
            System overview and key metrics
          </p>
        </div>
        <div
          className="px-4 py-3 text-sm font-bold text-black"
          style={{ border: "2px solid #000", background: "#FF79C6", borderRadius: "2px" }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
      </div>
    );
  }

  const mrrDisplay = (stats.mrr_cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="nb-heading text-4xl text-black">Dashboard</h1>
        <p className="mt-1 text-sm font-bold text-gray-600 uppercase tracking-wide">
          System overview and key metrics
        </p>
      </div>

      {/* Hero stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SAStatCard
          icon={DollarSign}
          label="Monthly Revenue"
          value={mrrDisplay}
          accentColor="#FF79C6"
        />
        <SAStatCard
          icon={TrendingUp}
          label="Active Subscriptions"
          value={stats.active_subscriptions}
          accentColor="#B4E7FF"
        />
        <SAStatCard
          icon={Building2}
          label="Total Tenants"
          value={stats.total_tenants}
          accentColor="#4ADE80"
        />
        <SAStatCard
          icon={Users}
          label="Total Users"
          value={stats.total_users}
          accentColor="#FEF08A"
        />
      </div>

      {/* Per-product breakdown */}
      {stats.by_product && stats.by_product.length > 0 && (
        <section>
          <h2 className="nb-heading text-xl text-black mb-4">Products</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {stats.by_product.map((item) => (
              <div key={item.product_key} className="nb-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="nb-heading text-lg text-black capitalize">
                      {item.product_key.replace(/_/g, " ")}
                    </p>
                    <p
                      className="mt-1 font-mono text-xs font-bold"
                      style={{
                        background: "#f3f4f6",
                        border: "1px solid #000",
                        borderRadius: "2px",
                        padding: "1px 6px",
                        display: "inline-block",
                      }}
                    >
                      {item.product_key}
                    </p>
                  </div>
                  <div
                    className="flex h-10 w-10 items-center justify-center"
                    style={{
                      background: PRODUCT_ACCENT[item.product_key] ?? "#e5e7eb",
                      border: "2px solid #000",
                      borderRadius: "2px",
                    }}
                  >
                    <Package className="h-5 w-5 text-black" />
                  </div>
                </div>
                <div className="mt-4 flex items-end gap-1">
                  <p className="nb-heading text-4xl text-black">{item.tenants}</p>
                  <p className="mb-1 text-sm font-bold text-gray-600 uppercase tracking-wide">tenants</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/super-admin/SuperAdminDashboard.tsx
git commit -m "feat(super-admin): redesign dashboard — hero stats + per-product card grid"
```

---

### Task 3: Rebuild Products page with `nb-card` grid

**Files:**
- Modify: `src/pages/super-admin/SuperAdminProducts.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import { useState } from "react";
import { Building2, HardHat, Package } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { supabase as supabaseClient } from "@/lib/supabase";
import type { LucideIcon } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseClient as any;

const iconMap: Record<string, LucideIcon> = {
  building: Building2,
  hardhat: HardHat,
  package: Package,
};

export default function SuperAdminProducts() {
  const { products, refetch } = useProducts({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(product_key: string, status: "active" | "disabled") {
    setBusy(true);
    const next = status === "active" ? "disabled" : "active";
    const { error: err } = await supabase
      .from("products")
      .update({ status: next })
      .eq("product_key", product_key);
    setBusy(false);
    if (err) setError(err.message);
    else refetch();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="nb-heading text-4xl text-black">Products</h1>
        <p className="mt-1 text-sm font-bold text-gray-600 uppercase tracking-wide">
          Registered products on the platform
        </p>
      </div>

      {error && (
        <div
          className="px-4 py-3 text-sm font-bold text-black"
          style={{ border: "2px solid #000", background: "#FF79C6", borderRadius: "2px" }}
        >
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {products.map((p) => {
          const Icon = iconMap[p.icon_key ?? ""] ?? Package;
          const isActive = p.status === "active";
          return (
            <div key={p.product_key} className="nb-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center"
                    style={{
                      background: isActive ? "#4ADE80" : "#e5e7eb",
                      border: "2px solid #000",
                      borderRadius: "2px",
                    }}
                  >
                    <Icon className="h-5 w-5 text-black" />
                  </div>
                  <div>
                    <p className="nb-heading text-lg text-black">{p.display_name}</p>
                    <p
                      className="mt-1 font-mono text-xs font-bold"
                      style={{
                        background: "#f3f4f6",
                        border: "1px solid #000",
                        borderRadius: "2px",
                        padding: "1px 6px",
                        display: "inline-block",
                      }}
                    >
                      {p.product_key}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className="nb-badge"
                    style={{ background: isActive ? "#4ADE80" : "#e5e7eb" }}
                  >
                    {p.status}
                  </span>
                  <span
                    className="nb-badge"
                    style={{ background: p.is_local ? "#FEF08A" : "#B4E7FF" }}
                  >
                    {p.is_local ? "local" : "remote"}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  className="nb-btn px-4 py-2 text-sm"
                  style={{ background: isActive ? "#fff" : "#4ADE80" }}
                  disabled={busy}
                  onClick={() => toggle(p.product_key, p.status)}
                >
                  {isActive ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
        Add new products by inserting into the{" "}
        <code className="font-mono normal-case">products</code> table. Remote products
        need <code className="font-mono normal-case">supabase_url</code>,{" "}
        <code className="font-mono normal-case">bridge_secret_name</code>, and the
        secret env var set on this project.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/super-admin/SuperAdminProducts.tsx
git commit -m "feat(super-admin): rebuild Products page with nb-card grid"
```

---

### Task 4: Rebuild Settings page with neobrutalist styling

**Files:**
- Modify: `src/pages/super-admin/SuperAdminSettings.tsx`

- [ ] **Step 1: Replace the file**

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

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!supabase || !user?.email) {
      setError("Not authenticated");
      return;
    }

    setIsLoading(true);

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInErr) {
      setIsLoading(false);
      setError("Current password is incorrect");
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsLoading(false);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="nb-heading text-4xl text-black">Settings</h1>
        <p className="mt-1 text-sm font-bold text-gray-600 uppercase tracking-wide">
          Manage your super admin account
        </p>
      </div>

      <div className="max-w-lg">
        <div className="nb-card p-6">
          {/* Section header */}
          <div className="mb-6 flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center"
              style={{ background: "#B4E7FF", border: "2px solid #000", borderRadius: "2px" }}
            >
              <KeyRound className="h-5 w-5 text-black" />
            </div>
            <div>
              <p className="nb-heading text-lg text-black">Change Password</p>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                Update your admin password
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-black uppercase tracking-wide">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="nb-input w-full px-3 py-2.5 text-sm text-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-black uppercase tracking-wide">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="nb-input w-full px-3 py-2.5 text-sm text-black"
              />
              <p className="mt-1 text-xs font-bold text-gray-500">Minimum 8 characters</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-black uppercase tracking-wide">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="nb-input w-full px-3 py-2.5 text-sm text-black"
              />
            </div>

            {error && (
              <div
                className="px-4 py-3 text-sm font-bold text-black"
                style={{ border: "2px solid #000", background: "#FF79C6", borderRadius: "2px" }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-black"
                style={{ border: "2px solid #000", background: "#4ADE80", borderRadius: "2px" }}
              >
                <CheckCircle2 className="h-4 w-4" />
                Password updated successfully
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="nb-btn bg-black px-5 py-2.5 text-sm text-white"
            >
              {isLoading ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/super-admin/SuperAdminSettings.tsx
git commit -m "feat(super-admin): rebuild Settings page with neobrutalist styling"
```

---

### Task 5: Fix Shell brand label

**Files:**
- Modify: `src/components/super-admin/SuperAdminShell.tsx`

- [ ] **Step 1: Change brand name from "Physio OS" to "Platform Admin"**

In `src/components/super-admin/SuperAdminShell.tsx`, find line 83:

```tsx
<p className="nb-heading text-sm text-black">Physio OS</p>
```

Replace with:

```tsx
<p className="nb-heading text-sm text-black">Platform Admin</p>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/super-admin/SuperAdminShell.tsx
git commit -m "fix(super-admin): brand label to Platform Admin (cross-product)"
```

---

### Task 6: Verify Tenants page search input styling

**Files:**
- Read-only: `src/pages/super-admin/SuperAdminTenants.tsx`

- [ ] **Step 1: Check the search input**

Open `src/pages/super-admin/SuperAdminTenants.tsx` and locate the search `<input>` (around line 60+). Confirm it has `nb-input` in its className.

If it **does** have `nb-input`: no change needed. Skip to commit.

If it **does not**: add `nb-input` to the className and remove any conflicting border/outline classes.

- [ ] **Step 2: Commit only if changed**

```bash
git add src/pages/super-admin/SuperAdminTenants.tsx
git commit -m "fix(super-admin): apply nb-input to Tenants search field"
```

If no change was needed, skip this commit.

---

### Task 7: Final visual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Check each page**

Navigate to `/super-admin` and verify:

| Page | What to check |
|---|---|
| Dashboard | MRR card is largest/most prominent; per-product breakdown shows cards not a table |
| Products | Cards with icon, key badge, local/remote badge, enable/disable button |
| Tenants | Search input has black border (`nb-input` style); table headers consistent |
| Billing | Sections have `nb-heading` titles; status badges colored correctly |
| Settings | `nb-card` wrapper; `nb-input` on all fields; black border error/success states |
| Sidebar | Brand reads "Platform Admin"; active nav item is green (`#4ADE80`) |

- [ ] **Step 3: Check for console errors**

Open browser DevTools → Console. Expected: no React errors or TypeScript runtime errors.

- [ ] **Step 4: Commit verification note**

```bash
git commit --allow-empty -m "chore(super-admin): visual verification complete"
```
