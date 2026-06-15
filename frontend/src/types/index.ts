export interface Project {
  id: number;
  name: string;
  description?: string;
  project_number?: string;
  // Modul A – Projektstammdaten
  client_name?: string | null;
  client_address?: string | null;
  construction_site_address?: string | null;
  contract_number?: string | null;
  contract_date?: string | null;
  trade?: string | null;
  construction_lead?: string | null;
  site_manager?: string | null;
  vob_b_agreed?: boolean | null;
  email_token?: string | null;
  created_at: string;
  updated_at: string;
  version_count: number;
}

export interface ScheduleVersion {
  id: number;
  project_id: number;
  name: string;
  version_number: number;
  description?: string;
  is_baseline: boolean;
  is_base_version: boolean;
  is_current: boolean;
  shift_reason?: string;
  shift_description?: string;
  created_at: string;
  updated_at: string;
  position_count: number;
}

export const SHIFT_REASONS: { value: string; label: string }[] = [
  { value: "nachtrag_2_5_vob_b",       label: "Nachtrag (§ 2 Nr. 5 VOB/B)" },
  { value: "bauherr_1_3_vob_b",         label: "Bauherrenänderung (§ 1 Abs. 3 VOB/B)" },
  { value: "behinderung_6_1_vob_b",     label: "Behinderung angemeldet (§ 6 Abs. 1 VOB/B)" },
  { value: "witterung_6_2_vob_b",       label: "Witterungsbedingungen (§ 6 Abs. 2 Nr. 2 VOB/B)" },
  { value: "planlieferung",             label: "Planlieferverzug" },
  { value: "bedenken_4_3_vob_b",        label: "Bedenkenanmeldung (§ 4 Abs. 3 VOB/B)" },
  { value: "massenänderung_2_3_vob_b",  label: "Massenänderung (§ 2 Nr. 3 VOB/B)" },
  { value: "auftraggeber_verzug",       label: "Auftraggeber-Verzug" },
  { value: "sonstiges",                 label: "Sonstiges" },
];

export type PositionStatus = "planned" | "in_progress" | "completed" | "delayed" | "cancelled";

export type VorgangTyp = "vorgang" | "meilenstein" | "sammelvorgang";

export const VORGANG_TYP_LABELS: Record<VorgangTyp, string> = {
  vorgang: "Vorgang",
  meilenstein: "Meilenstein",
  sammelvorgang: "Sammelvorgang",
};

export interface SchedulePosition {
  id: number;
  version_id: number;
  parent_id?: number;
  pos_number?: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  responsible?: string;
  trade?: string;
  typ: VorgangTyp;
  status: PositionStatus;
  progress: number;
  sort_order: number;
  is_milestone: boolean;
  color?: string;
  behinderung_aktiv: boolean;
  behinderung_beginn?: string | null;
  behinderung_tage_gesamt: number;
  created_at: string;
  updated_at: string;
}

// Dashboard
export interface DashboardPosition {
  project_id: number;
  project_name: string;
  project_number: string | null;
  position_id: number;
  pos_number: string | null;
  title: string;
  typ: VorgangTyp;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  responsible: string | null;
  status: PositionStatus;
  behinderung_aktiv: boolean;
  behinderung_tage_gesamt: number;
  version_id: number;
  version_number: number;
}

export interface DashboardStoerung {
  id: number;
  project_id: number;
  project_name: string;
  stoerung_number: string;
  titel: string;
  stoerungsart: string | null;
  status: string;
  stoerungsbeginn: string;
  kritikalitaet: string | null;
}

export interface DashboardStats {
  project_count: number;
  upcoming_count: number;
  open_stoerungen_count: number;
  active_behinderungen: number;
}

