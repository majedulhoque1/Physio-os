# Inventory Management Demo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fully-functional (local-state only) Inventory Management demo page to the Physio OS sidebar with mock physiotherapy product data, full CRUD, and stock tracking.

**Architecture:** All state lives in React `useState` initialized from a static mock data array — no Supabase, no API calls, resets on refresh. Three new files handle mock data, modals, and the main page. Two existing files (navigation.ts, App.tsx) get minimal additions.

**Tech Stack:** React, TypeScript, Tailwind CSS, lucide-react icons, React Router v6

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/pages/inventory/mockInventory.ts` | Create | Static mock product array + Product type |
| `src/pages/inventory/ProductModal.tsx` | Create | Add / Edit / Delete product modal |
| `src/pages/inventory/StockActionModal.tsx` | Create | Add stock / Mark used / Mark sold modal |
| `src/pages/Inventory.tsx` | Create | Main inventory page (list, filters, low-stock banner) |
| `src/lib/navigation.ts` | Modify | Add Inventory nav item |
| `src/App.tsx` | Modify | Add `/inventory` route |

---

### Task 1: Mock data and Product type

**Files:**
- Create: `src/pages/inventory/mockInventory.ts`

- [ ] **Step 1: Create the file**

```ts
// src/pages/inventory/mockInventory.ts

