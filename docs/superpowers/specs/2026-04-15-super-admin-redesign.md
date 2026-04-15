# Super Admin Redesign — Design Spec
**Date:** 2026-04-15  
**Approach:** A — Stats-first dashboard with consistent neobrutalist system across all pages

---

## Scope

All pages under `/super-admin/*`:
- `SuperAdminDashboard.tsx`
- `SuperAdminProducts.tsx`
- `SuperAdminTenants.tsx`
- `SuperAdminBilling.tsx`
- `SuperAdminSettings.tsx`
- `SuperAdminShell.tsx` (navigation — minor fix only)

Out of scope: Login page, tenant detail pages, routing changes.

---

## 1. Dashboard (`SuperAdminDashboard.tsx`)

### Hero Stats Row
Four `nb-card` stat cards in a `grid gap-4 md:grid-cols-2 lg:grid-cols-4` layout.

Card order and accent colors:
| Metric | Accent Color | Icon |
|---|---|---|
| Monthly Revenue (MRR) | `#FF79C6` (pink) | `DollarSign` |
| Active Subscriptions | `#B4E7FF` (blue) | `TrendingUp` |
| Total Tenants | `#4ADE80` (green) | `Building2` |
| Total Users | `#FEF08A` (yellow) | `Users` |

MRR card uses `text-3xl` for the value (currently `text-2xl` — bump it up, it's the primary metric).  
All other cards use `text-3xl` (consistent with current Tenants/Users cards).  
No new data fetching — all from existing `usePlatformStats` / `sa_platform_stats_v2`.

### Per-Product Breakdown Section
Replace the current plain `<table>` with a `grid grid-cols-1 md:grid-cols-2 gap-4`.  
Each product gets its own `nb-card p-5` with:
- Product icon (from `iconMap` already in Shell) + display name as heading
- `product_key` in a monospace badge
- Tenant count as a prominent number
- Status badge (active/disabled)

Data source: `stats.by_product` array (already available). Only tenant count is available per-product from this RPC — that's sufficient for now.

---

## 2. Products Page (`SuperAdminProducts.tsx`)

Full visual rebuild. Replace the plain `<table>` with a `grid grid-cols-1 md:grid-cols-2 gap-4`.

Each product rendered as an `nb-card p-5`:
```
[Icon]  Display Name                    [Status Badge]
        product_key (monospace badge)
        Local / Remote badge
        
        [Enable / Disable button — nb-btn]
```

Badge colors:
- `active` → `#4ADE80`
- `disabled` → `#e5e7eb`
- Local → `#FEF08A`, Remote → `#B4E7FF`

The existing `toggle()` function stays unchanged — only the UI layer changes.

---

## 3. Tenants Page (`SuperAdminTenants.tsx`)

Mostly styled already. Targeted fixes only:
- Search input: ensure it uses `nb-input` class (or equivalent border-2 border-black styling)
- Table: ensure `<th>` cells use `text-xs font-bold uppercase tracking-wide text-gray-600` (consistent with Dashboard labels)
- Row action buttons (edit/delete icons): wrap in `nb-btn-icon` if the class exists, else apply `border-2 border-black p-1` inline style for consistency
- No structural changes

---

## 4. Billing Page (`SuperAdminBilling.tsx`)

Currently has sections but inconsistent card treatment. Fixes:
- Wrap each major section (Upgrade Requests, Invoices) in `nb-card p-5` with `nb-heading text-xl` section titles
- Ensure `InvoiceStatusBadge` uses the same `nb-badge` + `STATUS_COLORS` pattern already defined in the file (it already does — verify it's applied everywhere)
- Error states: use the same pink error banner pattern from Dashboard (`border: "2px solid #000", background: "#FF79C6"`)
- Product filter dropdown: apply `border-2 border-black` styling

---

## 5. Settings Page (`SuperAdminSettings.tsx`)

Apply standard neobrutalist wrapping:
- Page heading: `nb-heading text-4xl` + subtitle in `text-sm font-bold text-gray-600 uppercase tracking-wide`
- Form sections or info blocks: wrapped in `nb-card p-5`
- Buttons: `nb-btn`

(Exact content of Settings page not read — apply the above pattern to whatever structure exists.)

---

## 6. Navigation Shell (`SuperAdminShell.tsx`)

Navigation already has correct active state styling (`bg-[#4ADE80] text-black` + `border: "2px solid #000"`). No changes needed.

The Products dropdown and its sub-items are already in the sidebar. No new links required.

**One fix:** The brand label in the sidebar header reads "Physio OS" — this is a multi-product platform now. Change to "Super Admin" or "Platform Admin" to reflect the cross-product nature.

---

## Component Reuse

`SAStatCard.tsx` exists but hardcodes the icon background to `#4ADE80`. It needs one new optional prop: `accentColor?: string` (default `"#4ADE80"`). The icon background div should use this prop instead of the hardcoded value.

Dashboard currently rolls its own stat cards inline — migrate these to use `SAStatCard` with the `accentColor` prop.

---

## What Is NOT Changing

- All RPC calls, hooks, data fetching logic
- Routing structure
- `CreateTenantModal`
- Login page
- Tenant detail pages
- `super-admin.css` styles (use existing `nb-*` classes only)

---

## Success Criteria

1. Dashboard hero stats are visually prominent — MRR is the dominant number at a glance
2. Per-product breakdown uses cards, not a table
3. Products page uses the neobrutalist card grid — no plain unstyled table
4. All pages share consistent heading hierarchy, badge styles, and error states
5. No regressions in Tenants page functionality
