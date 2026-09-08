import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import { btnDanger, btnGhost, btnPrimary, focusRing } from '@/styles/buttonStyles';

type PlayersSelectionBarProps = {
    selectedCount: number;
    addCount: number;
    removeCount: number;
    allVisibleSelected: boolean;
    visibleCount: number;
    saving: boolean;
    onToggleAllVisible: () => void;
    onAdd: () => void;
    onRemove: () => void;
    onCancel: () => void;
};

export default function PlayersSelectionBar({
    selectedCount,
    addCount,
    removeCount,
    allVisibleSelected,
    visibleCount,
    saving,
    onToggleAllVisible,
    onAdd,
    onRemove,
    onCancel,
}: PlayersSelectionBarProps) {
    return (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 rounded border border-ui-border-strong bg-ui-surface px-3 py-2 shadow-card">
            <button
                type="button"
                onClick={onToggleAllVisible}
                disabled={visibleCount === 0}
                role="checkbox"
                aria-checked={allVisibleSelected}
                className={`inline-flex items-center gap-2 rounded px-1 py-1 text-xs text-ui-text-soft transition-colors hover:text-ui-text disabled:opacity-50 ${focusRing}`}
            >
                <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border text-[10px] ${
                        allVisibleSelected ? 'border-ui-accent bg-ui-accent text-ui-accent-contrast' : 'border-ui-border-strong'
                    }`}
                    aria-hidden
                >
                    {allVisibleSelected && <FontAwesomeIcon icon={faCheck} />}
                </span>
                Select all shown
            </button>

            <span className="text-xs tabular-nums text-ui-text-mute">{selectedCount} selected</span>

            <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={onAdd} disabled={saving || addCount === 0} className={`${btnPrimary} px-3 py-1.5 text-xs`}>
                    <FontAwesomeIcon icon={faPlus} className="mr-1.5" />
                    Add {addCount > 0 ? addCount : ''}
                </button>
                <button type="button" onClick={onRemove} disabled={saving || removeCount === 0} className={`${btnDanger} px-3 py-1.5 text-xs`}>
                    <FontAwesomeIcon icon={faMinus} className="mr-1.5" />
                    Remove {removeCount > 0 ? removeCount : ''}
                </button>
                <button type="button" onClick={onCancel} disabled={saving} className={`${btnGhost} px-3 py-1.5 text-xs`}>
                    Cancel
                </button>
            </div>
        </div>
    );
}
