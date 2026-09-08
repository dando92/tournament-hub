import { useEffect, useState } from 'react';
import FormModal from '@/shared/components/ui/FormModal';

type CreatePoolModalProps = {
    open: boolean;
    phaseName: string;
    suggestedName: string;
    onClose: () => void;
    onCreate: (name: string) => Promise<void>;
};

export default function CreatePoolModal({ open, phaseName, suggestedName, onClose, onCreate }: CreatePoolModalProps) {
    const [name, setName] = useState(suggestedName);

    useEffect(() => {
        if (!open) {
            return;
        }

        setName(suggestedName);
    }, [open, suggestedName]);

    return (
        <FormModal
            open={open}
            title="Create Pool"
            confirmText="Create pool"
            validate={() => (name.trim() ? [] : ['A pool needs a name.'])}
            onConfirm={() => onCreate(name.trim())}
            onClose={onClose}
            failureFallback="The pool could not be created."
        >
            <p className="text-sm text-ui-text-mute">
                The pool joins <span className="font-semibold text-ui-text">{phaseName}</span>, beside the one it already holds.
            </p>
            <div>
                <h3 className="mb-1">Name</h3>
                <input
                    className="w-full rounded-lg border border-ui-border-strong px-2 py-2"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Pool name"
                />
            </div>
        </FormModal>
    );
}
