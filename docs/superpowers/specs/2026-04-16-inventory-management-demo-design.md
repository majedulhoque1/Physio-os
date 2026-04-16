# Inventory Management Demo — Design Spec

**Date:** 2026-04-16  
**Status:** Approved

---

## Overview

A demo Inventory Management module added to the Physio OS sidebar. Uses mock physiotherapy e-commerce product data. No Supabase integration — all state is local (useState). Labeled with a small "DEMO" badge so users understand it's a prototype.

---

## Sidebar Integration

- **Icon:** `ShoppingBag` (lucide-react)
- **Label:** `Inventory`
- **Badge:** Small amber `DEMO` pill shown only when sidebar is expanded
- **Route:** `/inventory`
- **Access:** All clinic roles (clinic_admin, therapist, receptionist)
- Added to `baseDesktopNavItems` in `src/lib/navigation.ts`
- Added as a protected route in `src/App.tsx`

---

## Mock Data

File: `src/pages/inventory/mockInventory.ts`

~15 physiotherapy products with fields:
- `id: string`
- `name: string`
- `sku: string`
- `category: string` — categories: Equipment, Therapy Devices, Consumables, Exercise Aids, Recovery
- `price: number` (BDT)
- `stock: number`
- `lowStockThreshold: number`
- `description: string`

Example products: TENS Unit, Ultrasound Therapy Machine, Resistance Bands (3-pack), Hot/Cold Pack, Posture Corrector, Exercise Ball, Kinesiology Tape Roll, Foam Roller, Shoulder Pulley, Parallel Bars (Mini), Traction Belt, Hydrocollator Heating Unit, Paraffin Wax Bath, Cervical Collar, Theraband Loop Set.

---

## Page Structure

File: `src/pages/Inventory.tsx`

### State
- `products: Product[]` — initialized from mockInventory, mutable via CRUD
- `view: 'grid' | 'table'` — toggle
- `search: string` — filter by name/SKU
- `categoryFilter: string` — filter by category
- `editingProduct: Product | null` — product open in edit/add modal
- `stockProduct: Product | null` — product open in stock action modal
- `isAddingNew: boolean`

### Low-Stock Alert Banner
- Shown at top when any product has `stock <= lowStockThreshold`
- Lists product names as chips
- Dismissible per session

### Toolbar
- Search input
- Category dropdown filter
- Grid / Table toggle buttons
- "Add Product" button (clinic_admin only, or show for all in demo)

### Grid View
- 3-column responsive card grid
- Each card: placeholder image area (gradient bg with category icon), name, SKU, price (BDT), stock badge (green/yellow/red), category tag
- Click card → opens StockActionModal

### Table View
- Columns: Name, SKU, Category, Price (BDT), Stock, Status, Actions
- Actions: Edit button, Stock button
- Sortable by name/stock/price (client-side)

### Stock Status Badge
- `stock === 0` → red "Out of Stock"
- `stock <= lowStockThreshold` → amber "Low Stock"
- else → green "In Stock"

---

## Modals

### ProductModal (Add / Edit)
File: `src/pages/inventory/ProductModal.tsx`

Fields: Name, SKU, Category (select), Price (BDT), Stock Qty, Low Stock Threshold, Description  
Edit mode: shows Delete button with confirmation  
Saves to local state only

### StockActionModal
File: `src/pages/inventory/StockActionModal.tsx`

Three tabs:
1. **Add Stock** — qty input → `stock += qty`
2. **Mark Used** — qty input → `stock -= qty` (min 0)
3. **Mark Sold** — qty input → `stock -= qty` (min 0)

Shows current stock and updates immediately in state.

---

## File Structure

```
src/pages/inventory/
  mockInventory.ts        # Static mock data array
  ProductModal.tsx        # Add/Edit product modal
  StockActionModal.tsx    # Stock in/out modal
src/pages/Inventory.tsx   # Main page
```

---

## Constraints

- No Supabase. No API calls.
- State resets on page refresh (expected for demo).
- Follows existing Tailwind + shadcn-style patterns in the codebase.
- DEMO badge is purely cosmetic — no feature gating.
