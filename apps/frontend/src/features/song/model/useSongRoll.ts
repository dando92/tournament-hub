import { useCallback, useEffect, useState } from 'react';
import { Song } from '@/features/song/model/types';
import { rollSongs } from '@/features/song/api/song.api';
import { formatRollLevels, parseRollLevels } from '@/features/song/model/rollLevels';
import { readSongDialogChoices, writeSongDialogChoice } from '@/shared/lib/songDialogPreferences';

export type RollSlot = {
    key: string;
    level: number;
    song: Song | null;
    locked: boolean;
};

type UseSongRollOptions = {
    open: boolean;
    divisionId?: number;
    matchId?: number;
    tournamentId?: number;
    songGroups: string[];
};

let nextKey = 0;

export function useSongRoll({ open, divisionId, matchId, tournamentId, songGroups }: UseSongRollOptions) {
    const [levelsText, setLevelsText] = useState('');
    const [group, setGroup] = useState('');
    const [allowPlayed, setAllowPlayed] = useState(false);
    const [slots, setSlots] = useState<RollSlot[]>([]);
    const [rolling, setRolling] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);

    const levels = parseRollLevels(levelsText);
    const drawnSongIds = slots.flatMap((slot) => (slot.song ? [slot.song.id] : []));

    useEffect(() => {
        if (!open) {
            return;
        }

        const choices = readSongDialogChoices(tournamentId);
        setLevelsText('');
        setSlots([]);
        setFailure(null);
        setRolling(false);
        setAllowPlayed(choices.allowPlayed);
        setGroup(choices.rollPack);
    }, [open, tournamentId]);

    useEffect(() => {
        if (songGroups.length === 0) {
            return;
        }

        setGroup((current) => (current !== '' && !songGroups.includes(current) ? '' : current));
    }, [songGroups]);

    const chooseAllowPlayed = useCallback((value: boolean) => {
        setAllowPlayed(value);
        writeSongDialogChoice(tournamentId, 'allowPlayed', value);
    }, [tournamentId]);

    const chooseGroup = useCallback((value: string) => {
        setGroup(value);
        writeSongDialogChoice(tournamentId, 'rollPack', value);
    }, [tournamentId]);

    const draw = useCallback(async (request: { levels: number[]; excludeSongIds: number[] }) => {
        if (divisionId === undefined) {
            throw new Error('No division to draw from.');
        }

        return await rollSongs({
            divisionId,
            matchId,
            levels: request.levels,
            group: group || undefined,
            allowPlayed,
            excludeSongIds: request.excludeSongIds,
        });
    }, [allowPlayed, divisionId, group, matchId]);

    const rollAll = useCallback(async () => {
        const wanted = parseRollLevels(levelsText);
        if (wanted.length === 0) {
            return;
        }

        const kept = new Map<number, RollSlot>();
        slots.forEach((slot, index) => {
            if (slot.locked && slot.song && wanted[index] === slot.level) {
                kept.set(index, slot);
            }
        });

        const pending = wanted.map((level, index) => ({ level, index })).filter((entry) => !kept.has(entry.index));
        setRolling(true);
        setFailure(null);
        try {
            const drawn = pending.length > 0
                ? await draw({ levels: pending.map((entry) => entry.level), excludeSongIds: [...kept.values()].flatMap((slot) => (slot.song ? [slot.song.id] : [])) })
                : [];

            setSlots(wanted.map((level, index) => {
                const locked = kept.get(index);
                if (locked) {
                    return locked;
                }

                const position = pending.findIndex((entry) => entry.index === index);

                return { key: `slot-${nextKey++}`, level, song: drawn[position]?.song ?? null, locked: false };
            }));
        } catch (error) {
            setFailure(error instanceof Error ? error.message : 'Unable to roll the songs.');
        } finally {
            setRolling(false);
        }
    }, [draw, levelsText, slots]);

    const rerollSlot = useCallback(async (key: string) => {
        const slot = slots.find((candidate) => candidate.key === key);
        if (!slot) {
            return;
        }

        setRolling(true);
        setFailure(null);
        try {
            const [drawn] = await draw({ levels: [slot.level], excludeSongIds: drawnSongIds });
            if (!drawn?.song) {
                setFailure(`No other song of level ${slot.level} is available.`);

                return;
            }

            setSlots((current) => current.map((candidate) => (candidate.key === key ? { ...candidate, song: drawn.song } : candidate)));
        } catch (error) {
            setFailure(error instanceof Error ? error.message : 'Unable to roll the songs.');
        } finally {
            setRolling(false);
        }
    }, [draw, drawnSongIds, slots]);

    const toggleLock = useCallback((key: string) => {
        setSlots((current) => current.map((slot) => (slot.key === key ? { ...slot, locked: !slot.locked } : slot)));
    }, []);

    const removeSlot = useCallback((key: string) => {
        setSlots((current) => {
            const remaining = current.filter((slot) => slot.key !== key);
            setLevelsText(formatRollLevels(remaining.map((slot) => slot.level)));

            return remaining;
        });
    }, []);

    return {
        levels,
        levelsText,
        group,
        allowPlayed,
        slots,
        rolling,
        failure,
        drawnSongIds,
        canRoll: divisionId !== undefined && levels.length > 0 && !rolling,
        setLevelsText,
        setGroup: chooseGroup,
        setAllowPlayed: chooseAllowPlayed,
        rollAll,
        rerollSlot,
        toggleLock,
        removeSlot,
    };
}

export type SongRollState = ReturnType<typeof useSongRoll>;
