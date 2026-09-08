import { useEffect, useState } from 'react';
import FormModal from '@/shared/components/ui/FormModal';

export type RemovableMatchItem = {
    id: number;
    label: string;
};

type Props = {
    open: boolean;
    title: string;
    emptyMessage: string;
    items: RemovableMatchItem[];
    onClose: () => void;
    onRemove: (ids: number[]) => Promise<void>;
};

export default function RemoveMatchItemsModal({ open, title, emptyMessage, items, onClose, onRemove }: Props) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        if (!open) {
            return;
        }

        setSelectedIds([]);
    }, [open, items]);

    function toggle(id: number) {
        setSelectedIds((current) => (current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id]));
    }

    return (
        <FormModal
            open={open}
            title={title}
            confirmText={`Remove selected (${selectedIds.length})`}
            confirmTone="danger"
            validate={() => (selectedIds.length > 0 ? [] : ['Choose what to remove.'])}
            onConfirm={() => onRemove(selectedIds)}
            onClose={onClose}
            failureFallback="Not everything could be removed."
            maxWidth="max-w-md"
        >
            {items.length === 0 ? (
                <p className="text-sm italic text-ui-text-mute">{emptyMessage}</p>
            ) : (
                <div className="max-h-[50dvh] overflow-y-auto rounded border border-ui-border bg-ui-row">
                    {items.map((item) => (
                        <label
                            key={item.id}
                            className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-ui-separator px-3 py-2 last:border-b-0 hover:bg-ui-raised"
                        >
                            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggle(item.id)} className="rounded" />
                            <span className="min-w-0 flex-1 truncate text-sm text-ui-text" title={item.label}>
                                {item.label}
                            </span>
                        </label>
                    ))}
                </div>
            )}
        </FormModal>
    );
}
