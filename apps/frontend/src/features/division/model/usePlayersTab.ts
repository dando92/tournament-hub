import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { usePageNotices } from '@/shared/context/PageNoticeContext';
import { Division } from '@/features/division/model/types';
import { Entrant, Participant } from '@/features/participant/model/types';
import {
    addParticipantsToDivision,
    listAvailableParticipantsForDivision,
    removeParticipantsFromDivision,
} from '@/features/participant/api/participant.api';

type UsePlayersTabOptions = {
    division: Division;
    entrants: Entrant[];
};

export type RosterOrder = 'added' | 'name';

export type RosterFilter = 'all' | 'entrants' | 'others';

function competing(entrants: Entrant[]): Participant[] {
    return entrants
        .filter((entrant) => entrant.status === 'active')
        .flatMap((entrant) => entrant.participants ?? [])
        .filter(Boolean);
}

export function usePlayersTab({ division, entrants }: UsePlayersTabOptions) {
    const { report } = usePageNotices();
    const [divisionParticipants, setDivisionParticipants] = useState<Participant[]>(competing(entrants));
    const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
    const [search, setSearch] = useState('');
    const [order, setOrder] = useState<RosterOrder>('added');
    const [filter, setFilter] = useState<RosterFilter>('all');
    const [selecting, setSelecting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [anchorId, setAnchorId] = useState<number | null>(null);
    const [pendingRemoval, setPendingRemoval] = useState<Participant[]>([]);
    const [saving, setSaving] = useState(false);

    const loadAvailableParticipants = useCallback(async () => {
        const participants = await listAvailableParticipantsForDivision(division.id);
        setAvailableParticipants(participants);
    }, [division.id]);

    useEffect(() => {
        loadAvailableParticipants().catch(() => {});
    }, [loadAvailableParticipants]);

    useEffect(() => {
        setDivisionParticipants(competing(entrants));
    }, [entrants]);

    const divisionParticipantIds = useMemo(
        () => new Set(divisionParticipants.map((participant) => participant.id)),
        [divisionParticipants],
    );

    const everybody = useMemo(
        () => {
            const participants = [...divisionParticipants, ...availableParticipants].filter(
                (participant, index, all) => all.findIndex((candidate) => candidate.id === participant.id) === index,
            );

            return order === 'name'
                ? [...participants].sort((a, b) => a.player.playerName.localeCompare(b.player.playerName))
                : [...participants].sort((a, b) => a.id - b.id);
        },
        [availableParticipants, divisionParticipants, order],
    );

    const lowerSearch = search.trim().toLowerCase();
    const searched = useMemo(
        () => everybody.filter((participant) => participant.player.playerName.toLowerCase().includes(lowerSearch)),
        [everybody, lowerSearch],
    );

    const counts = useMemo(
        () => {
            const entrantCount = searched.filter((participant) => divisionParticipantIds.has(participant.id)).length;

            return { all: searched.length, entrants: entrantCount, others: searched.length - entrantCount };
        },
        [divisionParticipantIds, searched],
    );

    const visibleParticipants = useMemo(
        () => {
            if (filter === 'entrants') {
                return searched.filter((participant) => divisionParticipantIds.has(participant.id));
            }
            if (filter === 'others') {
                return searched.filter((participant) => !divisionParticipantIds.has(participant.id));
            }

            return searched;
        },
        [divisionParticipantIds, filter, searched],
    );

    const summary = useMemo(
        () => ({ entrants: divisionParticipants.length, participants: everybody.length }),
        [divisionParticipants.length, everybody.length],
    );

    const selected = useMemo(
        () => everybody.filter((participant) => selectedIds.has(participant.id)),
        [everybody, selectedIds],
    );
    const selectedToAdd = useMemo(
        () => selected.filter((participant) => !divisionParticipantIds.has(participant.id)),
        [divisionParticipantIds, selected],
    );
    const selectedToRemove = useMemo(
        () => selected.filter((participant) => divisionParticipantIds.has(participant.id)),
        [divisionParticipantIds, selected],
    );
    const allVisibleSelected = visibleParticipants.length > 0 && visibleParticipants.every((participant) => selectedIds.has(participant.id));

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
        setAnchorId(null);
    }, []);

    const stopSelecting = useCallback(() => {
        setSelecting(false);
        clearSelection();
    }, [clearSelection]);

    const admit = useCallback(
        async (participants: Participant[]) => {
            if (participants.length === 0) {
                return;
            }

            const ids = participants.map((participant) => participant.id);
            const idSet = new Set(ids);
            setSaving(true);
            setDivisionParticipants((current) => [...current, ...participants.filter((participant) => !current.some((entry) => entry.id === participant.id))]);
            setAvailableParticipants((current) => current.filter((entry) => !idSet.has(entry.id)));

            try {
                await addParticipantsToDivision(division.id, ids);
                await loadAvailableParticipants();
            } catch (error) {
                setDivisionParticipants((current) => current.filter((entry) => !idSet.has(entry.id)));
                setAvailableParticipants((current) => [...current, ...participants]);
                report(apiErrorMessage(error, 'They could not be added to the division.'));
                throw error;
            } finally {
                setSaving(false);
            }
        },
        [division.id, loadAvailableParticipants, report],
    );

    const withdraw = useCallback(
        async (participants: Participant[]) => {
            if (participants.length === 0) {
                return;
            }

            const ids = participants.map((participant) => participant.id);
            const idSet = new Set(ids);
            setSaving(true);
            setDivisionParticipants((current) => current.filter((entry) => !idSet.has(entry.id)));
            setAvailableParticipants((current) => [...current, ...participants.filter((participant) => !current.some((entry) => entry.id === participant.id))]);

            try {
                await removeParticipantsFromDivision(division.id, ids);
                await loadAvailableParticipants();
            } catch (error) {
                setDivisionParticipants((current) => [...current, ...participants]);
                setAvailableParticipants((current) => current.filter((entry) => !idSet.has(entry.id)));
                throw error;
            } finally {
                setSaving(false);
            }
        },
        [division.id, loadAvailableParticipants],
    );

    const askToRemove = useCallback((participants: Participant[]) => setPendingRemoval(participants), []);
    const cancelRemoval = useCallback(() => setPendingRemoval([]), []);
    const confirmRemoval = useCallback(
        async () => {
            await withdraw(pendingRemoval);
            setPendingRemoval([]);
            clearSelection();
        },
        [clearSelection, pendingRemoval, withdraw],
    );

    const select = useCallback(
        (participant: Participant, extend: boolean) => {
            setSelecting(true);
            setSelectedIds((current) => {
                const next = new Set(current);
                if (extend && anchorId !== null) {
                    const from = visibleParticipants.findIndex((candidate) => candidate.id === anchorId);
                    const to = visibleParticipants.findIndex((candidate) => candidate.id === participant.id);
                    if (from !== -1 && to !== -1) {
                        const range = visibleParticipants.slice(Math.min(from, to), Math.max(from, to) + 1);
                        range.forEach((entry) => next.add(entry.id));

                        return next;
                    }
                }

                if (next.has(participant.id)) {
                    next.delete(participant.id);
                } else {
                    next.add(participant.id);
                }

                return next;
            });
            setAnchorId(participant.id);
        },
        [anchorId, visibleParticipants],
    );

    const toggleAllVisible = useCallback(() => {
        setSelectedIds((current) => {
            const next = new Set(current);
            const all = visibleParticipants.every((participant) => next.has(participant.id));
            visibleParticipants.forEach((participant) => (all ? next.delete(participant.id) : next.add(participant.id)));

            return next;
        });
        setAnchorId(null);
    }, [visibleParticipants]);

    const activate = useCallback(
        (participant: Participant, extend: boolean) => {
            if (selecting || extend) {
                select(participant, extend);

                return;
            }

            setAnchorId(participant.id);
            if (divisionParticipantIds.has(participant.id)) {
                askToRemove([participant]);

                return;
            }

            admit([participant]).catch(() => {});
        },
        [admit, askToRemove, divisionParticipantIds, select, selecting],
    );

    const activateOnlyMatch = useCallback(() => {
        if (selecting || lowerSearch === '' || visibleParticipants.length !== 1) {
            return;
        }

        activate(visibleParticipants[0], false);
        setSearch('');
    }, [activate, lowerSearch, selecting, visibleParticipants]);

    const addSelected = useCallback(
        async () => {
            await admit(selectedToAdd);
            clearSelection();
        },
        [admit, clearSelection, selectedToAdd],
    );

    return {
        search,
        order,
        filter,
        counts,
        summary,
        visibleParticipants,
        divisionParticipantIds,
        selecting,
        selectedIds,
        selectedToAdd,
        selectedToRemove,
        allVisibleSelected,
        pendingRemoval,
        saving,
        setSearch,
        setOrder,
        setFilter,
        startSelecting: () => setSelecting(true),
        stopSelecting,
        toggleAllVisible,
        activate,
        activateOnlyMatch,
        addSelected,
        askToRemove,
        cancelRemoval,
        confirmRemoval,
    };
}
