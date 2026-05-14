import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Upload, Paperclip } from "lucide-react";
import Modal from "@/components/Modal";
import { emailsApi } from "@/api/client";
import type { EmailEvent, EmailImportance, ScheduleVersion } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: number;
  emailEvent?: EmailEvent;
  versions: ScheduleVersion[];
}

const IMPORTANCE_LABELS: Record<EmailImportance, string> = {
  low: "Gering",
  normal: "Normal",
  high: "Hoch",
  critical: "Kritisch",
};

interface FormState {
  subject: string;
  sender: string;
  email_date: string;
  importance: EmailImportance;
  tag: string;
  note: string;
  version_from_id: string;
  version_to_id: string;
}

function toLocalDatetimeValue(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildInitialForm(emailEvent?: EmailEvent): FormState {
  if (emailEvent) {
    return {
      subject: emailEvent.subject,
      sender: emailEvent.sender,
      email_date: toLocalDatetimeValue(emailEvent.email_date),
      importance: emailEvent.importance,
      tag: emailEvent.tag ?? "",
      note: emailEvent.note ?? "",
      version_from_id: emailEvent.version_from_id != null ? String(emailEvent.version_from_id) : "",
      version_to_id: emailEvent.version_to_id != null ? String(emailEvent.version_to_id) : "",
    };
  }
  return {
    subject: "",
    sender: "",
    email_date: toLocalDatetimeValue(new Date().toISOString()),
    importance: "normal",
    tag: "",
    note: "",
    version_from_id: "",
    version_to_id: "",
  };
}

export default function EmailEventDialog({ open, onClose, projectId, emailEvent, versions }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(() => buildInitialForm(emailEvent));
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(emailEvent));
      setFile(null);
    }
  }, [open, emailEvent]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const payload: Partial<EmailEvent> & { project_id: number } = {
        project_id: projectId,
        subject: form.subject,
        sender: form.sender,
        email_date: new Date(form.email_date).toISOString(),
        importance: form.importance,
        tag: form.tag || null,
        note: form.note || null,
        version_from_id: form.version_from_id ? Number(form.version_from_id) : null,
        version_to_id: form.version_to_id ? Number(form.version_to_id) : null,
      };
      if (emailEvent) {
        return emailsApi.update(emailEvent.id, payload, file ?? undefined);
      }
      return emailsApi.create(payload, file ?? undefined);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emails", projectId] });
      qc.invalidateQueries({ queryKey: ["timeline", projectId] });
      toast.success(emailEvent ? "E-Mail aktualisiert" : "E-Mail gespeichert");
      onClose();
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const currentFilename = file?.name ?? emailEvent?.attachment_filename ?? null;

  const sortedVersions = [...versions].sort((a, b) => a.version_number - b.version_number);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={emailEvent ? "E-Mail bearbeiten" : "E-Mail taggen"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Betreff *</label>
            <input
              className="input"
              required
              value={form.subject}
              onChange={(e) => setField("subject", e.target.value)}
              placeholder="E-Mail Betreff"
            />
          </div>

          <div>
            <label className="label">Absender *</label>
            <input
              className="input"
              required
              value={form.sender}
              onChange={(e) => setField("sender", e.target.value)}
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="label">Datum *</label>
            <input
              className="input"
              type="datetime-local"
              required
              value={form.email_date}
              onChange={(e) => setField("email_date", e.target.value)}
            />
          </div>

          <div>
            <label className="label">Wichtigkeit</label>
            <select
              className="input"
              value={form.importance}
              onChange={(e) => setField("importance", e.target.value as EmailImportance)}
            >
              {(Object.keys(IMPORTANCE_LABELS) as EmailImportance[]).map((k) => (
                <option key={k} value={k}>{IMPORTANCE_LABELS[k]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Tag (optional)</label>
            <input
              className="input"
              value={form.tag}
              onChange={(e) => setField("tag", e.target.value)}
              placeholder="z.B. Behinderungsanzeige, Nachtragsanfrage"
            />
          </div>
        </div>

        <div>
          <label className="label">Notiz (optional)</label>
          <textarea
            className="input"
            rows={3}
            value={form.note}
            onChange={(e) => setField("note", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Übergang von Version (optional)</label>
            <select
              className="input"
              value={form.version_from_id}
              onChange={(e) => setField("version_from_id", e.target.value)}
            >
              <option value="">— keine —</option>
              {sortedVersions.map((v) => (
                <option key={v.id} value={v.id}>V{v.version_number} – {v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Übergang zu Version (optional)</label>
            <select
              className="input"
              value={form.version_to_id}
              onChange={(e) => setField("version_to_id", e.target.value)}
            >
              <option value="">— keine —</option>
              {sortedVersions.map((v) => (
                <option key={v.id} value={v.id}>V{v.version_number} – {v.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* File upload */}
        <div>
          <label className="label">Anhang (optional)</label>
          <div
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-primary-400 bg-primary-50"
                : "border-gray-300 hover:border-primary-400"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".eml,.msg,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
            />
            {currentFilename ? (
              <div className="flex flex-col items-center gap-1 text-primary-700">
                <Paperclip className="w-8 h-8" />
                <span className="font-medium text-sm">{currentFilename}</span>
                {file && (
                  <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-gray-400">
                <Upload className="w-8 h-8" />
                <span className="text-sm font-medium">Datei hier ablegen oder klicken</span>
                <span className="text-xs">.eml, .msg, .pdf</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? "Speichert…" : "Speichern"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
