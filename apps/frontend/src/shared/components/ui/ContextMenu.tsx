import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import ConfirmModal from "@/shared/components/ui/ConfirmModal";
import type { ActionsMenuItem } from "@/shared/components/ui/ActionsMenu";


export type ContextMenuItem = ActionsMenuItem;

export type ContextMenuState = {
  x: number;
  y: number;
  title: string;
  items: ContextMenuItem[];
};

const VIEWPORT_MARGIN_PX = 8;

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  const openMenu = useCallback((x: number, y: number, title: string, items: ContextMenuItem[]) => {
    const visible = items.filter((item) => !item.hidden);
    if (visible.length === 0) return;
    setMenu({ x, y, title, items: visible });
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  return { menu, openMenu, closeMenu };
}

export default function ContextMenu({ state, onClose }: { state: ContextMenuState | null; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [confirming, setConfirming] = useState<ContextMenuItem | null>(null);

  useLayoutEffect(() => {
    if (!state || !panelRef.current) {
      setPosition(null);
      return;
    }
    const rect = panelRef.current.getBoundingClientRect();
    setPosition({
      left: Math.max(VIEWPORT_MARGIN_PX, Math.min(state.x, window.innerWidth - rect.width - VIEWPORT_MARGIN_PX)),
      top: Math.max(VIEWPORT_MARGIN_PX, Math.min(state.y, window.innerHeight - rect.height - VIEWPORT_MARGIN_PX)),
    });
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [state, onClose]);

  return (
    <>
      {state && (
        <>
          <div
            className="fixed inset-0 z-dropdown"
            onClick={onClose}
            onContextMenu={(event) => {
              event.preventDefault();
              onClose();
            }}
          />
          <div
            ref={panelRef}
            role="menu"
            aria-label={state.title}
            className="fixed z-sidebar min-w-[220px] rounded border border-ui-border bg-ui-surface py-1 shadow-lg"
            style={{
              left: position?.left ?? state.x,
              top: position?.top ?? state.y,
              visibility: position ? "visible" : "hidden",
            }}
          >
            <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ui-text-mute">
              {state.title}
            </p>
            {state.items.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  onClose();
                  if (item.confirm) {
                    setConfirming(item);
                    return;
                  }
                  item.onSelect();
                }}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
                  item.danger ? "text-state-failed hover:bg-state-failed/10" : "text-ui-text-soft hover:bg-ui-raised"
                }`}
              >
                <ItemIcon icon={item.icon} danger={item.danger} />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      <ConfirmModal
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        title={confirming?.confirm?.title ?? "Confirm deletion"}
        confirmText={confirming?.confirm?.confirmText ?? "Delete"}
        onConfirm={() => confirming?.onSelect() ?? undefined}
        failureFallback="That could not be done."
      >
        {confirming?.confirm?.message}
      </ConfirmModal>
    </>
  );
}

function ItemIcon({ icon, danger }: { icon: ContextMenuItem["icon"]; danger?: boolean }) {
  const className = danger ? undefined : "text-ui-text-mute";
  if (icon && typeof icon === "object" && "iconName" in icon) {
    return <FontAwesomeIcon icon={icon as IconDefinition} className={className} />;
  }
  return <span className={className}>{icon}</span>;
}
