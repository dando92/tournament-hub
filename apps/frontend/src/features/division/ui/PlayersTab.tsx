import ConfirmModal from '@/shared/components/ui/ConfirmModal';
import ParticipantMembershipList from '@/features/division/ui/ParticipantMembershipList';
import PlayersSelectionBar from '@/features/division/ui/PlayersSelectionBar';
import PlayersToolbar from '@/features/division/ui/PlayersToolbar';
import { usePlayersTab } from '@/features/division/model/usePlayersTab';
import { Division } from '@/features/division/model/types';
import { Entrant } from '@/features/participant/model/types';

type Props = {
    division: Division;
    entrants: Entrant[];
    canEdit: boolean;
};

const NAMES_IN_DIALOG = 8;

export default function PlayersTab({ division, entrants, canEdit }: Props) {
    const state = usePlayersTab({ division, entrants });
    const removing = state.pendingRemoval;
    const names = removing.slice(0, NAMES_IN_DIALOG).map((participant) => participant.player.playerName);
    const rest = removing.length - names.length;

    return (
        <div className="flex w-full flex-col gap-4">
            <PlayersToolbar
                search={state.search}
                order={state.order}
                filter={state.filter}
                counts={state.counts}
                canEdit={canEdit}
                selecting={state.selecting}
                onSearchChange={state.setSearch}
                onSearchEnter={state.activateOnlyMatch}
                onOrderChange={state.setOrder}
                onFilterChange={state.setFilter}
                onStartSelecting={state.startSelecting}
            />

            <p className="text-xs text-ui-text-mute">
                <span className="tabular-nums">{state.summary.entrants}</span> of <span className="tabular-nums">{state.summary.participants}</span> participants
                compete in this division.
            </p>

            <ParticipantMembershipList
                participants={state.visibleParticipants}
                divisionParticipantIds={state.divisionParticipantIds}
                canEdit={canEdit}
                selecting={state.selecting}
                selectedIds={state.selectedIds}
                onActivate={state.activate}
                emptyMessage={state.summary.participants === 0 ? 'No participants available.' : 'Nobody matches what the search and the filter left.'}
            />

            {canEdit && state.selecting && (
                <PlayersSelectionBar
                    selectedCount={state.selectedIds.size}
                    addCount={state.selectedToAdd.length}
                    removeCount={state.selectedToRemove.length}
                    allVisibleSelected={state.allVisibleSelected}
                    visibleCount={state.visibleParticipants.length}
                    saving={state.saving}
                    onToggleAllVisible={state.toggleAllVisible}
                    onAdd={() => state.addSelected().catch(() => {})}
                    onRemove={() => state.askToRemove(state.selectedToRemove)}
                    onCancel={state.stopSelecting}
                />
            )}

            <ConfirmModal
                open={removing.length > 0}
                title={removing.length === 1 ? `Remove ${names[0]} from the division?` : `Remove ${removing.length} entrants from the division?`}
                confirmText={removing.length === 1 ? 'Remove' : `Remove ${removing.length}`}
                onConfirm={state.confirmRemoval}
                onClose={state.cancelRemoval}
                failureFallback="They could not be removed from the division."
            >
                {removing.length > 1 && (
                    <p className="mb-2 text-ui-text">
                        {names.join(', ')}
                        {rest > 0 ? ` and ${rest} more` : ''}
                    </p>
                )}
                <p>They stop competing. The matches they already played keep them, and adding them back restores the same entrant.</p>
            </ConfirmModal>
        </div>
    );
}
