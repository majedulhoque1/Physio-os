import { ChevronDown, ClipboardList } from "lucide-react";
import { useState } from "react";
import type { ProtocolTemplateRow } from "@/types";

interface Props {
  templates: ProtocolTemplateRow[];
  onApply: (tpl: ProtocolTemplateRow) => void;
  disabled?: boolean;
}

export function TemplateApplyMenu({ templates, onApply, disabled }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || templates.length === 0}
        className="inline-flex items-center gap-2 rounded border border-blue-600 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ClipboardList size={16} />
        Apply Template
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute left-0 z-10 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
          <ul className="max-h-80 overflow-auto py-1">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    onApply(t);
                    setOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <div className="font-medium text-gray-900">{t.name}</div>
                  {t.diagnosis && (
                    <div className="text-xs text-gray-500">{t.diagnosis}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
