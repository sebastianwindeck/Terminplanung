export interface Project {
  id: number;
  name: string;
  description?: string;
  project_number?: string;
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
  is_current: boolean;
  created_at: string;
  updated_at: string;
  position_count: number;
}

export type PositionStatus = "planned" | "in_progress" | "completed" | "delayed" | "cancelled";

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
  status: PositionStatus;
  progress: number;
  sort_order: number;
  is_milestone: boolean;
  color?: string;
  created_at: string;
  updated_at: string;
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

// MSPDI
export interface MSPDIImportResult {
  version_id: number;
  positions_created: number;
  skipped: number;
  warnings: string[];
}
