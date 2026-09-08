import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

import { dayKeyOf, type ScheduleDay } from "@/features/schedule/model/scheduleDays";
import { btnGhost, btnSecondary } from "@/styles/buttonStyles";

export default function ScheduleDaySelector({
    days,
    selected,
    onSelect,
}: {
    days: ScheduleDay[];
    selected: ScheduleDay;
    onSelect: (dayKey: string) => void;
}) {
    const index = days.findIndex((day) => day.key === selected.key);
    const today = days.find((day) => day.key === dayKeyOf(new Date()));

    return (
        <div role="group" aria-label="Tournament day" className="flex h-11 min-w-0 items-center gap-1">
            <button type="button" aria-label="Previous day" disabled={index <= 0} onClick={() => onSelect(days[index - 1].key)} className={`${btnGhost} px-2 py-1`}>
                <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
            </button>
            <span className="min-w-0 truncate text-sm font-bold text-ui-text">{selected.label}</span>
            <button
                type="button"
                aria-label="Next day"
                disabled={index < 0 || index >= days.length - 1}
                onClick={() => onSelect(days[index + 1].key)}
                className={`${btnGhost} px-2 py-1`}
            >
                <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
            </button>
            <span className="hidden shrink-0 text-xs text-ui-text-mute sm:inline">
                {selected.schedules.length} {selected.schedules.length === 1 ? "schedule" : "schedules"}
            </span>
            {today && today.key !== selected.key && (
                <button type="button" onClick={() => onSelect(today.key)} className={`${btnSecondary} ml-auto shrink-0 px-2 py-1 text-xs`}>
                    Today
                </button>
            )}
        </div>
    );
}
