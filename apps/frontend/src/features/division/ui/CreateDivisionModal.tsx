import { useEffect, useState } from 'react';
import FormModal from '@/shared/components/ui/FormModal';

type CreateDivisionModalProps = {
    open: boolean;
    onClose: () => void;
    onCreate: (name: string) => Promise<void>;
};

export default function CreateDivisionModal({ open, onClose, onCreate }: CreateDivisionModalProps) {
    const [name, setName] = useState('');

    useEffect(() => {
        if (!open) {
            return;
        }

        setName('');
    }, [open]);

    return (
        <FormModal
            open={open}
            title="Create Division"
            confirmText="Create division"
            validate={() => (name.trim() ? [] : ['A division needs a name.'])}
            onConfirm={() => onCreate(name.trim())}
            onClose={onClose}
            failureFallback="The division could not be created."
        >
            <div>
                <h3 className="mb-1">Name</h3>
                <input
                    className="w-full rounded-lg border border-ui-border-strong px-2 py-2"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Division name"
                />
            </div>
        </FormModal>
    );
}