export interface DashboardResponse {
  days: number;
  today: string;
  cutoff: string;
  upcoming_positions: DashboardPosition[];
  open_stoerungen: DashboardStoerung[];
  stats: DashboardStats;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface PositionDiff {
  pos_number?: string;
  title: string;
  field: string;
  old_value?: string;
  new_value?: string;
  change_type: "added" | "removed" | "modified";
}

export interface VersionComparison {
  version_a: ScheduleVersion;
  version_b: ScheduleVersion;
  diffs: PositionDiff[];
  added_count: number;
  removed_count: number;
  modified_count: number;
}

export const STATUS_LABELS: Record<PositionStatus, string> = {
  planned: "Geplant",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  delayed: "Verzögert",
  cancelled: "Storniert",
};

export const STATUS_COLORS: Record<PositionStatus, string> = {
  planned: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  delayed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
};

// Email events
export type EmailImportance = "low" | "normal" | "high" | "critical";

export interface EmailEvent {
  id: number;
  project_id: number;
  subject: string;
  sender: string;
  recipients: string | null;
  email_date: string;
  tag: string | null;
  note: string | null;
  importance: EmailImportance;
  version_from_id: number | null;
  version_to_id: number | null;
  attachment_filename: string | null;
  attachment_mime_type: string | null;
  attachment_size_bytes: number | null;
  attachment_kind: string | null;
  has_attachment: boolean;
  created_at: string;
  updated_at: string;
}

// Timeline
export interface TimelineEvent {
  event_type: "version" | "email";
  event_id: number;
  event_date: string;
  title: string;
  subtitle: string | null;
  icon: "gantt" | "mail";
  importance: string | null;
  color: string | null;
  version_number: number | null;
  is_baseline: boolean | null;
  is_current: boolean | null;
  tag: string | null;
  has_attachment: boolean | null;
}

export interface TimelineResponse {
  project_id: number;
  events: TimelineEvent[];
}

// Company settings
export interface CompanySettings {
  id: number;
  company_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_filename: string | null;
  logo_mime_type: string | null;
  has_logo: boolean;
  template_filename: string | null;
  has_template: boolean;
  header_text: string | null;
  footer_text: string | null;
  primary_color: string;
  secondary_color: string;
  default_font: string;
  updated_at: string;
}

// Sequential comparison
export interface FieldChange { old: string | null; new: string | null; }
export interface ChangeEntry {
  pos_number: string | null;
  title: string;
  change_type: "added" | "removed" | "modified";
  field_changes: Record<string, FieldChange>;
}

export interface StepComparison {
  from_version_id: number;
  to_version_id: number;
  from_version_name: string;
  to_version_name: string;
  from_version_number: number;
  to_version_number: number;
  added: ChangeEntry[];
  removed: ChangeEntry[];
  modified: ChangeEntry[];
  email_events_between: EmailEvent[];
}

export interface SequentialComparisonResponse {
  project_id: number;
  project_name: string;
  steps: StepComparison[];
  generated_at: string;
}

// Reports
export interface GeneratedReport {
  id: number;
  project_id: number;
  report_type: string;
  filename: string;
  file_size_bytes: number;
  generated_at: string;
}

// Auth
export type UserRole = "main_admin" | "company_admin" | "company_user";

export interface AuthUser {
  id: number;
  email: string;
  full_name: string | null;
  role: UserRole;
  company_id: number | null;
  is_active: boolean;
}

export interface Company {
  id: number;
  name: string;
  slug: string;
  primary_color: string | null;
  logo_path: string | null;
  is_active: boolean;
  user_count: number;
}

export interface UserRecord {
  id: number;
  email: string;
  full_name: string | null;
  role: UserRole;
  company_id: number | null;
  is_active: boolean;
}

// Bautagesbericht
export type FreigabeStatus = "erstellt" | "geprueft" | "freigegeben";

export interface Bautagesbericht {
  id: number;
  project_id: number;
  datum: string;
  wetter: string | null;
  temperatur_min: number | null;
  temperatur_max: number | null;
  wind: string | null;
  niederschlag: string | null;
  personalanzahl: number | null;
  arbeitszeit_von: string | null;
  arbeitszeit_bis: string | null;
  geplanter_vorgang_id: number | null;
  ausgefuehrter_vorgang_id: number | null;
  soll_menge: number | null;
  soll_einheit: string | null;
  ist_menge: number | null;
  ist_einheit: string | null;
  abweichung_kommentar: string | null;
  stoerung_vorhanden: boolean;
  stoerung_id: number | null;
  anordnung_vorhanden: boolean;
  anordnung_beschreibung: string | null;
  allgemeine_bemerkungen: string | null;
  freigabestatus: FreigabeStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// MSPDI
export interface MSPDIImportResult {
  version_id: number;
  positions_created: number;
  skipped: number;
  warnings: string[];
}
