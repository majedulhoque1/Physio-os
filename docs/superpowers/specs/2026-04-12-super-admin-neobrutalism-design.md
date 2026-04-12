# Super Admin Neobrutalism Theme — Design Spec

**Date:** 2026-04-12  
**Scope:** Super Admin dashboard only (`/super-admin/*`). Clinic dashboard untouched.

---

## Goal

Apply a neobrutalism visual theme to the super admin area. Distinctive from the clean clinic dashboard — makes the admin context immediately obvious.

---

## Design Tokens

| Token | Value |
|---|---|
| Background | `#FFFFFF` with polka-dot pattern |
| Text | `#000000` |
| Border | `3px solid #000000` |
| Border radius | `2px` (near-zero, sharp corners) |
| Card shadow | `6px 6px 0px 0px #000000` |
| Modal shadow | `10px 10px 0px 0px #000000` |
| Accent green | `#4ADE80` (Tailwind `green-400`) |
| Accent yellow (badges) | `#FEF08A` (Tailwind `yellow-200`) |
| Accent pink (danger) | `#FF79C6` |
| Display font | Anton (Google Fonts) — fallback: `Impact, 'Arial Black', sans-serif` |
| Body font | System default (Inter/sans-serif) |

**Polka-dot CSS pattern:**
```css
background-image: radial-gradient(#000 1.5px, transparent 1.5px);
background-size: 20px 20px;
background-color: #ffffff;
```

---

## CSS Primitives — `src/styles/super-admin.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Anton&display=swap');

.nb-card {
  border: 3px solid #000;
  border-radius: 2px;
  box-shadow: 6px 6px 0 0 #000;
  background: #fff;
}

.nb-modal {
  border: 3px solid #000;
  border-radius: 2px;
  box-shadow: 10px 10px 0 0 #000;
  background: #fff;
}

.nb-btn {
  border: 3px solid #000;
  border-radius: 2px;
  box-shadow: 4px 4px 0 0 #000;
  font-weight: 700;
  transition: box-shadow 0.1s ease, transform 0.1s ease;
}

.nb-btn:hover:not(:disabled) {
  box-shadow: 2px 2px 0 0 #000;
  transform: translate(2px, 2px);
}

.nb-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nb-input {
  border: 2px solid #000;
  border-radius: 2px;
  background: #fff;
  outline: none;
}

.nb-input:focus {
  border: 3px solid #000;
  box-shadow: 3px 3px 0 0 #000;
}

