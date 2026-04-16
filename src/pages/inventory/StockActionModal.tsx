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

  const resultingStock =
    tab === "add" ? product.stock + qty : Math.max(0, product.stock - qty);

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
            <span
              className={`text-sm font-semibold ${
                resultingStock === 0
                  ? "text-red-600"
                  : resultingStock <= product.lowStockThreshold
                  ? "text-amber-600"
                  : "text-green-600"
              }`}
            >
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
