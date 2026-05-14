import { useState } from "react";
import { ChevronDown, ChevronRight, Mail } from "lucide-react";
import { format } from "date-fns";
import type { StepComparison, ChangeEntry } from "@/types";

interface Props {
  step: StepComparison;
  stepIndex: number;
}

function ChangeTable({ entries, label, color }: { entries: ChangeEntry[]; label: string; color: string }) {
  if (entries.length === 0) return null;

  return (
    <div className="mt-3">
      <h5 className={`text-xs font-semibold uppercase tracking-wide mb-1 ${color}`}>{label} ({entries.length})</h5>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-2 py-1.5 font-medium text-gray-600 border border-gray-200 w-16">Pos.</th>
              <th className="text-left px-2 py-1.5 font-medium text-gray-600 border border-gray-200">Bezeichnung</th>
              <th className="text-left px-2 py-1.5 font-medium text-gray-600 border border-gray-200">Änderungen</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-2 py-1.5 border border-gray-200 text-gray-500 font-mono">
                  {entry.pos_number ?? "—"}
                </td>
                <td className="px-2 py-1.5 border border-gray-200 font-medium text-gray-900">
                  {entry.title}
                </td>
                <td className="px-2 py-1.5 border border-gray-200">
                  {Object.keys(entry.field_changes).length === 0 ? (
                    <span className="text-gray-400 italic">—</span>
                  ) : (
                    <div className="space-y-0.5">
                      {Object.entries(entry.field_changes).map(([field, change]) => (
                        <div key={field} className="flex items-center gap-1 flex-wrap">
                          <span className="text-gray-500 font-medium">{field}:</span>
                          {change.old !== null && (
                            <span className="line-through text-red-500">{change.old}</span>
                          )}
                          {change.old !== null && change.new !== null && (
                            <span className="text-gray-400">→</span>
                          )}
                          {change.new !== null && (
                            <span className="text-green-600">{change.new}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ComparisonStepCard({ step, stepIndex }: Props) {
  const [open, setOpen] = useState(true);

  const totalChanges = step.added.length + step.removed.length + step.modified.length;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-xs font-medium text-gray-400 w-6">#{stepIndex + 1}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
        <span className="font-semibold text-gray-900 text-sm">
          V{step.from_version_number} {step.from_version_name}
          <span className="text-gray-400 mx-2">→</span>
          V{step.to_version_number} {step.to_version_name}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {step.added.length > 0 && (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
              +{step.added.length}
            </span>
          )}
          {step.removed.length > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
              -{step.removed.length}
            </span>
          )}
          {step.modified.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
              ~{step.modified.length}
            </span>
          )}
          {totalChanges === 0 && (
            <span className="text-xs text-gray-400">Keine Änderungen</span>
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-3">
          {/* Email events between versions */}
          {step.email_events_between.length > 0 && (
            <div className="mt-3">
              <h5 className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                E-Mails in diesem Zeitraum ({step.email_events_between.length})
              </h5>
              <div className="space-y-1">
                {step.email_events_between.map((email) => (
                  <div
                    key={email.id}
                    className="flex items-center gap-2 text-xs bg-amber-50 rounded px-2 py-1.5 flex-wrap"
                  >
                    <span className="text-gray-400 flex-shrink-0">
                      {format(new Date(email.email_date), "dd.MM.yyyy")}
                    </span>
                    <span className="font-medium text-gray-900 truncate">{email.subject}</span>
                    <span className="text-gray-500 flex-shrink-0">{email.sender}</span>
                    {email.tag && (
                      <span className="bg-purple-100 text-purple-700 px-1 py-0.5 rounded flex-shrink-0">
                        {email.tag}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <ChangeTable entries={step.added} label="Hinzugefügt" color="text-green-600" />
          <ChangeTable entries={step.removed} label="Entfernt" color="text-red-600" />
          <ChangeTable entries={step.modified} label="Geändert" color="text-blue-600" />

          {totalChanges === 0 && step.email_events_between.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Keine Änderungen in diesem Schritt.</p>
          )}
        </div>
      )}
    </div>
  );
}
