import type { StoerungStatus } from "@/types/stoerung";

interface Props {
  status: StoerungStatus;
}

const STYLES: Record<StoerungStatus, string> = {
  entwurf:              "bg-gray-100 text-gray-700",
  offen:                "bg-blue-100 text-blue-800",
  angezeigt:            "bg-yellow-100 text-yellow-800",
  in_beobachtung:       "bg-purple-100 text-purple-800",
  teilweise_behoben:    "bg-orange-100 text-orange-800",
  behoben:              "bg-green-100 text-green-800",
  abgemeldet:           "bg-teal-100 text-teal-800",
  in_anspruchspruefung: "bg-indigo-100 text-indigo-800",
  abgeschlossen:        "bg-gray-200 text-gray-700",
  verworfen:            "bg-red-100 text-red-700",
};

const LABELS: Record<StoerungStatus, string> = {
  entwurf:              "Entwurf",
  offen:                "Offen",
  angezeigt:            "Angezeigt",
  in_beobachtung:       "In Beobachtung",
  teilweise_behoben:    "Teilw. behoben",
  behoben:              "Behoben",
  abgemeldet:           "Abgemeldet",
  in_anspruchspruefung: "Anspruchsprüfung",
  abgeschlossen:        "Abgeschlossen",
  verworfen:            "Verworfen",
};

export function DisruptionStatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
