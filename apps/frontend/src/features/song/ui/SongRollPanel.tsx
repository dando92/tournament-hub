import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDice, faLock, faLockOpen, faRotateRight, faXmark } from '@fortawesome/free-solid-svg-icons';
import { chartDifficultyPresentation, meterColor } from '@/features/song/model/chartDifficultyPresentation';
import { displaySongTitle } from '@/features/song/model/songTitle';
import type { RollSlot, SongRollState } from '@/features/song/model/useSongRoll';
import Select from '@/shared/components/ui/Select';
import OverflowMarquee from '@/shared/components/ui/OverflowMarquee';
import { btnPrimary, focusRing } from '@/styles/buttonStyles';

type SongRollPanelProps = {
    roll: SongRollState;
    songGroups: string[];
};

export default function SongRollPanel({ roll, songGroups }: SongRollPanelProps) {
    const rollOnEnter = (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter' || !roll.canRoll) {
            return;
        }

        event.preventDefault();
        void roll.rollAll();
    };

    return (
        <div className="w-full">
            <div className="flex flex-wrap items-end gap-3 py-2">
                <label className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ui-text-mute">Pack</span>
                    <Select
                        className="w-full sm:w-[240px]"
                        value={roll.group}
                        onChange={roll.setGroup}
                        options={[{ value: '', label: 'All packs' }, ...songGroups.map((group) => ({ value: group, label: group }))]}
                    />
                </label>

                <label className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ui-text-mute">Levels</span>
                    <input
                        value={roll.levelsText}
                        onChange={(event) => roll.setLevelsText(event.target.value)}
                        onKeyDown={rollOnEnter}
                        className={`w-full rounded border border-ui-border-strong bg-ui-surface px-3 py-2 text-sm text-ui-text sm:w-[220px] ${focusRing}`}
                        placeholder="9,9,10,10"
                        inputMode="decimal"
                    />
                </label>

                <button type="button" onClick={() => void roll.rollAll()} disabled={!roll.canRoll} className={`${btnPrimary} flex items-center gap-2`}>
                    <FontAwesomeIcon icon={faDice} />
                    {roll.slots.length > 0 ? 'Roll again' : 'Roll'}
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pb-2">
                {roll.levels.length > 0 && (
                    <p className="text-xs text-ui-text-mute">
                        {roll.levels.length} {roll.levels.length === 1 ? 'song' : 'songs'}: {roll.levels.join(' · ')}
                    </p>
                )}

                <label className="ml-auto flex items-center gap-2 text-sm text-ui-text-soft">
                    <input
                        type="checkbox"
                        checked={roll.allowPlayed}
                        onChange={(event) => roll.setAllowPlayed(event.target.checked)}
                    />
                    Allow songs already played in this division
                </label>
            </div>

            {roll.failure && <p className="py-1 text-sm text-state-failed">{roll.failure}</p>}

            {roll.slots.length === 0 ? (
                <p className="rounded border border-dashed border-ui-border-strong px-3 py-6 text-center text-sm text-ui-text-mute">
                    Type the levels to draw — <span className="font-semibold">9,9,10,10</span> draws four songs, and any
                    separator will do — then roll.
                </p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {roll.slots.map((slot) => (
                        <SongRollCard
                            key={slot.key}
                            slot={slot}
                            busy={roll.rolling}
                            onReroll={() => void roll.rerollSlot(slot.key)}
                            onToggleLock={() => roll.toggleLock(slot.key)}
                            onRemove={() => roll.removeSlot(slot.key)}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

const CARD_ACTION = `inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-ui-border text-ui-text-soft transition-colors hover:bg-ui-raised hover:text-ui-text disabled:opacity-40 ${focusRing}`;

type SongRollCardProps = {
    slot: RollSlot;
    busy: boolean;
    onReroll: () => void;
    onToggleLock: () => void;
    onRemove: () => void;
};

function SongRollCard({ slot, busy, onReroll, onToggleLock, onRemove }: SongRollCardProps) {
    const song = slot.song;
    const chart = song?.chartDifficulty ? chartDifficultyPresentation[song.chartDifficulty] : null;

    return (
        <li
            className={`flex items-center gap-3 rounded border px-3 py-2 transition-colors ${
                song ? 'border-ui-border bg-ui-surface' : 'border-dashed border-ui-border-strong bg-transparent'
            } ${slot.locked ? 'ring-1 ring-ui-accent' : ''}`}
        >
            <span className="flex w-10 shrink-0 flex-col items-center gap-0.5">
                <span
                    className={`${chart ? chart.badge : meterColor(slot.level)} flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold text-white`}
                    title={chart ? `${chart.label} ${slot.level}` : `Level ${slot.level}`}
                >
                    {slot.level}
                </span>

                {chart && (
                    <span className={`${chart.text} w-full truncate text-center text-[9px] font-semibold uppercase leading-none tracking-wide`}>
                        {chart.label}
                    </span>
                )}
            </span>

            {song ? (
                <span className="flex min-w-0 flex-1 flex-col">
                    <OverflowMarquee text={displaySongTitle(song.title)} className="text-sm text-ui-text" />
                    <span className="truncate text-xs text-ui-text-mute">{song.artist ? `${song.artist} · ${song.group}` : song.group}</span>
                </span>
            ) : (
                <span className="flex-1 text-sm text-ui-text-mute">Nothing of level {slot.level} left to draw.</span>
            )}

            <button
                type="button"
                onClick={onToggleLock}
                disabled={!song}
                title={slot.locked ? 'Unlock this card' : 'Keep this card through the next roll'}
                className={`${CARD_ACTION} ${slot.locked ? 'border-ui-accent text-ui-accent' : ''}`}
            >
                <FontAwesomeIcon icon={slot.locked ? faLock : faLockOpen} />
            </button>
            <button
                type="button"
                onClick={onReroll}
                disabled={busy || slot.locked}
                title="Draw another song for this level"
                className={CARD_ACTION}
            >
                <FontAwesomeIcon icon={faRotateRight} />
            </button>
            <button type="button" onClick={onRemove} title="Take this card out of the draw" className={CARD_ACTION}>
                <FontAwesomeIcon icon={faXmark} />
            </button>
        </li>
    );
}