export type ProductCategory =
  | "Equipment"
  | "Therapy Devices"
  | "Consumables"
  | "Exercise Aids"
  | "Recovery";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  price: number; // BDT
  stock: number;
  lowStockThreshold: number;
  description: string;
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "TENS Unit (Dual Channel)",
    sku: "TENS-DC-001",
    category: "Therapy Devices",
    price: 3800,
    stock: 12,
    lowStockThreshold: 3,
    description: "Transcutaneous electrical nerve stimulation unit for pain relief therapy.",
  },
  {
    id: "p2",
    name: "Ultrasound Therapy Machine",
    sku: "UST-1MHZ-002",
    category: "Therapy Devices",
    price: 18500,
    stock: 2,
    lowStockThreshold: 2,
    description: "1 MHz therapeutic ultrasound machine for deep tissue treatment.",
  },
  {
    id: "p3",
    name: "Resistance Band Set (5-pack)",
    sku: "RB-SET-003",
    category: "Exercise Aids",
    price: 950,
    stock: 30,
    lowStockThreshold: 8,
    description: "Five resistance levels: yellow, red, green, blue, black.",
  },
  {
    id: "p4",
    name: "Hot / Cold Gel Pack",
    sku: "HC-GEL-004",
    category: "Recovery",
    price: 380,
    stock: 0,
    lowStockThreshold: 5,
    description: "Reusable gel pack suitable for microwave heating or freezer cooling.",
  },
  {
    id: "p5",
    name: "Posture Corrector Brace",
    sku: "POST-BR-005",
    category: "Equipment",
    price: 1200,
    stock: 7,
    lowStockThreshold: 3,
    description: "Adjustable clavicle brace for posture correction and back support.",
  },
  {
    id: "p6",
    name: "Exercise Ball (65 cm)",
    sku: "EXBALL-65-006",
    category: "Exercise Aids",
    price: 750,
    stock: 10,
    lowStockThreshold: 4,
    description: "Anti-burst PVC exercise/stability ball for core strengthening.",
  },
  {
    id: "p7",
    name: "Kinesiology Tape Roll (5m)",
    sku: "KTAPE-5M-007",
    category: "Consumables",
    price: 320,
    stock: 45,
    lowStockThreshold: 10,
    description: "Cotton elastic therapeutic tape, water resistant.",
  },
  {
    id: "p8",
    name: "Foam Roller (90 cm)",
    sku: "FOAM-90-008",
    category: "Recovery",
    price: 890,
    stock: 6,
    lowStockThreshold: 3,
    description: "High-density EVA foam roller for myofascial release.",
  },
  {
    id: "p9",
    name: "Shoulder Pulley Exerciser",
    sku: "SHPULL-009",
    category: "Exercise Aids",
    price: 480,
    stock: 3,
    lowStockThreshold: 3,
    description: "Over-door shoulder pulley for range-of-motion exercises.",
  },
  {
    id: "p10",
    name: "Paraffin Wax Bath Unit",
    sku: "PARWAX-010",
    category: "Therapy Devices",
    price: 7200,
    stock: 4,
    lowStockThreshold: 2,
    description: "Electric paraffin wax heater for hand and foot heat therapy.",
  },
  {
    id: "p11",
    name: "Cervical Traction Collar",
    sku: "CERVTRAC-011",
    category: "Equipment",
    price: 1650,
    stock: 8,
    lowStockThreshold: 3,
    description: "Inflatable cervical collar for neck traction and decompression.",
  },
  {
    id: "p12",
    name: "Hydrocollator Heating Pads (10-pack)",
    sku: "HYDRO-10P-012",
    category: "Consumables",
    price: 2100,
    stock: 1,
    lowStockThreshold: 2,
    description: "Silica gel moist heat packs for hydrocollator units.",
  },
  {
    id: "p13",
    name: "Theraband Loop Set (6 bands)",
    sku: "TBLOOP-013",
    category: "Exercise Aids",
    price: 1100,
    stock: 18,
    lowStockThreshold: 5,
    description: "Mini loop resistance bands for lower body rehab exercises.",
  },
  {
    id: "p14",
    name: "Infrared Heat Lamp",
    sku: "IR-LAMP-014",
    category: "Therapy Devices",
    price: 4200,
    stock: 5,
    lowStockThreshold: 2,
    description: "250W infrared lamp for deep heat physiotherapy treatment.",
  },
  {
    id: "p15",
    name: "Disposable Exam Gloves (100-pack)",
    sku: "GLOVES-100-015",
    category: "Consumables",
    price: 450,
    stock: 22,
    lowStockThreshold: 10,
    description: "Latex-free nitrile disposable examination gloves, medium size.",
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/inventory/mockInventory.ts
git commit -m "feat(inventory): add mock product data and Product type"
```

---

### Task 2: ProductModal (Add / Edit / Delete)

**Files:**
- Create: `src/pages/inventory/ProductModal.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/pages/inventory/ProductModal.tsx
import { useState } from "react";
import { X } from "lucide-react";
import type { Product, ProductCategory } from "./mockInventory";

const CATEGORIES: ProductCategory[] = [
  "Equipment",
  "Therapy Devices",
  "Consumables",
  "Exercise Aids",
  "Recovery",
];

interface Props {
  product: Product | null; // null = add mode
  onSave: (product: Product) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function newBlank(): Omit<Product, "id"> {
  return {
    name: "",
    sku: "",
    category: "Equipment",
    price: 0,
    stock: 0,
    lowStockThreshold: 3,
    description: "",
  };
}

export function ProductModal({ product, onSave, onDelete, onClose }: Props) {
  const isEdit = product !== null;
  const [form, setForm] = useState<Omit<Product, "id">>(
    isEdit ? { ...product } : newBlank()
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  function set<K extends keyof Omit<Product, "id">>(key: K, value: Omit<Product, "id">[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!form.name.trim() || !form.sku.trim()) return;
    onSave({
      id: isEdit ? product.id : `p${Date.now()}`,
      ...form,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? "Edit Product" : "Add Product"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Product Name *</label>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. TENS Unit"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">SKU *</label>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.sku}
                onChange={(e) => set("sku", e.target.value)}
                placeholder="e.g. TENS-001"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Category</label>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.category}
                onChange={(e) => set("category", e.target.value as ProductCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Price (BDT)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.price}
                onChange={(e) => set("price", Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Stock Qty</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.stock}
                onChange={(e) => set("stock", Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Low Stock Alert</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.lowStockThreshold}
                onChange={(e) => set("lowStockThreshold", Number(e.target.value))}
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
              <textarea
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                rows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-5 py-4">
          {isEdit ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Delete this product?</span>
                <button
                  onClick={() => onDelete(product.id)}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Delete Product
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.sku.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-40"
            >
              {isEdit ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/inventory/ProductModal.tsx
git commit -m "feat(inventory): add ProductModal for add/edit/delete"
```

---

### Task 3: StockActionModal

**Files:**
- Create: `src/pages/inventory/StockActionModal.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/pages/inventory/StockActionModal.tsx
import { useState } from "react";
import { X } from "lucide-react";
import type { Product } from "./mockInventory";

type Tab = "add" | "used" | "sold";

interface Props {
  product: Product;
  onUpdate: (id: string, delta: number) => void;
  onClose: () => void;
}

const TABS: { key: Tab; label: string; color: string }[] = [
  { key: "add", label: "Add Stock", color: "text-green-600" },
  { key: "used", label: "Mark Used", color: "text-amber-600" },
  { key: "sold", label: "Mark Sold", color: "text-blue-600" },
];

export function StockActionModal({ product, onUpdate, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("add");
  const [qty, setQty] = useState(1);

  function handleApply() {
    if (qty <= 0) return;
    const delta = tab === "add" ? qty : -qty;
    onUpdate(product.id, delta);
    onClose();
  }

  const resultingStock = tab === "add"
    ? product.stock + qty
    : Math.max(0, product.stock - qty);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{product.name}</h2>
            <p className="text-xs text-gray-400">{product.sku}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                tab === t.key
                  ? `border-b-2 border-primary ${t.color}`
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
            <span className="text-xs text-gray-500">Current Stock</span>
            <span className="text-sm font-semibold text-gray-800">{product.stock} units</span>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Quantity</label>
            <input
              type="number"
              min={1}
              max={tab === "add" ? undefined : product.stock}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-dashed border-gray-200 px-4 py-3">
            <span className="text-xs text-gray-500">Resulting Stock</span>
            <span className={`text-sm font-semibold ${resultingStock === 0 ? "text-red-600" : resultingStock <= product.lowStockThreshold ? "text-amber-600" : "text-green-600"}`}>
              {resultingStock} units
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/inventory/StockActionModal.tsx
git commit -m "feat(inventory): add StockActionModal with add/used/sold tabs"
```

---

### Task 4: Main Inventory Page

**Files:**
- Create: `src/pages/Inventory.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/pages/Inventory.tsx
import { useState, useMemo } from "react";
import {
  AlertTriangle,
  LayoutGrid,
  List,
  Package,
  Plus,
  Search,
  X,
} from "lucide-react";
import { MOCK_PRODUCTS } from "./inventory/mockInventory";
import type { Product, ProductCategory } from "./inventory/mockInventory";
import { ProductModal } from "./inventory/ProductModal";
import { StockActionModal } from "./inventory/StockActionModal";
import { PageHeader } from "@/components/shared/PageHeader";

const CATEGORIES: ProductCategory[] = [
  "Equipment",
  "Therapy Devices",
  "Consumables",
  "Exercise Aids",
  "Recovery",
];

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  Equipment: "bg-blue-50 text-blue-700",
  "Therapy Devices": "bg-purple-50 text-purple-700",
  Consumables: "bg-orange-50 text-orange-700",
  "Exercise Aids": "bg-green-50 text-green-700",
  Recovery: "bg-pink-50 text-pink-700",
};

function stockStatus(p: Product): { label: string; className: string } {
  if (p.stock === 0) return { label: "Out of Stock", className: "bg-red-100 text-red-700" };
  if (p.stock <= p.lowStockThreshold) return { label: "Low Stock", className: "bg-amber-100 text-amber-700" };
  return { label: "In Stock", className: "bg-green-100 text-green-700" };
}

export function Inventory() {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "All">("All");
  const [editingProduct, setEditingProduct] = useState<Product | null | "new">(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const lowStockItems = products.filter(
    (p) => p.stock <= p.lowStockThreshold
  );
  const showBanner = !bannerDismissed && lowStockItems.length > 0;

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        categoryFilter === "All" || p.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, search, categoryFilter]);

  function handleSave(product: Product) {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      if (idx === -1) return [...prev, product];
      const next = [...prev];
      next[idx] = product;
      return next;
    });
    setEditingProduct(null);
  }

  function handleDelete(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setEditingProduct(null);
  }

  function handleStockUpdate(id: string, delta: number) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p
      )
    );
  }

  return (
    <div className="space-y-5 p-6">
      <PageHeader title="Inventory" breadcrumbs={["Clinic", "Inventory"]} />

      {/* Low-stock banner */}
      {showBanner && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1 text-sm text-amber-800">
            <span className="font-medium">Low stock alert: </span>
            {lowStockItems.map((p, i) => (
              <span key={p.id}>
                {p.name}
                {i < lowStockItems.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
          <button onClick={() => setBannerDismissed(true)} className="text-amber-400 hover:text-amber-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Search name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ProductCategory | "All")}
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="flex rounded-lg border border-gray-200">
          <button
            onClick={() => setView("grid")}
            className={`rounded-l-lg px-3 py-2 text-sm ${view === "grid" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("table")}
            className={`rounded-r-lg px-3 py-2 text-sm ${view === "table" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => setEditingProduct("new")}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <Package className="h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">No products match your filters.</p>
        </div>
      )}

      {/* Grid View */}
      {view === "grid" && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const status = stockStatus(p);
            return (
              <div
                key={p.id}
                className="group relative flex cursor-pointer flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                onClick={() => setStockProduct(p)}
              >
                {/* Image placeholder */}
                <div className={`flex h-24 items-center justify-center rounded-lg ${CATEGORY_COLORS[p.category]} bg-opacity-30`}>
                  <Package className="h-8 w-8 opacity-40" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{p.name}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">{p.sku}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${CATEGORY_COLORS[p.category]}`}>
                    {p.category}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">৳{p.price.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Stock: <strong className="text-gray-800">{p.stock}</strong></span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingProduct(p); }}
                    className="text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {view === "table" && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">Price (BDT)</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const status = stockStatus(p);
                return (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.sku}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${CATEGORY_COLORS[p.category]}`}>
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">৳{p.price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">{p.stock}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setStockProduct(p)}
                          className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          Stock
                        </button>
                        <button
                          onClick={() => setEditingProduct(p)}
                          className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/5"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {editingProduct !== null && (
        <ProductModal
          product={editingProduct === "new" ? null : editingProduct}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditingProduct(null)}
        />
      )}
      {stockProduct && (
        <StockActionModal
          product={stockProduct}
          onUpdate={handleStockUpdate}
          onClose={() => setStockProduct(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Inventory.tsx
git commit -m "feat(inventory): add main Inventory page with grid/table, search, filters"
```

---

### Task 5: Wire up navigation and route

**Files:**
- Modify: `src/lib/navigation.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add nav item to navigation.ts**

In `src/lib/navigation.ts`, add `ShoppingBag` to the lucide-react import and insert the inventory item into `baseDesktopNavItems` after the Messages entry:

```ts
// Change the import line at the top:
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Mail,
  Settings,
  ShoppingBag,
  Stethoscope,
  Users,
} from "lucide-react";
```

Then add this entry at the end of `baseDesktopNavItems` array (after the messages item):

```ts
  {
    href: "/inventory",
    icon: ShoppingBag,
    label: "Inventory",
    title: "Inventory",
    breadcrumbs: ["Clinic", "Inventory"],
    badge: undefined, // demo badge handled in Sidebar
  },
```

- [ ] **Step 2: Add the DEMO badge rendering to Sidebar.tsx**

In `src/components/layout/Sidebar.tsx`, replace the nav item label span with a version that shows a DEMO chip for the inventory route:

Find the `<span>` that renders `{item.label}` inside the `NavLink` in the nav list (around line 113-116) and replace it with:

```tsx
<span
  className={cn(
    "truncate transition-all duration-200",
    isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
  )}
>
  {item.label}
  {item.href === "/inventory" && isExpanded && (
    <span className="ml-2 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-400">
      demo
    </span>
  )}
</span>
```

- [ ] **Step 3: Add route to App.tsx**

Add the import at the top of `src/App.tsx` with the other page imports:

```ts
import { Inventory } from "@/pages/Inventory";
```

Add the route inside the `<Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>` block, after the messages route:

```tsx
<Route
  path="inventory"
  element={withBoundary(<Inventory />)}
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/navigation.ts src/components/layout/Sidebar.tsx src/App.tsx
git commit -m "feat(inventory): wire up sidebar nav item with DEMO badge and route"
```

---

## Self-Review

**Spec coverage:**
- ✅ Sidebar entry with DEMO badge (Task 5)
- ✅ Mock data: 15 physiotherapy products (Task 1)
- ✅ Grid + table view with toggle (Task 4)
- ✅ Search by name/SKU (Task 4)
- ✅ Category filter (Task 4)
- ✅ Stock status badges: In Stock / Low Stock / Out of Stock (Task 4)
- ✅ Low-stock alert banner, dismissible (Task 4)
- ✅ Add/Edit/Delete modal (Task 2)
- ✅ Stock action modal: Add / Used / Sold (Task 3)
- ✅ All state local, no Supabase (Tasks 1–4)
- ✅ Route wired (Task 5)

**Type consistency:** `Product` and `ProductCategory` defined in Task 1, imported identically in Tasks 2, 3, 4. `onUpdate(id: string, delta: number)` in Task 3 matches `handleStockUpdate` in Task 4.

**Placeholders:** None found.
