import { ADVICE_CATEGORY_LABELS, type AdviceCategory, type BanglaAdviceRow } from "@/types";

interface AdvicePickerProps {
  byCategory: Record<AdviceCategory, BanglaAdviceRow[]>;
  selectedBn: string[];
  selectedEn: string[];
  onChange: (selection: { bn: string[]; en: string[] }) => void;
}

export function AdvicePicker({ byCategory, selectedBn, selectedEn, onChange }: AdvicePickerProps) {
  const toggle = (row: BanglaAdviceRow) => {
    const bnActive = selectedBn.includes(row.text_bn);
    const newBn = bnActive
      ? selectedBn.filter((t) => t !== row.text_bn)
      : [...selectedBn, row.text_bn];
    const newEn = row.text_en
      ? bnActive
        ? selectedEn.filter((t) => t !== row.text_en)
        : [...selectedEn, row.text_en]
      : selectedEn;
    onChange({ bn: newBn, en: newEn });
  };

  const categories = Object.keys(ADVICE_CATEGORY_LABELS) as AdviceCategory[];

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700">
        Advice — Bangla (checkbox to add; no typing)
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {categories.map((cat) => {
          const rows = byCategory[cat] ?? [];
          if (rows.length === 0) return null;
          return (
            <div key={cat} className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {ADVICE_CATEGORY_LABELS[cat]}
              </div>
              <div className="space-y-1">
                {rows.map((r) => {
                  const active = selectedBn.includes(r.text_bn);
                  return (
                    <label key={r.id} className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={active}
                        onChange={() => toggle(r)}
                      />
                      <span>
                        <span className="font-bengali">{r.text_bn}</span>
                        {r.text_en && (
                          <span className="block text-xs text-gray-500">{r.text_en}</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
