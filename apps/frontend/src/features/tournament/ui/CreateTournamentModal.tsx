import { useEffect, useState } from 'react';
import { TournamentRef } from '@/features/tournament/model/types';
import { createTournament } from '@/features/tournament/api/tournament.api';
import FormModal from '@/shared/components/ui/FormModal';

type Props = {
    open: boolean;
    onClose: () => void;
    onCreated: (tournament: TournamentRef) => void;
};

export default function CreateTournamentModal({ open, onClose, onCreated }: Props) {
    const [name, setName] = useState('');

    useEffect(() => {
        if (!open) {
            return;
        }

        setName('');
    }, [open]);

    const create = async () => {
        const trimmed = name.trim();
        const id = await createTournament(trimmed);
        onCreated({ id, name: trimmed });
    };

    return (
        <FormModal
            open={open}
            title="New Tournament"
            confirmText="Create"
            validate={() => (name.trim() ? [] : ['A tournament needs a name.'])}
            onConfirm={create}
            onClose={onClose}
            failureFallback="The tournament could not be created."
            maxWidth="max-w-md"
        >
            <div>
                <label className="mb-1 block text-sm font-medium">Tournament Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded border px-3 py-2"
                    placeholder="e.g. Euro Cup 2026"
                />
            </div>
            <p className="text-sm text-ui-text-mute">Syncstart, start.gg and scoring settings are configured after creation in the tournament configuration page.</p>
        </FormModal>
    );
}
