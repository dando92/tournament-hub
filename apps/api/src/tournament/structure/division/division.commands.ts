import { Injectable } from '@nestjs/common';
import { GenerateBracketResultDto } from '@tournament-hub/contracts';

import { BracketCommands } from '@bracket/bracket.commands';
import { UiUpdatePublisher } from '@tournament/shared/ui-update.publisher';
import { DivisionAggregate, DivisionDetails } from '@tournament/structure/division/division.aggregate';
import { DivisionStore } from '@tournament/structure/division/division.store';
import { PhaseGroupCommands } from '@tournament/structure/phase-group/phase-group.commands';
import { StructureVersionStore } from '@tournament/structure/structure-version.store';

export type CreateDivisionInput = DivisionDetails & {
    name: string;
    tournamentId: number;
};

export type UpdateDivisionInput = DivisionDetails & {
    tournamentId?: number;
};

export type GenerateBracketInput = {
    phaseId?: number;
    phaseName?: string;
    bracketType: string;
    playerPerMatch?: number;
};

@Injectable()
export class DivisionCommands {
    constructor(
        private readonly store: DivisionStore,
        private readonly publisher: UiUpdatePublisher,
        private readonly phaseGroups: PhaseGroupCommands,
        private readonly bracketSystems: BracketCommands,
        private readonly versions: StructureVersionStore,
    ) {}

    async create(input: CreateDivisionInput): Promise<number> {
        const tournament = await this.store.loadTournament(input.tournamentId);
        const division = DivisionAggregate.create(input, tournament);

        await this.store.save(division);
        await this.publisher.emitTournamentUpdate(tournament.id);

        return division.id;
    }

    async update(divisionId: number, input: UpdateDivisionInput): Promise<void> {
        const division = await this.store.loadOrFail(divisionId);
        division.describe(input);
        if (input.tournamentId !== undefined) {
            division.moveTo(await this.store.loadTournament(input.tournamentId));
        }

        await this.store.save(division);
        await this.publisher.emitDivisionUpdate(division.address);
    }

    async delete(divisionId: number): Promise<void> {
        const division = await this.store.load(divisionId);
        if (!division) return;

        const { tournamentId } = division.address;
        await this.store.remove(division);
        await this.publisher.emitTournamentUpdate(tournamentId);
    }

    async updateSeeding(divisionId: number, entrantIds: number[]): Promise<void> {
        const division = await this.store.loadOrFail(divisionId);
        division.seed(entrantIds);

        await this.store.save(division);
        await this.publisher.emitDivisionUpdate(division.address);
    }

    async addParticipants(divisionId: number, participantIds: number[]): Promise<number[]> {
        const division = await this.store.loadOrFail(divisionId);
        const participants = await this.store.loadParticipants(participantIds);
        const entrants = participants.map((participant) => division.admit(participant));

        await this.store.save(division);
        await this.publisher.emitDivisionUpdate(division.address);

        return entrants.map((entrant) => entrant.id);
    }

    async removeParticipants(divisionId: number, participantIds: number[]): Promise<void> {
        const division = await this.store.loadOrFail(divisionId);
        for (const participantId of participantIds) {
            division.withdrawParticipant(participantId);
        }

        await this.store.save(division);
        await this.publisher.emitDivisionUpdate(division.address);
    }

    async removePlayer(divisionId: number, playerId: number): Promise<void> {
        const division = await this.store.loadOrFail(divisionId);
        division.withdrawPlayer(playerId);

        await this.store.save(division);
        await this.publisher.emitDivisionUpdate(division.address);
    }

    async addPhase(divisionId: number, name: string, withDefaultPhaseGroup = true): Promise<number> {
        const division = await this.store.loadOrFail(divisionId);
        const phase = division.addPhase(name);

        await this.store.save(division);
        await this.versions.bump(division.id);
        await this.publisher.emitDivisionUpdate(division.address);
        if (withDefaultPhaseGroup) await this.phaseGroups.create(phase.id, {});

        return phase.id;
    }

    async renamePhase(phaseId: number, name: string): Promise<void> {
        const division = await this.store.loadOrFail(await this.store.locatePhase(phaseId));
        division.renamePhase(phaseId, name);

        await this.store.save(division);
        await this.versions.bump(division.id);
        await this.publisher.emitDivisionUpdate(division.address);
    }

    async removePhase(phaseId: number): Promise<void> {
        const division = await this.store.loadOrFail(await this.store.locatePhase(phaseId));
        division.removePhase(phaseId);

        await this.store.save(division);
        await this.versions.bump(division.id);
        await this.publisher.emitDivisionUpdate(division.address);
    }

    async generateBracket(divisionId: number, input: GenerateBracketInput): Promise<GenerateBracketResultDto> {
        const division = await this.store.loadOrFail(divisionId);
        division.assertCanGenerateBracket();
        this.bracketSystems.assertKnown(input.bracketType);

        const entrants = division.activeEntrants;
        const phase = input.phaseId
            ? division.phase(input.phaseId)
            : division.addPhase(input.phaseName?.trim() || `Bracket ${division.nextPhaseNumber}`);

        if (!input.phaseId) {
            await this.store.save(division);
            await this.publisher.emitDivisionUpdate(division.address);
        }

        await this.versions.bump(division.id);
        const phaseGroupId = await this.phaseGroups.createForBracket(phase.id, input.bracketType);
        await this.bracketSystems.generate({
            phaseGroupId,
            entrants,
            bracketType: input.bracketType,
            playerPerMatch: input.playerPerMatch ?? 2,
            scoringSystem: division.defaultScoringSystem,
        });

        return { phaseId: phase.id, phaseGroupId };
    }
}
