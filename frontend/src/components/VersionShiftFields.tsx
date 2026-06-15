import { SHIFT_REASONS } from "@/types";

interface Props {
  shiftReason: string;
  shiftDescription: string;
  onChange: (key: "shift_reason" | "shift_description", value: string) => void;
}

export default function VersionShiftFields({ shiftReason, shiftDescription, onChange }: Props) {
  return (
    <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
      <div>
        <label className="label">Grund der Verschiebung</label>
        <select
          className="input"
          value={shiftReason}
          onChange={(e) => onChange("shift_reason", e.target.value)}
        >
          <option value="">— Kein Grund angegeben —</option>
          {SHIFT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      {shiftReason && (
        <div>
          <label className="label">Beschreibung zum Grund</label>
          <textarea
            className="input"
            rows={3}
            placeholder="Detaillierte Beschreibung der Verschiebungsursache…"
            value={shiftDescription}
            onChange={(e) => onChange("shift_description", e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
