import { ReactNode, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import ConfirmModal from "@/shared/components/ui/ConfirmModal";
import { btnSecondary } from "@/styles/buttonStyles";

export type ActionsMenuItem = {
  key: string;
  label: string;
  icon: IconDefinition | ReactNode;
  onSelect: () => void | Promise<void>;
  danger?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  className?: string;
  confirm?: {
    title?: string;
    message: string;
    confirmText?: string;
  };
};

type ActionsMenuProps = {
  title: string;
  items: ActionsMenuItem[];
  disabled?: boolean;
  triggerClassName?: string;
  align?: "left" | "right";
};

export default function ActionsMenu({
  title,
  items,
  disabled = false,
  triggerClassName,
  align = "right",
}: ActionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState<ActionsMenuItem | null>(null);
  const visibleItems = items.filter((item) => !item.hidden);

  if (visibleItems.length === 0) return null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        title={title}
        onClick={() => setMenuOpen((current) => !current)}
        disabled={disabled}
        className={`relative flex h-8 w-8 items-center justify-center p-0 text-sm before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] disabled:cursor-not-allowed sm:before:hidden ${triggerClassName ?? btnSecondary}`}
      >
        <FontAwesomeIcon icon={faEllipsisVertical} />
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div
            className={`absolute top-full z-20 mt-1 min-w-[220px] rounded border border-ui-border bg-ui-surface py-1 shadow-lg ${
              align === "left" ? "left-0" : "right-0"
            }`}
          >
            {visibleItems.map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  setMenuOpen(false);
                  if (item.confirm) {
                    setConfirming(item);
                    return;
                  }
                  item.onSelect();
                }}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
                  item.danger ? "text-state-failed hover:bg-state-failed/10" : "text-ui-text-soft hover:bg-ui-raised"
                } ${item.className ?? ""}`}
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
    </div>
  );
}

function ItemIcon({ icon, danger }: { icon: ActionsMenuItem["icon"]; danger?: boolean }) {
  const className = danger ? undefined : "text-ui-text-mute";
  if (icon && typeof icon === "object" && "iconName" in icon) {
    return <FontAwesomeIcon icon={icon as IconDefinition} className={className} />;
  }
  return <span className={className}>{icon}</span>;
}
