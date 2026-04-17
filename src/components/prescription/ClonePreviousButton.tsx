import { Copy } from "lucide-react";

interface Props {
  onClone: () => void;
  hasPrevious: boolean;
  disabled?: boolean;
}

export function ClonePreviousButton({ onClone, hasPrevious, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClone}
      disabled={disabled || !hasPrevious}
      title={hasPrevious ? "Copy last visit prescription" : "No previous prescription (first visit)"}
      className="inline-flex items-center gap-2 rounded border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Copy size={16} />
      Clone Previous Visit
    </button>
  );
}
