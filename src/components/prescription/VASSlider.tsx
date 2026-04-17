interface VASSliderProps {
  value: number | null;
  onChange: (next: number) => void;
}

const EMOJI_BY_VAL = ["😊", "🙂", "😐", "😕", "😟", "😣", "😖", "😫", "😩", "😭"];

export function VASSlider({ value, onChange }: VASSliderProps) {
  const current = value ?? 0;
  const emoji = current > 0 ? EMOJI_BY_VAL[current - 1] : "—";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">Pain (VAS 1–10)</div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <span className="min-w-[2ch] text-lg font-semibold tabular-nums">
            {value ?? "—"}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={current || 1}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>No pain</span>
        <span>Worst pain</span>
      </div>
    </div>
  );
}
