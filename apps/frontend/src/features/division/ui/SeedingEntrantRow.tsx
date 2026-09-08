import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGripVertical } from "@fortawesome/free-solid-svg-icons";

type SeedingEntrantRowProps = {
  name: string;
  seedNumber?: number | null;
  saving?: boolean;
  draggable?: boolean;
  dragging?: boolean;
};

export default function SeedingEntrantRow({
  name,
  seedNumber = null,
  saving = false,
  draggable = false,
  dragging = false,
}: SeedingEntrantRowProps) {
  return (
    <div
      className={`flex items-center justify-between rounded px-3 py-2 text-sm transition-colors ${
        dragging ? "bg-ui-selected shadow-md" : "bg-ui-raised"
      } ${draggable ? "cursor-grab hover:bg-ui-selected active:cursor-grabbing" : ""} ${saving ? "opacity-50" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {seedNumber !== null && seedNumber !== undefined && (
          <span className="w-8 text-xs font-bold tabular-nums text-ui-text-mute">#{seedNumber}</span>
        )}
        <span className="truncate">{name}</span>
      </div>
      {draggable && <FontAwesomeIcon icon={faGripVertical} aria-hidden className="ml-2 shrink-0 text-ui-text-mute" />}
    </div>
  );
}