.nb-badge {
  border: 2px solid #000;
  border-radius: 2px;
  font-weight: 700;
  font-size: 0.7rem;
  padding: 1px 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.nb-table-wrap {
  border: 3px solid #000;
  border-radius: 2px;
  overflow: hidden;
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
}

.nb-table tbody tr {
  border-bottom: 2px solid #000;
}

.nb-table tbody tr:last-child {
  border-bottom: none;
}

.nb-table tbody tr:hover {
  background: #FEF08A;
}

.nb-heading {
  font-family: 'Anton', Impact, 'Arial Black', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
```

---

## Status Badge Color Map

All badges use `.nb-badge` (black border, 2px, 2px radius). Fill colors:

| Status | Background | Text |
|---|---|---|
| active | `#4ADE80` | `#000` |
| trialing | `#FEF08A` | `#000` |
| past_due | `#FF79C6` | `#000` |
| incomplete | `#FF79C6` | `#000` |
| cancelled | `#e5e7eb` | `#000` |
| paid | `#4ADE80` | `#000` |
| open | `#FEF08A` | `#000` |

---

## Component-by-Component Changes

### `SuperAdminShell.tsx`
- Import `../../styles/super-admin.css`
- Root bg: white + polka-dot on `<main>`
- Sidebar: `bg-white border-r-[3px] border-black w-60`
- Brand box: black bg, `#4ADE80` Shield icon, "PHYSIO OS" in `.nb-heading text-white`, "SYSTEM ADMIN" subtext small white
- Active nav: `bg-[#4ADE80] border-l-4 border-black text-black font-bold`
- Inactive nav: `hover:bg-yellow-100`
- Mobile header: white bg, `border-b-[3px] border-black`

### `SAStatCard.tsx`
- Replace `rounded-xl border border-gray-200` with `.nb-card`
- Icon box: `bg-[#4ADE80] border-2 border-black rounded-none`
- Label: uppercase, tracking-wider, bold, black
- Value: Anton font (`.nb-heading`)

### `SuperAdminLogin.tsx`
- Full-screen polka-dot bg
- Card: `.nb-modal` (10px shadow)
- Shield icon box: `bg-[#4ADE80] border-2 border-black`
- Title "SYSTEM ADMIN": `.nb-heading text-3xl`
- Email input: `.nb-input` disabled state `bg-gray-100`
- Password input: `.nb-input`
- Submit button: `.nb-btn bg-black text-white px-4 py-2.5 w-full`
- Error: black border, `bg-[#FF79C6]` bg, black text

### `SuperAdminDashboard.tsx`
- `h1`: `.nb-heading text-3xl`
- Stat grid: `SAStatCard` already updated
- Recent clinics table: `.nb-table-wrap` + `.nb-table`
- "View all" button: `.nb-btn bg-white text-black px-3 py-1.5 text-sm`
- `SubscriptionStatusBadge`: `.nb-badge` with color map above

### `SuperAdminTenants.tsx`
- `h1`: `.nb-heading text-3xl`
- "Create Tenant" button: `.nb-btn bg-black text-white px-4 py-2.5`
- Search input: `.nb-input pl-10 pr-4 py-2.5 w-full`
- Table: `.nb-table-wrap` + `.nb-table`
- Edit button: `.nb-btn bg-[#FEF08A] text-black w-8 h-8` (icon only)
- Delete button: `.nb-btn bg-[#FF79C6] text-black w-8 h-8` (icon only)
- `StatusBadge`: `.nb-badge` with color map
- Plan badge: `.nb-badge bg-white`
- `EditTenantModal`: `.nb-modal`, inputs `.nb-input`, Save `.nb-btn bg-black text-white`, Cancel `.nb-btn bg-white text-black`
- `ConfirmDeleteModal`: `.nb-modal`, Delete `.nb-btn bg-[#FF79C6] text-black`, Cancel `.nb-btn bg-white text-black`
- Error banner: `border-2 border-black bg-[#FF79C6] text-black`

### `SuperAdminBilling.tsx`
- `h1`: `.nb-heading text-3xl`
- Section `h2`: `.nb-heading text-xl`
- Plan catalog card: `.nb-card`
- Plan icon box: `bg-[#4ADE80] border-2 border-black`
- Pending requests table: `.nb-table-wrap` + `.nb-table`
- Invoices table: `.nb-table-wrap` + `.nb-table`
- Approve button: `.nb-btn bg-black text-white px-3 py-1.5 text-xs`
- Invoice `StatusBadge`: `.nb-badge` with color map
- Pending count badge: `.nb-badge bg-[#FF79C6]`

### `SuperAdminTenantDetail.tsx`
- Back button: plain text link, no neobrutalism needed
- `h1`: `.nb-heading text-3xl`
- Tabs: active tab `border-b-4 border-black font-bold text-black`, inactive `text-gray-500 hover:text-black`
- Stat cards: already updated via `SAStatCard`
- Subscription management card: `.nb-card`
- `h2`: `.nb-heading text-xl`
- Selects + date input: `.nb-input flex-1`
- Save buttons: `.nb-btn bg-black text-white px-4 py-2.5`
- Data tables (patients, appointments, therapists, plans): `.nb-table-wrap` + `.nb-table`
- Status badges in tables: `.nb-badge` with color map

### `CreateTenantModal.tsx`
- Convert from dark (slate-900) to neobrutalism white
- Backdrop: `bg-black/70`
- Modal: `.nb-modal w-full max-w-md`
- Header: `border-b-[3px] border-black`
- Title: `.nb-heading text-xl`
- All inputs/selects: `.nb-input`
- Cancel: `.nb-btn bg-white text-black flex-1`
- Submit: `.nb-btn bg-black text-white flex-1`
- Success credentials box: `.nb-card bg-[#FEF08A]` (yellow)
- Copy button: `.nb-btn bg-white text-black`
- Done button: `.nb-btn bg-[#4ADE80] text-black`
- Error: `border-2 border-black bg-[#FF79C6] text-black`

---

## Files Changed

| File | Change type |
|---|---|
| `index.html` | Add Anton Google Font `<link>` |
| `src/styles/super-admin.css` | New file |
| `src/components/super-admin/SuperAdminShell.tsx` | Full restyle |
| `src/components/super-admin/SAStatCard.tsx` | Full restyle |
| `src/components/super-admin/CreateTenantModal.tsx` | Full restyle (dark → neobrutalism) |
| `src/pages/super-admin/SuperAdminLogin.tsx` | Full restyle |
| `src/pages/super-admin/SuperAdminDashboard.tsx` | Full restyle |
| `src/pages/super-admin/SuperAdminTenants.tsx` | Full restyle |
| `src/pages/super-admin/SuperAdminBilling.tsx` | Full restyle |
| `src/pages/super-admin/SuperAdminTenantDetail.tsx` | Full restyle |

**No clinic dashboard files are modified.**
