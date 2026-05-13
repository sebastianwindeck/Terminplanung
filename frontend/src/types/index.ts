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
