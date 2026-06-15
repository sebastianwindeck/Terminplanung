import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Upload, Trash2, Building2, FileSpreadsheet, Download } from "lucide-react";
import { companySettingsApi, downloadWithAuth } from "@/api/client";
import type { CompanySettings } from "@/types";

const FONT_OPTIONS = ["Helvetica", "Arial", "Times New Roman", "Georgia"];

interface FormState {
  company_name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  header_text: string;
  footer_text: string;
  primary_color: string;
  secondary_color: string;
  default_font: string;
}

function buildForm(settings: CompanySettings): FormState {
  return {
    company_name: settings.company_name,
    address: settings.address ?? "",
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    website: settings.website ?? "",
    header_text: settings.header_text ?? "",
    footer_text: settings.footer_text ?? "",
    primary_color: settings.primary_color,
    secondary_color: settings.secondary_color,
    default_font: settings.default_font,
  };
}

export default function CompanySettingsPage() {
  const qc = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => companySettingsApi.get(),
  });

  useEffect(() => {
    if (settings) {
      setForm(buildForm(settings));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const saveMutation = useMutation({
    mutationFn: (data: Partial<CompanySettings>) => companySettingsApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Einstellungen gespeichert");
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const logoUploadMutation = useMutation({
    mutationFn: (file: File) => companySettingsApi.uploadLogo(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Logo hochgeladen");
    },
    onError: () => toast.error("Fehler beim Hochladen"),
  });

  const logoDeleteMutation = useMutation({
    mutationFn: () => companySettingsApi.deleteLogo(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Logo gelöscht");
    },
    onError: () => toast.error("Fehler beim Löschen"),
  });

  const templateUploadMutation = useMutation({
    mutationFn: (file: File) => companySettingsApi.uploadTemplate(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Vorlage hochgeladen");
    },
    onError: () => toast.error("Fehler beim Hochladen"),
  });

  const templateDeleteMutation = useMutation({
    mutationFn: () => companySettingsApi.deleteTemplate(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Vorlage gelöscht");
    },
    onError: () => toast.error("Fehler beim Löschen"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    saveMutation.mutate({
      company_name: form.company_name,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      website: form.website || null,
      header_text: form.header_text || null,
      footer_text: form.footer_text || null,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      default_font: form.default_font,
    });
  };

  if (isLoading || !form) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Lade Einstellungen…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6 text-primary-600" />
        <h1 className="text-2xl font-bold text-gray-900">Unternehmenseinstellungen</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Stammdaten */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Stammdaten</h2>

          <div>
            <label className="label">Unternehmensname *</label>
            <input
              className="input"
              required
              value={form.company_name}
              onChange={(e) => setField("company_name", e.target.value)}
              placeholder="Muster GmbH"
            />
          </div>

          <div>
            <label className="label">Adresse</label>
            <textarea
              className="input"
              rows={2}
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="Musterstraße 1, 12345 Musterstadt"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Telefon</label>
              <input
                className="input"
                type="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="+49 123 456789"
              />
            </div>
            <div>
              <label className="label">E-Mail</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="info@example.com"
              />
            </div>
          </div>

          <div>
            <label className="label">Website</label>
            <input
              className="input"
              type="url"
              value={form.website}
              onChange={(e) => setField("website", e.target.value)}
              placeholder="https://www.example.com"
            />
          </div>
        </div>

        {/* Logo */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Logo</h2>

          {settings?.has_logo && (
            <div className="flex items-center gap-4">
              <img
                src={`${companySettingsApi.logoUrl()}?t=${settings.updated_at}`}
                alt="Unternehmenslogo"
                className="h-16 object-contain border border-gray-200 rounded p-1"
              />
              <button
                type="button"
                className="btn-ghost text-red-500 hover:text-red-600"
                onClick={() => {
                  if (window.confirm("Logo löschen?")) logoDeleteMutation.mutate();
                }}
                disabled={logoDeleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4" /> Logo entfernen
              </button>
            </div>
          )}

          <div>
            <input
              ref={logoInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.svg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 10 * 1024 * 1024) {
                  toast.error("Datei zu groß – max. 10 MB erlaubt");
                  e.target.value = "";
                  return;
                }
                logoUploadMutation.mutate(f);
              }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploadMutation.isPending}
            >
              <Upload className="w-4 h-4" />
              {logoUploadMutation.isPending ? "Hochlädt…" : settings?.has_logo ? "Logo ersetzen" : "Logo hochladen"}
            </button>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG · max. 10 MB</p>
          </div>
        </div>

        {/* Excel-Vorlage */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Excel-Vorlage</h2>
          <p className="text-sm text-gray-500">
            Laden Sie eine eigene Excel-Vorlage hoch, die Mitarbeiter zum Erstellen der Basisversion verwenden können.
            Wenn keine Vorlage hochgeladen ist, wird die Systemvorlage verwendet.
          </p>

          {settings?.has_template && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                <FileSpreadsheet className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="truncate max-w-xs">{settings.template_filename ?? "Vorlage"}</span>
              </div>
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => downloadWithAuth(companySettingsApi.templateUrl(), settings.template_filename ?? "Vorlage.xlsx")}
              >
                <Download className="w-4 h-4" /> Herunterladen
              </button>
              <button
                type="button"
                className="btn-ghost text-red-500 hover:text-red-600 text-sm"
                onClick={() => {
                  if (window.confirm("Vorlage löschen? Danach wird wieder die Systemvorlage verwendet.")) {
                    templateDeleteMutation.mutate();
                  }
                }}
                disabled={templateDeleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4" /> Vorlage entfernen
              </button>
            </div>
          )}

          <div>
            <input
              ref={templateInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 20 * 1024 * 1024) {
                  toast.error("Datei zu groß – max. 20 MB erlaubt");
                  e.target.value = "";
                  return;
                }
                templateUploadMutation.mutate(f);
              }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => templateInputRef.current?.click()}
              disabled={templateUploadMutation.isPending}
            >
              <Upload className="w-4 h-4" />
              {templateUploadMutation.isPending ? "Hochlädt…" : settings?.has_template ? "Vorlage ersetzen" : "Vorlage hochladen"}
            </button>
            <p className="text-xs text-gray-400 mt-1">Excel (.xlsx, .xls) · max. 20 MB</p>
          </div>
        </div>

        {/* Design */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Design</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Primärfarbe</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => setField("primary_color", e.target.value)}
                  className="w-10 h-10 rounded border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                  className="input font-mono text-sm"
                  value={form.primary_color}
                  onChange={(e) => setField("primary_color", e.target.value)}
                  placeholder="#2563eb"
                />
              </div>
            </div>
            <div>
              <label className="label">Sekundärfarbe</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.secondary_color}
                  onChange={(e) => setField("secondary_color", e.target.value)}
                  className="w-10 h-10 rounded border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                  className="input font-mono text-sm"
                  value={form.secondary_color}
                  onChange={(e) => setField("secondary_color", e.target.value)}
                  placeholder="#64748b"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Standardschrift</label>
            <select
              className="input"
              value={form.default_font}
              onChange={(e) => setField("default_font", e.target.value)}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dokument-Texte */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Dokumenttexte</h2>

          <div>
            <label className="label">Kopfzeile</label>
            <textarea
              className="input"
              rows={2}
              value={form.header_text}
              onChange={(e) => setField("header_text", e.target.value)}
              placeholder="Wird oben auf PDF-Berichten angezeigt"
            />
          </div>

          <div>
            <label className="label">Fußzeile</label>
            <textarea
              className="input"
              rows={2}
              value={form.footer_text}
              onChange={(e) => setField("footer_text", e.target.value)}
              placeholder="Wird unten auf PDF-Berichten angezeigt"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Speichert…" : "Einstellungen speichern"}
          </button>
        </div>
      </form>
    </div>
  );
}
