import { useEffect, useMemo, useState } from 'react';
import { Entrant } from '@/features/participant/model/types';
import FormModal from '@/shared/components/ui/FormModal';
import MultiSelect from '@/shared/components/ui/MultiSelect';

type AddPlayersToMatchModalProps = {
    open: boolean;
    divisionEntrants: Entrant[];
    matchEntrants: Entrant[];
    onClose: () => void;
    onAddPlayers: (entrantIds: number[]) => Promise<void>;
};

export default function AddPlayersToMatchModal({ open, divisionEntrants, matchEntrants, onClose, onAddPlayers }: AddPlayersToMatchModalProps) {
    const [selectedEntrantIds, setSelectedEntrantIds] = useState<number[]>([]);

    useEffect(() => {
        if (!open) {
            return;
        }

        setSelectedEntrantIds([]);
    }, [open]);

    const matchEntrantIds = useMemo(() => new Set(matchEntrants.map((entrant) => entrant.id)), [matchEntrants]);
    const availableEntrants = useMemo(
        () =>
            divisionEntrants
                .filter((entrant) => entrant.status === 'active' && entrant.type === 'player')
                .filter((entrant) => !matchEntrantIds.has(entrant.id))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [divisionEntrants, matchEntrantIds],
    );
    const entrantOptions = useMemo(() => availableEntrants.map((entrant) => ({ value: entrant.id, label: entrant.name })), [availableEntrants]);
    const selectedEntrantOptions = useMemo(
        () =>
            selectedEntrantIds
                .map((entrantId) => entrantOptions.find((option) => option.value === entrantId))
                .filter((option): option is { value: number; label: string } => Boolean(option)),
        [entrantOptions, selectedEntrantIds],
    );

    const addPlayers = () => onAddPlayers([...matchEntrants.map((entrant) => entrant.id), ...selectedEntrantIds]);

    return (
        <FormModal
            open={open}
            title="Add players to match"
            confirmText="Add selected"
            validate={() => (selectedEntrantIds.length > 0 ? [] : ['Choose at least one player.'])}
            onConfirm={addPlayers}
            onClose={onClose}
            failureFallback="The players could not be added."
            maxWidth="max-w-md"
        >
            {availableEntrants.length === 0 ? (
                <p className="text-sm italic text-ui-text-mute">No available players.</p>
            ) : (
                <MultiSelect
                    options={entrantOptions}
                    value={selectedEntrantOptions}
                    onChange={(selected) => setSelectedEntrantIds(selected.map((option) => option.value))}
                    placeholder="Select players..."
                />
            )}
        </FormModal>
    );
}
