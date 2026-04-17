import { Plus, X } from "lucide-react";
import { useState } from "react";

interface ChipMultiSelectProps {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  allowCustom?: boolean;
  placeholder?: string;
}

export function ChipMultiSelect({
  label,
  options,
  value,
  onChange,
  allowCustom = false,
  placeholder = "Add custom…",
}: ChipMultiSelectProps) {
  const [customInput, setCustomInput] = useState("");

  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };

  const remove = (opt: string) => onChange(value.filter((v) => v !== opt));

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setCustomInput("");
  };

  const knownOptions = new Set(options);
  const customValues = value.filter((v) => !knownOptions.has(v));

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                active
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              {opt}
            </button>
          );
        })}
        {customValues.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-600 bg-emerald-600 px-3 py-1 text-sm text-white"
          >
            {v}
            <button type="button" onClick={() => remove(v)} aria-label={`Remove ${v}`}>
              <X size={14} />
            </button>
          </span>
        ))}
      </div>

      {allowCustom && (
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder={placeholder}
            className="flex-1 rounded border border-gray-300 px-3 py-1 text-sm"
          />
          <button
            type="button"
            onClick={addCustom}
            className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
          >
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
