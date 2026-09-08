import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faListCheck } from '@fortawesome/free-solid-svg-icons';
import PlayersSearchBar from '@/features/division/ui/PlayersSearchBar';
import { RosterFilter, RosterOrder } from '@/features/division/model/usePlayersTab';
import { focusRing } from '@/styles/buttonStyles';

type PlayersToolbarProps = {
    search: string;
    order: RosterOrder;
    filter: RosterFilter;
    counts: { all: number; entrants: number; others: number };
    canEdit: boolean;
    selecting: boolean;
    onSearchChange: (value: string) => void;
    onSearchEnter: () => void;
    onOrderChange: (order: RosterOrder) => void;
    onFilterChange: (filter: RosterFilter) => void;
    onStartSelecting: () => void;
};

const CHIP_BASE = `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${focusRing}`;
const SEGMENT_BASE = `px-2.5 py-1 text-xs transition-colors ${focusRing}`;

export default function PlayersToolbar({
    search,
    order,
    filter,
    counts,
    canEdit,
    selecting,
    onSearchChange,
    onSearchEnter,
    onOrderChange,
    onFilterChange,
    onStartSelecting,
}: PlayersToolbarProps) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                    <PlayersSearchBar value={search} onChange={onSearchChange} onEnter={onSearchEnter} />
                </div>
                {canEdit && !selecting && (
                    <button
                        type="button"
                        onClick={onStartSelecting}
                        title="Pick several people, then admit or withdraw them together"
                        className={`inline-flex shrink-0 items-center gap-2 rounded border border-ui-border px-3 py-2 text-xs font-medium text-ui-text-soft transition-colors hover:border-ui-border-strong hover:bg-ui-raised hover:text-ui-text ${focusRing}`}
                    >
                        <FontAwesomeIcon icon={faListCheck} />
                        <span className="hidden sm:inline">Select</span>
                    </button>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Chip label="All" count={counts.all} active={filter === 'all'} onClick={() => onFilterChange('all')} />
                <Chip label="Entrants" count={counts.entrants} active={filter === 'entrants'} onClick={() => onFilterChange('entrants')} />
                <Chip label="Not entrants" count={counts.others} active={filter === 'others'} onClick={() => onFilterChange('others')} />

                <div className="ml-auto flex items-center gap-2">
                    <span className="hidden text-xs text-ui-text-mute sm:inline">Sort</span>
                    <div className="flex items-center overflow-hidden rounded border border-ui-border" role="group" aria-label="Sort order">
                        <Segment label="Added" active={order === 'added'} onClick={() => onOrderChange('added')} />
                        <Segment label="Name" active={order === 'name'} onClick={() => onOrderChange('name')} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function Chip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`${CHIP_BASE} ${active ? 'border-ui-border-strong bg-ui-selected font-semibold text-ui-text' : 'border-ui-border text-ui-text-soft hover:bg-ui-raised hover:text-ui-text'}`}
        >
            {label}
            <span className="tabular-nums text-ui-text-mute">{count}</span>
        </button>
    );
}

function Segment({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`${SEGMENT_BASE} ${active ? 'bg-ui-selected font-semibold text-ui-text' : 'text-ui-text-soft hover:bg-ui-raised hover:text-ui-text'}`}
        >
            {label}
        </button>
    );
}
