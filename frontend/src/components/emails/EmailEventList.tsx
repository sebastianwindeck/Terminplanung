import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Paperclip, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { emailsApi } from "@/api/client";
import type { EmailEvent, EmailImportance, ScheduleVersion } from "@/types";
import EmailEventDialog from "./EmailEventDialog";

interface Props {
  projectId: number;
  versions: ScheduleVersion[];
}

const IMPORTANCE_BADGE: Record<EmailImportance, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-blue-100 text-blue-700",
  low: "bg-gray-100 text-gray-500",
};

const IMPORTANCE_LABEL: Record<EmailImportance, string> = {
  critical: "Kritisch",
  high: "Hoch",
  normal: "Normal",
  low: "Gering",
};

export default function EmailEventList({ projectId, versions }: Props) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editEvent, setEditEvent] = useState<EmailEvent | undefined>(undefined);

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["emails", projectId],
    queryFn: () => emailsApi.listForProject(projectId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => emailsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emails", projectId] });
      qc.invalidateQueries({ queryKey: ["timeline", projectId] });
      toast.success("E-Mail gelöscht");
    },
    onError: () => toast.error("Fehler beim Löschen"),
  });

  const handleDelete = (email: EmailEvent) => {
    if (window.confirm(`E-Mail "${email.subject}" löschen?`)) {
      deleteMutation.mutate(email.id);
    }
  };

  const handleEdit = (email: EmailEvent) => {
    setEditEvent(email);
  };

  const handleCloseDialog = () => {
    setShowCreate(false);
    setEditEvent(undefined);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Lade E-Mails…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> E-Mail taggen
        </button>
      </div>

      {emails.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400 text-sm">Noch keine E-Mails getaggt.</p>
          <button className="btn-secondary mt-4" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> E-Mail taggen
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {emails.map((email) => (
            <div
              key={email.id}
              className="card px-4 py-3 flex items-start gap-3 group hover:shadow-sm transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {format(new Date(email.email_date), "dd.MM.yyyy HH:mm")}
                  </span>
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      IMPORTANCE_BADGE[email.importance]
                    }`}
                  >
                    {IMPORTANCE_LABEL[email.importance]}
                  </span>
                  {email.tag && (
                    <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {email.tag}
                    </span>
                  )}
                  {email.has_attachment && (
                    <a
                      href={emailsApi.attachmentUrl(email.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={email.attachment_filename ?? "Anhang"}
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-400 hover:text-primary-600 flex-shrink-0"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <p className="font-semibold text-gray-900 text-sm mt-0.5 truncate">{email.subject}</p>
                <p className="text-xs text-gray-500 truncate">{email.sender}</p>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  className="btn-ghost p-1.5 rounded"
                  title="Bearbeiten"
                  onClick={() => handleEdit(email)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                  title="Löschen"
                  onClick={() => handleDelete(email)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <EmailEventDialog
        open={showCreate || editEvent !== undefined}
        onClose={handleCloseDialog}
        projectId={projectId}
        emailEvent={editEvent}
        versions={versions}
      />
    </div>
  );
}
