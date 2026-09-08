import { Entrant, Phase, PhaseGroup, PhaseGroupEntrant, PhaseGroupState } from '@tournament-hub/persistence';

import { poolTotals } from '@tournament/structure/phase-group/pool-totals';

export type PhaseGroupAddress = {
    tournamentId: number;
    divisionId: number;
    phaseId: number;
    phaseGroupId: number;
};

export type PhaseAddress = {
    tournamentId: number;
    divisionId: number;
    phaseId: number;
};

export type PhaseGroupDetails = {
    name?: string;
    displayIdentifier?: string | null;
    bracketType?: string | null;
    state?: string;
};

export type Placement = {
    entrant: Entrant;
    slot?: number | null;
    sourceAdvancementRuleId?: number | null;
};

const DEFAULT_IDENTIFIER = 'Pool';
const STATES: PhaseGroupState[] = ['pending', 'active', 'completed'];

export class PhaseGroupAggregate {
    private readonly removedSeatIds: number[] = [];

    private constructor(private readonly phaseGroup: PhaseGroup) {}

    static of(phaseGroup: PhaseGroup): PhaseGroupAggregate {
        return new PhaseGroupAggregate(phaseGroup);
    }

    static create(details: PhaseGroupDetails, phase: Phase): PhaseGroupAggregate {
        const displayIdentifier = details.displayIdentifier?.trim() || PhaseGroupAggregate.nextIdentifier(phase);

        const phaseGroup = new PhaseGroup();
        phaseGroup.name = details.name?.trim() || displayIdentifier;
        phaseGroup.displayIdentifier = displayIdentifier;
        phaseGroup.bracketType = details.bracketType ?? null;
        phaseGroup.state = 'pending';
        phaseGroup.phase = phase;
        phaseGroup.entrants = [];
        phaseGroup.matches = [];

        return new PhaseGroupAggregate(phaseGroup);
    }

    get id(): number {
        return this.phaseGroup.id;
    }

    get entity(): PhaseGroup {
        return this.phaseGroup;
    }

    get address(): PhaseGroupAddress {
        return { ...this.phaseAddress, phaseGroupId: this.phaseGroup.id };
    }

    get phaseAddress(): PhaseAddress {
        const phase = this.phaseGroup.phase;

        return {
            tournamentId: phase?.division?.tournament?.id,
            divisionId: phase?.division?.id,
            phaseId: phase?.id,
        };
    }

    get removals(): number[] {
        return [...this.removedSeatIds];
    }

    get isDecided(): boolean {
        const matches = this.phaseGroup.matches ?? [];

        return matches.length > 0 && matches.every((match) => Boolean(match.matchResult));
    }

    get placements(): Entrant[] {
        const entrantsById = new Map<number, Entrant>();
        const matches = (this.phaseGroup.matches ?? []).map((match) => {
            const pointsByPlayerId = new Map((match.matchResult?.playerPoints ?? []).map((entry) => [entry.playerId, entry.points]));

            return (match.entrants ?? []).map((entrant) => {
                entrantsById.set(entrant.id, entrant);

                return { entrantId: entrant.id, points: pointsByPlayerId.get(entrant.participants?.[0]?.player?.id) ?? 0 };
            });
        });

        return poolTotals(matches)
            .map((total) => entrantsById.get(total.entrantId))
            .filter((entrant): entrant is Entrant => Boolean(entrant));
    }

    describe(details: PhaseGroupDetails): void {
        if (details.name !== undefined) this.phaseGroup.name = details.name;
        if (details.displayIdentifier !== undefined) this.phaseGroup.displayIdentifier = details.displayIdentifier;
        if (details.bracketType !== undefined) this.phaseGroup.bracketType = details.bracketType;
        if (details.state !== undefined && STATES.includes(details.state as PhaseGroupState)) {
            this.phaseGroup.state = details.state as PhaseGroupState;
        }
    }

    seat(entrants: Entrant[]): void {
        const seatsByEntrantId = new Map((this.phaseGroup.entrants ?? []).map((seat) => [seat.entrant.id, seat]));

        this.phaseGroup.entrants = entrants.map((entrant, index) => {
            const seat = seatsByEntrantId.get(entrant.id) ?? this.newSeat(entrant);
            seatsByEntrantId.delete(entrant.id);
            seat.seedNum = index + 1;
            seat.slot = index + 1;
            seat.status = 'active';

            return seat;
        });

        for (const seat of seatsByEntrantId.values()) this.drop(seat);
    }

    place(placement: Placement): void {
        const seats = this.phaseGroup.entrants ?? [];
        let seat = seats.find((candidate) => candidate.entrant.id === placement.entrant.id);
        if (!seat) {
            seat = this.newSeat(placement.entrant);
            this.phaseGroup.entrants = [...seats, seat];
        }

        const slot = placement.slot ?? seat.slot ?? this.nextSlot();
        seat.slot = slot;
        seat.seedNum = slot;
        seat.status = 'active';
        if (placement.sourceAdvancementRuleId) {
            seat.sourceAdvancementRule = { id: placement.sourceAdvancementRuleId } as PhaseGroupEntrant['sourceAdvancementRule'];
        }
    }

    release(entrantId: number): void {
        const seat = (this.phaseGroup.entrants ?? []).find((candidate) => candidate.entrant.id === entrantId);
        if (!seat) return;

        this.phaseGroup.entrants = (this.phaseGroup.entrants ?? []).filter((candidate) => candidate !== seat);
        this.drop(seat);
    }

    markAdvanced(entrantIds: number[]): void {
        const advanced = new Set(entrantIds);

        for (const seat of this.phaseGroup.entrants ?? []) {
            if (advanced.has(seat.entrant.id)) seat.status = 'advanced';
            else if (seat.status === 'advanced') seat.status = 'active';
        }
    }

    complete(): void {
        this.phaseGroup.state = 'completed';
    }

    reopen(): void {
        this.phaseGroup.state = 'active';
    }

    settle(): void {
        this.removedSeatIds.length = 0;
    }

    private newSeat(entrant: Entrant): PhaseGroupEntrant {
        const seat = new PhaseGroupEntrant();
        seat.phaseGroup = this.phaseGroup;
        seat.entrant = entrant;
        seat.status = 'active';

        return seat;
    }

    private drop(seat: PhaseGroupEntrant): void {
        if (seat.id) this.removedSeatIds.push(seat.id);
    }

    private nextSlot(): number {
        return (this.phaseGroup.entrants ?? []).reduce((max, seat) => Math.max(max, seat.slot ?? 0), 0) + 1;
    }

    private static nextIdentifier(phase: Phase): string {
        const pools = phase.phaseGroups ?? [];
        if (pools.length === 0) return DEFAULT_IDENTIFIER;

        const taken = new Set(
            pools
                .flatMap((phaseGroup) => [phaseGroup.displayIdentifier?.trim(), phaseGroup.name?.trim()])
                .filter((identifier): identifier is string => Boolean(identifier)),
        );
        let number = pools.length + 1;
        while (taken.has(`${DEFAULT_IDENTIFIER} ${number}`)) number += 1;

        return `${DEFAULT_IDENTIFIER} ${number}`;
    }
}
