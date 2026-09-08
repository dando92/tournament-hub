import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Division, Entrant, Participant, Phase, Tournament } from '@tournament-hub/persistence';
import type { ScoringSystemType } from '@tournament-hub/scoring';

export type DivisionAddress = {
    tournamentId: number;
    divisionId: number;
};

export type DivisionDetails = {
    name?: string;
};

export class DivisionAggregate {
    private readonly removedPhaseIds: number[] = [];

    private constructor(private readonly division: Division) {}

    static of(division: Division): DivisionAggregate {
        return new DivisionAggregate(division);
    }

    static create(details: DivisionDetails, tournament: Tournament): DivisionAggregate {
        const division = new Division();
        division.name = details.name ?? '';
        division.tournament = tournament;
        division.entrants = [];
        division.phases = [];

        return new DivisionAggregate(division);
    }

    get id(): number {
        return this.division.id;
    }

    get entity(): Division {
        return this.division;
    }

    get address(): DivisionAddress {
        return {
            tournamentId: this.division.tournament?.id,
            divisionId: this.division.id,
        };
    }

    get nextPhaseNumber(): number {
        return (this.division.phases?.length ?? 0) + 1;
    }

    get defaultScoringSystem(): ScoringSystemType {
        return this.division.tournament.defaultScoringSystem;
    }

    addPhase(name: string): Phase {
        const phase = new Phase();
        phase.name = name;
        phase.division = this.division;
        phase.phaseGroups = [];
        this.division.phases = [...(this.division.phases ?? []), phase];

        return phase;
    }

    renamePhase(phaseId: number, name: string): void {
        const phase = this.phase(phaseId);
        const trimmed = name?.trim();
        if (trimmed) phase.name = trimmed;
    }

    removePhase(phaseId: number): void {
        const phase = this.phase(phaseId);
        this.division.phases = (this.division.phases ?? []).filter((candidate) => candidate !== phase);
        this.removedPhaseIds.push(phase.id);
    }

    phase(phaseId: number): Phase {
        const phase = (this.division.phases ?? []).find((candidate) => candidate.id === phaseId);
        if (!phase) throw new NotFoundException(`Phase with ID ${phaseId} not found`);

        return phase;
    }

    get removals(): number[] {
        return [...this.removedPhaseIds];
    }

    settle(): void {
        this.removedPhaseIds.length = 0;
    }

    get activeEntrants(): Entrant[] {
        return (this.division.entrants ?? [])
            .filter((entrant) => entrant.status === 'active')
            .sort(
                (left, right) =>
                    (left.seedNum ?? Number.MAX_SAFE_INTEGER) - (right.seedNum ?? Number.MAX_SAFE_INTEGER)
                    || left.name.localeCompare(right.name)
                    || left.id - right.id,
            );
    }

    describe(details: DivisionDetails): void {
        if (details.name !== undefined) this.division.name = details.name;
    }

    moveTo(tournament: Tournament): void {
        this.division.tournament = tournament;
    }

    seed(entrantIds: number[]): void {
        const entrantsById = new Map((this.division.entrants ?? []).map((entrant) => [entrant.id, entrant]));

        entrantIds.forEach((entrantId, index) => {
            const entrant = entrantsById.get(entrantId);
            if (!entrant) throw new NotFoundException(`Entrant ${entrantId} does not belong to division ${this.division.id}`);

            entrant.seedNum = index + 1;
        });
    }

    admit(participant: Participant): Entrant {
        const existing = this.entrantOfParticipant(participant.id);
        if (existing) {
            existing.status = 'active';

            return existing;
        }

        const entrant = new Entrant();
        entrant.division = this.division;
        entrant.name = participant.player.playerName;
        entrant.type = 'player';
        entrant.status = 'active';
        entrant.participants = [participant];
        this.division.entrants = [...(this.division.entrants ?? []), entrant];

        return entrant;
    }

    withdrawParticipant(participantId: number): void {
        const entrant = this.entrantOfParticipant(participantId);
        if (entrant) entrant.status = 'withdrawn';
    }

    withdrawPlayer(playerId: number): void {
        const entrant = (this.division.entrants ?? []).find((candidate) =>
            (candidate.participants ?? []).some((participant) => participant.player?.id === playerId),
        );
        if (entrant) entrant.status = 'withdrawn';
    }

    assertCanGenerateBracket(): void {
        if (this.activeEntrants.length === 0) {
            throw new BadRequestException('Cannot generate a bracket without active entrants.');
        }
    }

    private entrantOfParticipant(participantId: number): Entrant | undefined {
        return (this.division.entrants ?? []).find((entrant) =>
            (entrant.participants ?? []).some((participant) => participant.id === participantId),
        );
    }
}
