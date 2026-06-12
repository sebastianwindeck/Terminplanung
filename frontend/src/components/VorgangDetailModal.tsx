import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { X, AlertTriangle, CheckCircle, Clock, Calendar, User, Wrench, Hash } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { positionBehinderungApi } from "@/api/client";
import type { SchedulePosition } from "@/types";
import { STATUS_LABELS, STATUS_COLORS, VORGANG_TYP_LABELS } from "@/types";

interface Props {
  position: SchedulePosition | null;
  onClose: () => void;
  onUpdated: (pos: SchedulePosition) => void;
}

export default function VorgangDetailModal({ position, onClose, onUpdated }: Props) {
  const [confirmEnd, setConfirmEnd] = useState(false);

  const startMutation = useMutation({
    mutationFn: () => positionBehinderungApi.start(position!.id),
    onSuccess: (updated) => {
      toast.success("Behinderung gestartet – Status auf 'Verzögert' gesetzt");
      onUpdated(updated);
    },
    onError: () => toast.error("Fehler beim Starten der Behinderung"),
  });

  const endMutation = useMutation({
    mutationFn: () => positionBehinderungApi.end(position!.id),
    onSuccess: (updated) => {
      toast.success(`Behinderung abgemeldet (+${updated.behinderung_tage_gesamt} Verzugtage gesamt)`);
      onUpdated(updated);
      setConfirmEnd(false);
    },
    onError: () => toast.error("Fehler beim Abmelden der Behinderung"),
  });

  if (!position) return null;

  const hasActiveBehinderung = position.behinderung_aktiv;
  const hasAccumulatedDays = position.behinderung_tage_gesamt > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 flex items-start justify-between ${
          hasActiveBehinderung ? "bg-red-50 border-b border-red-100" : "bg-gray-50 border-b border-gray-100"
        }`}>
          <div className="flex-1 min-w-0">
            {position.pos_number && (
              <p className="text-xs text-gray-500 font-mono mb-0.5">{position.pos_number}</p>
            )}
            <h2 className="text-base font-semibold text-gray-900 leading-snug">{position.title}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-gray-500">
                {VORGANG_TYP_LABELS[position.typ] ?? position.typ}
              </span>
              <span className={`inline-block text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[position.status] ?? "bg-gray-100 text-gray-600"}`}>
                {STATUS_LABELS[position.status] ?? position.status}
              </span>
              {hasActiveBehinderung && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                  <AlertTriangle className="w-3 h-3" /> Behindert
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="ml-3 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Details */}
        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {position.start_date && (
              <DetailRow icon={<Calendar className="w-4 h-4" />} label="Beginn">
                {format(parseISO(position.start_date), "dd.MM.yyyy", { locale: de })}
              </DetailRow>
            )}
            {position.end_date && (
              <DetailRow icon={<Calendar className="w-4 h-4" />} label="Ende">
                {format(parseISO(position.end_date), "dd.MM.yyyy", { locale: de })}
              </DetailRow>
            )}
            {position.duration_days != null && (
              <DetailRow icon={<Clock className="w-4 h-4" />} label="Dauer">
                {position.duration_days} Tage
              </DetailRow>
            )}
            {position.responsible && (
              <DetailRow icon={<User className="w-4 h-4" />} label="Verantwortlich">
                {position.responsible}
              </DetailRow>
            )}
            {position.trade && (
              <DetailRow icon={<Wrench className="w-4 h-4" />} label="Gewerk">
                {position.trade}
              </DetailRow>
            )}
            <DetailRow icon={<Hash className="w-4 h-4" />} label="Fortschritt">
              {Math.round(position.progress * 100)} %
            </DetailRow>
          </div>

          {position.description && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              {position.description}
            </div>
          )}
        </div>

        {/* Behinderung section */}
        <div className={`px-6 py-4 border-t ${hasActiveBehinderung ? "border-red-100 bg-red-50" : "border-gray-100"}`}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Behinderungsmanagement</h3>

          {hasAccumulatedDays && (
            <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                Angesammelt: <strong>{position.behinderung_tage_gesamt} Verzugtage</strong> — werden beim Anlegen einer neuen Version automatisch auf die Termine angerechnet.
              </span>
            </div>
          )}

          {hasActiveBehinderung ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  Behinderung aktiv seit{" "}
                  {position.behinderung_beginn
                    ? format(parseISO(position.behinderung_beginn), "dd.MM.yyyy HH:mm", { locale: de })
                    : "unbekannt"}
                </span>
              </div>
              {confirmEnd ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Behinderung wirklich abmelden?</span>
                  <button
                    className="btn-primary text-xs py-1 px-3 bg-red-600 hover:bg-red-700 border-red-600"
                    onClick={() => endMutation.mutate()}
                    disabled={endMutation.isPending}
                  >
                    {endMutation.isPending ? "…" : "Ja, abmelden"}
                  </button>
                  <button className="btn-secondary text-xs py-1 px-3" onClick={() => setConfirmEnd(false)}>
                    Abbrechen
                  </button>
                </div>
              ) : (
                <button
                  className="btn-secondary text-sm"
                  onClick={() => setConfirmEnd(true)}
                >
                  <CheckCircle className="w-4 h-4" /> Behinderung abmelden
                </button>
              )}
            </div>
          ) : (
            <button
              className="btn-secondary text-sm"
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
            >
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              {startMutation.isPending ? "Wird gestartet…" : "Behinderungsanzeige starten"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-800">{children}</p>
      </div>
    </div>
  );
}
