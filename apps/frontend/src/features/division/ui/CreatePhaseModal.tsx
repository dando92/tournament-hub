import { useEffect, useState } from 'react';
import FormModal from '@/shared/components/ui/FormModal';
import Select from '@/shared/components/ui/Select';

type DivisionOption = {
    id: number;
    name: string;
};

type CreatePhaseModalProps = {
    open: boolean;
    onClose: () => void;
    onCreate: (name: string, divisionId: number) => Promise<void>;
    divisions?: DivisionOption[];
    divisionId?: number;
};

export default function CreatePhaseModal({ open, onClose, onCreate, divisions, divisionId }: CreatePhaseModalProps) {
    const [name, setName] = useState('');
    const [selectedDivisionId, setSelectedDivisionId] = useState<number>(divisionId ?? divisions?.[0]?.id ?? 0);

    useEffect(() => {
        if (!open) {
            return;
        }

        setName('');
        setSelectedDivisionId(divisionId ?? divisions?.[0]?.id ?? 0);
    }, [divisionId, divisions, open]);

    const resolvedDivisionId = divisionId ?? selectedDivisionId;

    const validate = () => {
        const errors: string[] = [];
        if (!name.trim()) {
            errors.push('A phase needs a name.');
        }
        if (!resolvedDivisionId) {
            errors.push('Choose the division the phase belongs to.');
        }

        return errors;
    };

    return (
        <FormModal
            open={open}
            title="Create Phase"
            confirmText="Create phase"
            validate={validate}
            onConfirm={() => onCreate(name.trim(), resolvedDivisionId)}
            onClose={onClose}
            failureFallback="The phase could not be created."
        >
            {divisions && divisions.length > 0 && (
                <div>
                    <h3 className="mb-1">Division</h3>
                    <Select
                        value={selectedDivisionId}
                        onChange={setSelectedDivisionId}
                        options={divisions.map((division) => ({ value: division.id, label: division.name }))}
                    />
                </div>
            )}
            <div>
                <h3 className="mb-1">Name</h3>
                <input
                    data-autofocus
                    className="w-full rounded-lg border border-ui-border-strong px-2 py-2"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Phase name"
                />
            </div>
        </FormModal>
    );
}
