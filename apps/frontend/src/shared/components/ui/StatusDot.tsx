import { useEffect, useRef, useState } from "react";
const TAP_TOOLTIP_MS = 2000;

type StatusDotProps = {
  on: boolean;
  label: string;
};

export function ActiveIndicator({ on, label, className = "" }: StatusDotProps & { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" role="img" aria-label={label} className={`h-3.5 w-3.5 shrink-0 ${className}`}>
      {on ? (
        <circle cx="7" cy="7" r="5" className="fill-state-live" />
      ) : (
        <circle
          cx="7"
          cy="7"
          r="5.5"
          fill="none"
          className="stroke-state-idle"
          strokeWidth="1.4"
          strokeDasharray="2.2 2"
        />
      )}
    </svg>
  );
}

export default function StatusDot({ on, label }: StatusDotProps) {
  const [tapped, setTapped] = useState(false);
  const hideTimeout = useRef<number>();

  useEffect(() => () => window.clearTimeout(hideTimeout.current), []);

  function showTooltipOnTap(event: React.MouseEvent) {
    event.stopPropagation();
    setTapped(true);
    window.clearTimeout(hideTimeout.current);
    hideTimeout.current = window.setTimeout(() => setTapped(false), TAP_TOOLTIP_MS);
  }

  return (
    <span className="group relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={label}
        onClick={showTooltipOnTap}
        onBlur={() => setTapped(false)}
        className="-m-1.5 flex cursor-default items-center p-1.5"
      >
        <ActiveIndicator on={on} label={label} />
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-ui-text px-2 py-1 text-[11px] font-medium text-ui-surface transition-opacity ${
          tapped ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        {label}
      </span>
    </span>
  );
}
