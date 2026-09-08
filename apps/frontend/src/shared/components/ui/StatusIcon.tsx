import { STATUS_LABEL, type Status } from "@/shared/components/ui/status";

const RADIUS = 2.75;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TONE: Record<Status, string> = {
  idle: "text-state-idle",
  running: "text-state-running",
  pending: "text-state-pending",
  done: "text-state-done",
  failed: "text-state-failed",
};

const BADGE_TONE: Record<Status, string> = {
  idle: "border-state-idle/35 bg-state-idle/10",
  running: "border-state-running/35 bg-state-running/10",
  pending: "border-state-pending/35 bg-state-pending/10",
  done: "border-state-done/35 bg-state-done/10",
  failed: "border-state-failed/35 bg-state-failed/10",
};

const FILL: Partial<Record<Status, number>> = {
  idle: 0,
  running: 0.5,
  pending: 0.75,
};

const CHECK = "M4.3 7.2 6.2 9.1 9.8 4.9";
const CROSS = "M4.8 4.8 9.2 9.2 M9.2 4.8 4.8 9.2";

type StatusIconProps = {
  status: Status;
  label?: string;
  className?: string;
};

export default function StatusIcon({ status, label, className = "" }: StatusIconProps) {
  const solid = status === "done" || status === "failed";
  const fill = FILL[status] ?? 0;

  return (
    <svg
      viewBox="0 0 14 14"
      role="img"
      aria-label={label ?? STATUS_LABEL[status]}
      className={`h-3.5 w-3.5 shrink-0 ${TONE[status]} ${
        status === "pending" ? "motion-safe:animate-pulse" : ""
      } ${className}`}
    >
      {solid ? (
        <>
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path
            d={status === "done" ? CHECK : CROSS}
            fill="none"
            stroke="rgb(var(--ui-surface))"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <circle
            cx="7"
            cy="7"
            r="5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeDasharray={status === "idle" ? "2.2 2" : undefined}
          />
          {fill > 0 && (
            <circle
              cx="7"
              cy="7"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={RADIUS * 2}
              strokeDasharray={`${CIRCUMFERENCE * fill} ${CIRCUMFERENCE}`}
              transform="rotate(-90 7 7)"
            />
          )}
        </>
      )}
    </svg>
  );
}

export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-full border pl-2 pr-2.5 text-[11px] font-medium text-ui-text-soft ${BADGE_TONE[status]}`}>
      <StatusIcon status={status} className="h-3 w-3" />
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}
