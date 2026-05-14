import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { BarChart2, Mail } from "lucide-react";
import { format } from "date-fns";
import { timelineApi, emailsApi } from "@/api/client";
import type { ScheduleVersion, TimelineEvent } from "@/types";

interface Props {
  projectId: number;
  versions: ScheduleVersion[];
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + "…";
}

function isHighImportance(importance: string | null): boolean {
  return importance === "high" || importance === "critical";
}

interface MarkerProps {
  event: TimelineEvent;
  projectId: number;
  leftPercent: number;
}

function TimelineMarker({ event, projectId, leftPercent }: MarkerProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (event.event_type === "version") {
      navigate(`/projects/${projectId}/versions/${event.event_id}`);
    } else if (event.has_attachment) {
      window.open(emailsApi.attachmentUrl(event.event_id), "_blank");
    }
  };

  const isVersion = event.event_type === "version";
  const isImportant = isHighImportance(event.importance);

  const iconColors = isVersion
    ? "bg-indigo-100 border-indigo-400 text-indigo-600"
    : isImportant
    ? "bg-amber-100 border-amber-400 text-amber-600"
    : "bg-gray-100 border-gray-300 text-gray-500";

  const dateLabel = format(new Date(event.event_date), "dd.MM.yyyy");

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: `${leftPercent}%`, transform: "translateX(-50%)" }}
      title={`${event.title}${event.subtitle ? "\n" + event.subtitle : ""}`}
    >
      {/* title above */}
      <span className="text-xs text-gray-600 mb-1 whitespace-nowrap max-w-[80px] text-center leading-tight">
        {truncate(event.title, 12)}
      </span>

      {/* vertical connector up */}
      <div className="w-px h-4 bg-gray-300" />

      {/* icon marker */}
      <button
        onClick={handleClick}
        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 hover:scale-110 transition-transform cursor-pointer ${iconColors}`}
      >
        {isVersion ? <BarChart2 className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
      </button>

      {/* vertical connector down */}
      <div className="w-px h-4 bg-gray-300" />

      {/* date label below */}
      <span className="text-xs text-gray-400 whitespace-nowrap">{dateLabel}</span>
    </div>
  );
}

export default function ChronologyTimeline({ projectId, versions: _versions }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["timeline", projectId],
    queryFn: () => timelineApi.getForProject(projectId),
  });

  const events = data?.events ?? [];

  if (isLoading) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Projektverlauf</h3>
        <div className="text-center py-4 text-gray-400 text-xs">Lade Verlauf…</div>
      </div>
    );
  }

  if (events.length < 2) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Projektverlauf</h3>
        {events.length === 0 ? (
          <p className="text-xs text-gray-400">Noch keine Ereignisse vorhanden.</p>
        ) : (
          <ul className="space-y-1">
            {events.map((e) => (
              <li key={`${e.event_type}-${e.event_id}`} className="text-xs text-gray-600 flex items-center gap-2">
                {e.event_type === "version" ? (
                  <BarChart2 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                ) : (
                  <Mail className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                )}
                <span className="font-medium">{e.title}</span>
                <span className="text-gray-400">{format(new Date(e.event_date), "dd.MM.yyyy")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const dates = events.map((e) => new Date(e.event_date).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const range = maxDate - minDate || 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Projektverlauf</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <BarChart2 className="w-3.5 h-3.5 text-indigo-500" /> Version
          </span>
          <span className="flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-amber-500" /> E-Mail
          </span>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="min-w-[600px] relative h-32 mx-8">
          {/* horizontal axis line */}
          <div className="absolute top-16 left-0 right-0 h-px bg-gray-300" />

          {events.map((event) => {
            const t = new Date(event.event_date).getTime();
            const leftPercent = ((t - minDate) / range) * 100;
            return (
              <TimelineMarker
                key={`${event.event_type}-${event.event_id}`}
                event={event}
                projectId={projectId}
                leftPercent={leftPercent}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
