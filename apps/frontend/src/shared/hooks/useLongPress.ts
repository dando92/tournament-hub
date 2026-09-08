import { useCallback, useEffect, useRef } from "react";

const HOLD_MS = 500;
const TRAVEL_TOLERANCE_PX = 8;

// Touch only. Mouse and pen already have a right click, and arming a hold for
// them turns an ordinary click-and-wait into a menu.
export function useLongPress(onLongPress: (x: number, y: number) => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  useEffect(() => {
    window.addEventListener("scroll", cancel, true);
    return () => window.removeEventListener("scroll", cancel, true);
  }, [cancel]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType !== "touch") return;
      const { clientX, clientY } = event;
      origin.current = { x: clientX, y: clientY };
      timer.current = setTimeout(() => {
        timer.current = null;
        if (navigator.vibrate) navigator.vibrate(8);
        onLongPress(clientX, clientY);
      }, HOLD_MS);
    },
    [onLongPress],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!timer.current || !origin.current) return;
      const travelled =
        Math.abs(event.clientX - origin.current.x) > TRAVEL_TOLERANCE_PX ||
        Math.abs(event.clientY - origin.current.y) > TRAVEL_TOLERANCE_PX;
      if (travelled) cancel();
    },
    [cancel],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: cancel,
    onPointerCancel: cancel,
    className: "select-none touch-pan-y",
  };
}
