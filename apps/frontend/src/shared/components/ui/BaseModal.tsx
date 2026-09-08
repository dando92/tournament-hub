import { Dialog, Transition } from "@headlessui/react";
import { Fragment, MutableRefObject, PropsWithChildren, ReactNode } from "react";

type BaseModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  footer?: ReactNode;
  maxWidth?: string;
  fitViewport?: boolean;
  busy?: boolean;
  initialFocus?: MutableRefObject<HTMLElement | null>;
};

export default function BaseModal({
  open,
  onClose,
  title,
  footer,
  maxWidth = "max-w-2xl",
  fitViewport = false,
  busy = false,
  initialFocus,
  children,
}: PropsWithChildren<BaseModalProps>) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-[9999] overflow-y-auto" onClose={onClose} initialFocus={initialFocus}>
        <div className={`relative flex min-h-full items-center justify-center text-center ${fitViewport ? "p-2 sm:p-4" : "p-4"}`}>
          <Dialog.Overlay className="fixed inset-0 backdrop-blur-lg bg-ui-text bg-opacity-60" />
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div
              className={`relative w-full ${maxWidth} text-left transition-all transform bg-ui-surface shadow-xl ${
                fitViewport
                  ? "max-h-[calc(100dvh-1rem)] overflow-hidden rounded-lg p-4 sm:max-h-[calc(100dvh-2rem)] sm:p-6 flex flex-col"
                  : "my-8 p-6"
              }`}
            >
              {title && (
                <div className="flex items-center mb-4 pr-8">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-ui-text">
                    {title}
                  </Dialog.Title>
                </div>
              )}
              {fitViewport ? <div className="min-h-0 overflow-x-hidden overflow-y-auto">{children}</div> : children}
              {footer && <div className="mt-4">{footer}</div>}
              {title && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  aria-label="Close"
                  className={`absolute text-ui-text-mute hover:text-ui-text-soft text-xl font-bold disabled:opacity-40 ${
                    fitViewport ? "right-4 top-4 sm:right-6 sm:top-6" : "right-6 top-6"
                  }`}
                >
                  ✕
                </button>
              )}
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
