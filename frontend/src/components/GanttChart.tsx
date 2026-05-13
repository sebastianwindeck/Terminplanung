import { useMemo } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import type { SchedulePosition } from "@/types";
import { addDays } from "date-fns";

interface Props {
  positions: SchedulePosition[];
  viewMode?: ViewMode;
}

const STATUS_GANTT_COLORS: Record<string, string> = {
  planned: "#3b82f6",
  in_progress: "#f59e0b",
  completed: "#10b981",
  delayed: "#ef4444",
  cancelled: "#9ca3af",
};

export default function GanttChart({ positions, viewMode = ViewMode.Week }: Props) {
  const tasks: Task[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return positions
      .filter((p) => p.start_date || p.end_date)
      .map((p) => {
        const start = p.start_date ? new Date(p.start_date) : today;
        let end = p.end_date
          ? new Date(p.end_date)
          : p.duration_days
          ? addDays(start, p.duration_days)
          : addDays(start, 1);

        if (end <= start) end = addDays(start, 1);

        const color = p.color || STATUS_GANTT_COLORS[p.status] || "#3b82f6";

        return {
          id: String(p.id),
          name: [p.pos_number, p.title].filter(Boolean).join(" – "),
          start,
          end,
          progress: Math.round(p.progress * 100),
          type: p.is_milestone ? "milestone" : "task",
          project: p.parent_id ? String(p.parent_id) : undefined,
          styles: {
            backgroundColor: color,
            backgroundSelectedColor: color,
            progressColor: `${color}cc`,
            progressSelectedColor: `${color}aa`,
          },
          isDisabled: false,
        } as Task;
      });
  }, [positions]);

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Keine Positionen mit Datumsinformationen vorhanden
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Gantt
        tasks={tasks}
        viewMode={viewMode}
        listCellWidth="200px"
        columnWidth={viewMode === ViewMode.Day ? 40 : viewMode === ViewMode.Week ? 120 : 200}
        locale="de-DE"
        barFill={80}
        todayColor="rgba(59,130,246,0.1)"
      />
    </div>
  );
}
