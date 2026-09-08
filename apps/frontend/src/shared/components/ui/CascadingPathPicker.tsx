import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { describePath, samePath, selectAtLevel } from "@/shared/components/ui/cascadingPath";
import type { PathLevel, PathLevelView, PathValue } from "@/shared/components/ui/cascadingPath";
import { focusRing } from "@/styles/buttonStyles";


const SEARCHABLE_FROM = 8;

const SEGMENT_BASE =
  "inline-flex min-h-[2.25rem] items-center gap-1.5 whitespace-nowrap rounded px-2 text-sm transition-colors";

type CascadingPathPickerProps<TValue extends string | number> = {
  levels: ReadonlyArray<PathLevel<TValue>>;
  value: PathValue<TValue>;
  onValueChange: (value: PathValue<TValue>) => void;
  ariaLabel?: string;
  className?: string;
};

export default function CascadingPathPicker<TValue extends string | number>({
  levels,
  value,
  onValueChange,
  ariaLabel,
  className,
}: CascadingPathPickerProps<TValue>) {
  const views = useMemo(() => describePath(levels, value), [levels, value]);
  const drawn = useMemo(
    () => views.map((view, index) => ({ view, index })).filter((entry) => entry.view.visible),
    [views],
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const triggersRef = useRef<Array<HTMLButtonElement | null>>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [overflow, setOverflow] = useState({ start: false, end: false });

  useEffect(() => {
    const settled = views.map((view) => view.selected?.value ?? null);
    if (!samePath(settled, value)) onValueChange(settled);
  }, [views, value, onValueChange]);

  const measureOverflow = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const remaining = scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft;
    setOverflow({ start: scroller.scrollLeft > 1, end: remaining > 1 });
  }, []);

  useLayoutEffect(() => measureOverflow(), [measureOverflow, views]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new ResizeObserver(measureOverflow);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [measureOverflow]);

  const closePanel = useCallback((restoreFocus: boolean) => {
    setOpenIndex((current) => {
      if (restoreFocus && current !== null) triggersRef.current[current]?.focus();
      return null;
    });
  }, []);

  useEffect(() => {
    if (openIndex === null) return;

    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closePanel(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closePanel(true);
    };

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape, true);
    };
  }, [openIndex, closePanel]);

  const fade = [
    "linear-gradient(to right,",
    `${overflow.start ? "transparent" : "black"} 0,`,
    "black 1.5rem,",
    "black calc(100% - 1.5rem),",
    `${overflow.end ? "transparent" : "black"} 100%)`,
  ].join(" ");

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <div
        ref={scrollerRef}
        onScroll={measureOverflow}
        role="group"
        aria-label={ariaLabel}
        className="flex items-center gap-1 overflow-x-auto p-1"
        style={{ maskImage: fade, WebkitMaskImage: fade }}
      >
        {drawn.map(({ view, index }, position) => (
          <Fragment key={view.key}>
            {position > 0 && (
              <span aria-hidden className="select-none text-ui-border-strong">
                /
              </span>
            )}
            <button
              ref={(node) => {
                triggersRef.current[index] = node;
              }}
              type="button"
              disabled={!view.enabled}
              aria-haspopup="listbox"
              aria-expanded={openIndex === index}
              aria-label={view.selected ? `${view.label}: ${view.selected.label}` : `Select ${view.label}`}
              onClick={() => setOpenIndex((current) => (current === index ? null : index))}
              className={`${SEGMENT_BASE} ${segmentTone(view)} ${focusRing}`}
            >
              {view.selected ? view.selected.label : `Select ${view.label}`}
              {view.enabled && <FontAwesomeIcon icon={faChevronDown} className="text-[0.6rem] text-ui-text-mute" />}
            </button>
          </Fragment>
        ))}
      </div>

      {openIndex !== null && (
        <OptionsPanel
          key={views[openIndex].key}
          view={views[openIndex]}
          rootRef={rootRef}
          trigger={triggersRef.current[openIndex]}
          onSelect={(selected) => {
            onValueChange(selectAtLevel(levels, value, openIndex, selected));
            closePanel(true);
          }}
        />
      )}
    </div>
  );
}

function segmentTone<TValue extends string | number>(view: PathLevelView<TValue>): string {
  if (!view.enabled) return "cursor-not-allowed border border-dashed border-ui-border text-ui-text-mute opacity-70";
  if (view.selected) return "border border-ui-border bg-ui-raised font-semibold text-ui-text hover:bg-ui-selected";
  return "border border-dashed border-ui-border-strong text-ui-text-soft hover:bg-ui-raised hover:text-ui-text";
}

function OptionsPanel<TValue extends string | number>({
  view,
  rootRef,
  trigger,
  onSelect,
}: {
  view: PathLevelView<TValue>;
  rootRef: RefObject<HTMLDivElement>;
  trigger: HTMLButtonElement | null;
  onSelect: (value: TValue) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const searchable = view.options.length >= SEARCHABLE_FROM;
  const options = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? view.options.filter((option) => option.label.toLowerCase().includes(needle)) : view.options;
  }, [view.options, query]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    if (!root || !panel || !trigger) return;
    const rootRect = root.getBoundingClientRect();
    const offset = trigger.getBoundingClientRect().left - rootRect.left;
    setLeft(Math.min(Math.max(0, offset), Math.max(0, rootRect.width - panel.offsetWidth)));
  }, [rootRef, trigger, view.key]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const target = searchable
      ? panel.querySelector<HTMLElement>("input")
      : panel.querySelector<HTMLElement>('[role="option"][aria-selected="true"]') ??
        panel.querySelector<HTMLElement>('[role="option"]');
    target?.focus();
  }, [searchable, view.key]);

  const moveFocus = (event: ReactKeyboardEvent, direction: 1 | -1) => {
    event.preventDefault();
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = current === -1 ? 0 : (current + direction + items.length) % items.length;
    items[next].focus();
  };

  return (
    <div
      ref={panelRef}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") moveFocus(event, 1);
        if (event.key === "ArrowUp") moveFocus(event, -1);
      }}
      style={{ left: left ?? 0, visibility: left === null ? "hidden" : "visible" }}
      className="absolute top-full z-dropdown mt-1 flex max-h-72 w-64 max-w-full flex-col overflow-hidden rounded border border-ui-border bg-ui-surface shadow-lg"
    >
      <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ui-text-mute">
        {view.label}
      </p>

      {searchable && (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Filter ${view.label.toLowerCase()}...`}
          aria-label={`Filter ${view.label.toLowerCase()}`}
          className="mx-2 mb-1 rounded border border-ui-border bg-ui-canvas px-2 py-1.5 text-sm text-ui-text outline-none placeholder:text-ui-text-mute focus:border-ui-border-strong"
        />
      )}

      <div role="listbox" aria-label={view.label} className="min-h-0 flex-1 overflow-y-auto pb-1">
        {options.length === 0 ? (
          <p className="px-3 py-2 text-sm text-ui-text-mute">Nothing here.</p>
        ) : (
          options.map((option) => {
            const selected = option.value === view.selected?.value;
            return (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(option.value)}
                className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition-colors hover:bg-ui-raised focus-visible:bg-ui-raised focus-visible:outline-none ${
                  selected ? "bg-ui-selected font-semibold text-ui-text" : "text-ui-text-soft"
                }`}
              >
                {option.label}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
