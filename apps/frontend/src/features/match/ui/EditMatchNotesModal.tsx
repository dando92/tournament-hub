import { useEffect, useState } from 'react';
import FormModal from '@/shared/components/ui/FormModal';
import { Match } from '@/features/match/model/types';

type EditMatchNotesModalProps = {
    open: boolean;
    match: Match;
    onClose: () => void;
    onSave: (matchId: number, notes: string) => Promise<void>;
};

export default function EditMatchNotesModal({ open, match, onClose, onSave }: EditMatchNotesModalProps) {
    const [notes, setNotes] = useState(match.notes || '');

    useEffect(() => {
        if (!open) {
            return;
        }

        setNotes(match.notes || '');
    }, [match.notes, open]);

    return (
        <FormModal
            open={open}
            title={`Edit notes for match ${match.name}`}
            confirmText="Save notes"
            onConfirm={() => onSave(match.id, notes)}
            onClose={onClose}
            failureFallback="The notes could not be saved."
        >
            <textarea
                className="h-[200px] w-full rounded-lg border border-ui-border-strong p-3 outline-none focus:border-ui-border-strong focus:ring-2 focus:ring-ui-accent"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
            />
        </FormModal>
    );
}
