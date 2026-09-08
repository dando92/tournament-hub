import { useState } from "react";
import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import ConfirmModal from "@/shared/components/ui/ConfirmModal";
import { btnDanger, btnTrash } from "@/styles/buttonStyles";

type DeleteConfirmButtonProps = {
  onConfirm: () => void | Promise<void>;
  title?: string;
  confirmTitle?: string;
  confirmMessage?: string;
  confirmText?: string;
  className?: string;
  iconClassName?: string;
  disabled?: boolean;
  stopPropagation?: boolean;
  children?: ReactNode;
};

export default function DeleteConfirmButton({
  onConfirm,
  title = "Delete",
  confirmTitle = "Confirm deletion",
  confirmMessage = "This action cannot be undone.",
  confirmText = "Delete",
  className = "",
  iconClassName,
  disabled = false,
  stopPropagation = false,
  children,
}: DeleteConfirmButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={(event) => {
          if (stopPropagation) event.stopPropagation();
          setOpen(true);
        }}
        className={`${children ? `${btnDanger} gap-2` : btnTrash} ${className}`}
      >
        <FontAwesomeIcon icon={faTrash} className={iconClassName} />
        {children}
      </button>

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        title={confirmTitle}
        confirmText={confirmText}
        onConfirm={onConfirm}
        failureFallback="That could not be deleted."
      >
        {confirmMessage}
      </ConfirmModal>
    </>
  );
}
