import { FormEvent, KeyboardEvent as ReactKeyboardEvent, MutableRefObject, PropsWithChildren, ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import BaseModal from '@/shared/components/ui/BaseModal';
import ModalErrors from '@/shared/components/ui/ModalErrors';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { btnDanger, btnPrimary, btnSecondary } from '@/styles/buttonStyles';


type FormModalProps = {
    open: boolean;
    title: string;
    confirmText?: string;
    confirmTone?: 'primary' | 'danger';
    cancelText?: string;
    validate?: () => string[];
    onConfirm: () => void | Promise<void>;
    onClose: () => void;
    initialFocusRef?: MutableRefObject<HTMLElement | null>;
    leadingActions?: ReactNode;
    failureFallback?: string;
    maxWidth?: string;
    fitViewport?: boolean;
};

const TYPED_FIELDS =
    'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]):not([type="color"]):not([type="submit"]):not([type="button"]):not([role="combobox"]), textarea, [contenteditable="true"]';

const ANY_FIELD = 'input:not([type="hidden"]), select, textarea, [contenteditable="true"]';

const CHOSEN_FIELD = '[data-autofocus]';

export default function FormModal({
    open,
    title,
    confirmText = 'Save',
    confirmTone = 'primary',
    cancelText = 'Cancel',
    validate,
    onConfirm,
    onClose,
    initialFocusRef,
    leadingActions,
    failureFallback = 'That did not work. Try again.',
    maxWidth,
    fitViewport,
    children,
}: PropsWithChildren<FormModalProps>) {
    const formId = useId();
    const [submitted, setSubmitted] = useState(false);
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);
    const form = useRef<HTMLFormElement | null>(null);
    const discoveredFocus = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        setSubmitted(false);
        setBusy(false);
        setFailure(null);
    }, [open]);

    useLayoutEffect(() => {
        if (!open || initialFocusRef) {
            return;
        }

        discoveredFocus.current = form.current ? firstField(form.current) : null;
    }, [initialFocusRef, open]);

    useEffect(() => {
        if (!open || initialFocusRef) {
            return;
        }

        const settle = requestAnimationFrame(() => {
            const node = form.current;
            if (!node || node.contains(document.activeElement)) {
                return;
            }

            firstField(node)?.focus();
        });

        return () => cancelAnimationFrame(settle);
    }, [initialFocusRef, open]);

    const submitOnEnter = (event: ReactKeyboardEvent<HTMLFormElement>) => {
        if (event.key !== 'Enter' || event.defaultPrevented || event.shiftKey || busy) {
            return;
        }

        const from = event.target as HTMLElement;
        if (from instanceof HTMLTextAreaElement || from instanceof HTMLButtonElement || from instanceof HTMLAnchorElement || from.isContentEditable) {
            return;
        }

        event.preventDefault();
        void confirm();
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        void confirm();
    };

    const confirm = async () => {
        if (busy) {
            return;
        }

        setSubmitted(true);
        setFailure(null);
        if (validate && validate().length > 0) {
            return;
        }

        setBusy(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            setFailure(apiErrorMessage(error, failureFallback));
        } finally {
            setBusy(false);
        }
    };

    const errors = !open || busy ? [] : failure ? [failure] : validate ? validate() : [];

    return (
        <BaseModal
            open={open}
            onClose={busy ? noop : onClose}
            title={title}
            busy={busy}
            maxWidth={maxWidth}
            fitViewport={fitViewport}
            initialFocus={initialFocusRef ?? discoveredFocus}
            footer={
                <div className={`flex flex-col gap-3 ${fitViewport ? '-mx-4 -mb-4 border-t border-ui-border bg-ui-surface px-4 py-3 sm:-mx-6 sm:-mb-6 sm:px-6' : ''}`}>
                    <ModalErrors errors={errors} tone={submitted || failure ? 'asked' : 'waiting'} />
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                        {leadingActions && <div className="sm:mr-auto">{leadingActions}</div>}
                        <button type="button" onClick={onClose} disabled={busy} className={`text-sm ${btnSecondary}`}>
                            {cancelText}
                        </button>
                        <button type="submit" form={formId} disabled={busy} className={`text-sm ${confirmTone === 'danger' ? btnDanger : btnPrimary}`}>
                            {busy ? <FontAwesomeIcon icon={faCircleNotch} spin aria-label="Working" /> : confirmText}
                        </button>
                    </div>
                </div>
            }
        >
            <form id={formId} ref={form} onSubmit={submit} onKeyDown={submitOnEnter} noValidate className="flex flex-col gap-3">
                <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3 border-0 p-0 disabled:opacity-60">
                    {children}
                </fieldset>
            </form>
        </BaseModal>
    );
}

function noop(): void {}

function firstField(form: HTMLElement): HTMLElement | null {
    return pick(form, CHOSEN_FIELD) ?? pick(form, TYPED_FIELDS) ?? pick(form, ANY_FIELD) ?? pick(form, 'button');
}

function pick(form: HTMLElement, selector: string): HTMLElement | null {
    return Array.from(form.querySelectorAll<HTMLElement>(selector)).find(reachable) ?? null;
}

function reachable(element: HTMLElement): boolean {
    return !element.hasAttribute('disabled') && !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true' && !element.closest('[hidden]');
}
