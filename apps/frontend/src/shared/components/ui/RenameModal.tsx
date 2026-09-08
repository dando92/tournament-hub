import { useEffect, useState } from 'react';
import FormModal from '@/shared/components/ui/FormModal';


type RenameModalProps = {
    open: boolean;
    noun: string;
    currentName: string;
    onClose: () => void;
    onRename: (name: string) => Promise<void>;
};

export default function RenameModal({ open, noun, currentName, onClose, onRename }: RenameModalProps) {
    const [name, setName] = useState(currentName);

    useEffect(() => {
        if (!open) {
            return;
        }

        setName(currentName);
    }, [currentName, open]);

    const unchanged = name.trim() === currentName;

    return (
        <FormModal
            open={open}
            title={`Rename ${noun}`}
            confirmText={`Rename ${noun}`}
            validate={() => (name.trim() ? [] : [`A ${noun} needs a name.`])}
            onConfirm={() => (unchanged ? undefined : onRename(name.trim()))}
            onClose={onClose}
            failureFallback={`The ${noun} could not be renamed.`}
        >
            <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded border border-ui-border-strong bg-ui-surface px-3 py-2 text-sm text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent"
                placeholder={`${noun.charAt(0).toUpperCase()}${noun.slice(1)} name`}
            />
        </FormModal>
    );
}
