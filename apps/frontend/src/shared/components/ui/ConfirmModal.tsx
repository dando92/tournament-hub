import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import BaseModal from '@/shared/components/ui/BaseModal';
import ModalErrors from '@/shared/components/ui/ModalErrors';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { btnDanger, btnPrimary, btnSecondary } from '@/styles/buttonStyles';


type ConfirmModalProps = {
    open: boolean;
    title: string;
    confirmText?: string;
    cancelText?: string;
    confirmTone?: 'primary' | 'danger';
    onConfirm: () => void | Promise<void>;
    onClose: () => void;
    failureFallback?: string;
    maxWidth?: string;
};

export default function ConfirmModal({
    open,
    title,
    confirmText = 'Delete',
    cancelText = 'Cancel',
    confirmTone = 'danger',
    onConfirm,
    onClose,
    failureFallback = 'That did not work. Try again.',
    maxWidth = 'max-w-md',
    children,
}: PropsWithChildren<ConfirmModalProps>) {
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);
    const confirmRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        setBusy(false);
        setFailure(null);
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const settle = requestAnimationFrame(() => confirmRef.current?.focus());

        return () => cancelAnimationFrame(settle);
    }, [open]);

    const confirm = async () => {
        if (busy) {
            return;
        }

        setBusy(true);
        setFailure(null);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            setFailure(apiErrorMessage(error, failureFallback));
        } finally {
            setBusy(false);
        }
    };

    return (
        <BaseModal
            open={open}
            onClose={busy ? noop : onClose}
            title={title}
            busy={busy}
            maxWidth={maxWidth}
            initialFocus={confirmRef}
            footer={
                <div className="flex flex-col gap-3">
                    <ModalErrors errors={failure ? [failure] : []} tone="asked" />
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button type="button" onClick={onClose} disabled={busy} className={`w-full text-sm sm:w-auto ${btnSecondary}`}>
                            {cancelText}
                        </button>
                        <button
                            ref={confirmRef as React.RefObject<HTMLButtonElement>}
                            type="button"
                            onClick={confirm}
                            disabled={busy}
                            className={`w-full text-sm sm:w-auto ${confirmTone === 'danger' ? btnDanger : btnPrimary}`}
                        >
                            {busy ? <FontAwesomeIcon icon={faCircleNotch} spin aria-label="Working" /> : confirmText}
                        </button>
                    </div>
                </div>
            }
        >
            <div className="text-sm text-ui-text-soft">{children}</div>
        </BaseModal>
    );
}

function noop(): void {}
