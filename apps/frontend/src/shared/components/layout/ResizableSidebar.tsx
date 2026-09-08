import { ReactNode, useCallback, useRef, useState } from "react";

const DEFAULT_WIDTH_PX = 288;
const MIN_WIDTH_PX = 224;
const MAX_WIDTH_PX = 440;

export default function ResizableSidebar({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState(DEFAULT_WIDTH_PX);
  const [dragging, setDragging] = useState(false);
  const columnRef = useRef<HTMLDivElement>(null);

  const resizeTo = useCallback((clientX: number) => {
    const left = columnRef.current?.getBoundingClientRect().left ?? 0;
    setWidth(Math.max(MIN_WIDTH_PX, Math.min(MAX_WIDTH_PX, clientX - left)));
  }, []);

  return (
    <div ref={columnRef} className="hidden shrink-0 border-r border-ui-border md:flex" style={{ width }}>
      <div className="min-w-0 flex-1">{children}</div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        tabIndex={0}
        onPointerDown={(event) => {
          setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragging) return;
          resizeTo(event.clientX);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setWidth((current) => Math.max(MIN_WIDTH_PX, current - 16));
          if (event.key === "ArrowRight") setWidth((current) => Math.min(MAX_WIDTH_PX, current + 16));
        }}
        className={`w-1 shrink-0 cursor-col-resize transition-colors focus-visible:outline-none focus-visible:bg-ui-accent ${
          dragging ? "bg-ui-border-strong" : "bg-transparent hover:bg-ui-border-strong"
        }`}
      />
    </div>
  );
}
