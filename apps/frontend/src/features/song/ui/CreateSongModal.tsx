import { useEffect, useState } from 'react';
import FormModal from '@/shared/components/ui/FormModal';

type Props = {
    open: boolean;
    onClose: () => void;
    initialGroup?: string;
    existingGroups?: string[];
    onCreate: (title: string, difficulty: number, group: string, artist?: string) => Promise<void>;
};

export default function CreateSongModal({ open, onClose, initialGroup, existingGroups = [], onCreate }: Props) {
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [group, setGroup] = useState('');

    const isNewGroup = initialGroup === undefined;

    useEffect(() => {
        if (!open) {
            return;
        }

        setTitle('');
        setArtist('');
        setDifficulty('');
        setGroup(initialGroup ?? '');
    }, [open, initialGroup]);

    const resolvedGroup = isNewGroup ? group.trim() : initialGroup;

    const validate = () => {
        const errors: string[] = [];
        if (!title.trim()) {
            errors.push('A song needs a title.');
        }
        if (!difficulty.trim() || Number.isNaN(Number(difficulty)) || Number(difficulty) < 1) {
            errors.push('Difficulty is a number of 1 or more.');
        }
        if (!resolvedGroup) {
            errors.push('A song needs a pack.');
        } else if (isNewGroup && existingGroups.includes(resolvedGroup)) {
            errors.push(`The pack "${resolvedGroup}" already exists. Add the song to it instead.`);
        }

        return errors;
    };

    return (
        <FormModal
            open={open}
            title={isNewGroup ? 'Add Song in New Group' : `Add Song to "${initialGroup}"`}
            confirmText="Add Song"
            validate={validate}
            onConfirm={() => onCreate(title.trim(), Number(difficulty), resolvedGroup!, artist.trim() || undefined)}
            onClose={onClose}
            failureFallback="The song could not be added."
            maxWidth="max-w-sm"
        >
            <div>
                <label className="mb-1 block text-sm font-medium text-ui-text-soft">Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full rounded border px-3 py-1.5 text-sm"
                    placeholder="Song title"
                />
            </div>
            <div>
                <label className="mb-1 block text-sm font-medium text-ui-text-soft">
                    Artist <span className="font-normal text-ui-text-mute">(optional)</span>
                </label>
                <input
                    type="text"
                    value={artist}
                    onChange={(event) => setArtist(event.target.value)}
                    className="w-full rounded border px-3 py-1.5 text-sm"
                    placeholder="Artist name"
                />
            </div>
            <div>
                <label className="mb-1 block text-sm font-medium text-ui-text-soft">Difficulty</label>
                <input
                    type="number"
                    min={1}
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value)}
                    className="w-full rounded border px-3 py-1.5 text-sm"
                    placeholder="e.g. 8"
                />
            </div>
            <div>
                <label className="mb-1 block text-sm font-medium text-ui-text-soft">Pack</label>
                <input
                    type="text"
                    value={group}
                    onChange={(event) => setGroup(event.target.value)}
                    className="w-full rounded border px-3 py-1.5 text-sm disabled:bg-ui-raised disabled:text-ui-text-mute"
                    placeholder="e.g. Pack A"
                    disabled={!isNewGroup}
                />
                {!isNewGroup && <p className="mt-1 text-xs text-ui-text-mute">Pack is preselected for this action.</p>}
            </div>
        </FormModal>
    );
}
