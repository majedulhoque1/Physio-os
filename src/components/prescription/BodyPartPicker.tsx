interface BodyPartPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
}

// Head-to-toe grouped layout
const GROUPS: { label: string; parts: readonly string[] }[] = [
  { label: "Head & Neck", parts: ["Neck"] },
  { label: "Upper Body", parts: ["Shoulder", "Upper Back", "Elbow", "Wrist"] },
  { label: "Lower Body", parts: ["Lower Back", "Hip", "Knee", "Ankle"] },
];

export function BodyPartPicker({ value, onChange }: BodyPartPickerProps) {
  const toggle = (p: string) =>
    onChange(value.includes(p) ? value.filter((v) => v !== p) : [...value, p]);

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700">Body parts</div>
      {GROUPS.map((g) => (
        <div key={g.label} className="space-y-1">
          <div className="text-xs text-gray-500">{g.label}</div>
          <div className="flex flex-wrap gap-2">
            {g.parts.map((p) => {
              const active = value.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggle(p)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    active
                      ? "border-rose-600 bg-rose-600 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
