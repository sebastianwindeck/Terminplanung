import type { NachweisAmpel } from "@/types/stoerung";

interface Props {
  ampel: NachweisAmpel;
  showLabel?: boolean;
}

const CONFIG: Record<NachweisAmpel, { color: string; label: string; bg: string }> = {
  gruen: { color: "text-green-600", bg: "bg-green-100", label: "Vollständig belegt" },
  gelb:  { color: "text-yellow-600", bg: "bg-yellow-100", label: "Teilweise belegt" },
  rot:   { color: "text-red-600", bg: "bg-red-100", label: "Nachweis unvollständig" },
};

export function EvidenceTrafficLight({ ampel, showLabel = true }: Props) {
  const { color, bg, label } = CONFIG[ampel];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${color}`}>
      <span className={`h-2 w-2 rounded-full ${color.replace("text-", "bg-")}`} />
      {showLabel && label}
    </span>
  );
}
