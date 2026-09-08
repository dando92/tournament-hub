import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PlanNode, StructurePlan } from '@tournament-hub/contracts';
import { isScoringSystemType } from '@tournament-hub/scoring';
import {
    AdvancementRule,
    Division,
    Entrant,
    ExternalMapping,
    type ExternalMappingExternalType,
    type ExternalMappingLocalType,
    Match,
    Phase,
    PhaseGroup,
    Round,
    Song,
    Tournament,
} from '@tournament-hub/persistence';
import { DataSource, EntityManager, type EntityTarget, In } from 'typeorm';

export type AppliedPlan = {
    rowIdByLocalId: Record<string, number>;
    divisionIds: number[];
};

type NamedRow = { id: number; name: string };

const ENTITY_OF: Record<string, EntityTarget<NamedRow> | undefined> = {
    division: Division as EntityTarget<NamedRow>,
    phase: Phase as EntityTarget<NamedRow>,
    phaseGroup: PhaseGroup as EntityTarget<NamedRow>,
    match: Match as EntityTarget<NamedRow>,
};

const LOCAL_TYPE_OF: Record<string, ExternalMappingLocalType> = {
    division: 'division',
    phase: 'phase',
    phaseGroup: 'phaseGroup',
    match: 'match',
};

@Injectable()
export class StructurePlanStore {
    constructor(private readonly dataSource: DataSource) {}

    async apply(tournamentId: number, plan: StructurePlan, ordered: PlanNode[]): Promise<AppliedPlan> {
        return this.dataSource.transaction(async (manager) => {
            const tournament = await manager.findOneBy(Tournament, { id: tournamentId });
            if (!tournament) {
                throw new NotFoundException(`Tournament ${tournamentId} not found`);
            }

            const rowIdByLocalId: Record<string, number> = {};
            const divisionIds = new Set<number>();
            const created: PlanNode[] = [];
            const removed: PlanNode[] = [];

            for (const node of ordered) {
                if (node.action === 'skip') {
                    continue;
                }
                if (node.action === 'remove') {
                    rowIdByLocalId[node.localId] = await this.assertLinkable(manager, node, tournamentId);
                    removed.push(node);
                    continue;
                }
                if (node.action === 'link') {
                    rowIdByLocalId[node.localId] = await this.assertLinkable(manager, node, tournamentId);
                    await this.rename(manager, node, rowIdByLocalId[node.localId]);
                    continue;
                }

                rowIdByLocalId[node.localId] = await this.create(manager, node, rowIdByLocalId, tournament);
                created.push(node);
            }

            for (const node of ordered) {
                const divisionId = await this.divisionOf(manager, node, rowIdByLocalId);
                if (divisionId) {
                    divisionIds.add(divisionId);
                }
            }

            await this.removeRows(manager, removed, rowIdByLocalId);
            await this.clearSlots(manager, plan, rowIdByLocalId);
            await this.writeRoutes(manager, plan, rowIdByLocalId);
            await this.writeMatchContents(manager, ordered, rowIdByLocalId);
            await this.writeMappings(manager, created, rowIdByLocalId);

            for (const divisionId of divisionIds) {
                await manager.increment(Division, { id: divisionId }, 'structureVersion', 1);
            }

            return { rowIdByLocalId, divisionIds: [...divisionIds] };
        });
    }

    private async assertLinkable(manager: EntityManager, node: PlanNode, tournamentId: number): Promise<number> {
        const rowId = node.localRowId!;
        const found = await this.tournamentOf(manager, node, rowId);

        if (found === null) {
            throw new NotFoundException(`${node.kind} ${rowId}, which ${node.localId} links to, does not exist`);
        }
        if (found !== tournamentId) {
            throw new BadRequestException(`${node.kind} ${rowId}, which ${node.localId} links to, belongs to another tournament`);
        }

        return rowId;
    }

    private async rename(manager: EntityManager, node: PlanNode, rowId: number): Promise<void> {
        const name = node.name.trim();
        const entity = ENTITY_OF[node.kind];
        if (!entity) {
            return;
        }

        const current = await manager.findOne(entity, { where: { id: rowId }, select: { id: true, name: true } });
        if (!current || current.name === name) {
            return;
        }

        await manager.update(entity, { id: rowId }, { name });
    }

    private async removeRows(manager: EntityManager, removed: PlanNode[], rowIdByLocalId: Record<string, number>): Promise<void> {
        for (const node of removed) {
            const rowId = rowIdByLocalId[node.localId];
            const entity = ENTITY_OF[node.kind];
            if (!entity) {
                continue;
            }

            const kind = node.kind === 'match' ? 'match' : 'phase_group';
            if (node.kind === 'match' || node.kind === 'phaseGroup') {
                await manager.delete(AdvancementRule, { sourceKind: kind, sourceId: rowId });
                await manager.delete(AdvancementRule, { targetKind: kind, targetId: rowId });
            }

            await manager.delete(entity, { id: rowId });
        }
    }

    private async clearSlots(manager: EntityManager, plan: StructurePlan, rowIdByLocalId: Record<string, number>): Promise<void> {
        const kindOf = new Map(plan.nodes.map((node) => [node.localId, node.kind]));

        for (const slot of plan.clearedSlots ?? []) {
            const targetId = rowIdByLocalId[slot.targetLocalId];
            if (!targetId) {
                continue;
            }

            const targetKind = kindOf.get(slot.targetLocalId) === 'match' ? 'match' : 'phase_group';
            await manager.delete(AdvancementRule, { targetKind, targetId, targetSlot: slot.targetSlot });
        }
    }

    private async tournamentOf(manager: EntityManager, node: PlanNode, rowId: number): Promise<number | null> {
        if (node.kind === 'division') {
            const division = await manager.findOne(Division, { where: { id: rowId }, relations: { tournament: true } });

            return division ? (division.tournament?.id ?? null) : null;
        }
        if (node.kind === 'phase') {
            const phase = await manager.findOne(Phase, { where: { id: rowId }, relations: { division: { tournament: true } } });

            return phase ? (phase.division?.tournament?.id ?? null) : null;
        }
        if (node.kind === 'phaseGroup') {
            const phaseGroup = await manager.findOne(PhaseGroup, {
                where: { id: rowId },
                relations: { phase: { division: { tournament: true } } },
            });

            return phaseGroup ? (phaseGroup.phase?.division?.tournament?.id ?? null) : null;
        }
        if (node.kind === 'match') {
            const match = await manager.findOne(Match, {
                where: { id: rowId },
                relations: { phaseGroup: { phase: { division: { tournament: true } } } },
            });

            return match ? (match.phaseGroup?.phase?.division?.tournament?.id ?? null) : null;
        }

        throw new BadRequestException(`A ${node.kind} cannot be written from a structure plan yet.`);
    }

    private async create(manager: EntityManager, node: PlanNode, rowIdByLocalId: Record<string, number>, tournament: Tournament): Promise<number> {
        const parentRowId = node.parentLocalId ? rowIdByLocalId[node.parentLocalId] : undefined;
        const name = node.name.trim();

        if (node.kind === 'division') {
            const division = manager.create(Division, { name, tournament, phases: [], entrants: [] });

            return (await manager.save(Division, division)).id;
        }
        if (node.kind === 'phase') {
            const division = await manager.findOneBy(Division, { id: parentRowId! });
            const phase = manager.create(Phase, { name, division: division!, phaseGroups: [] });

            return (await manager.save(Phase, phase)).id;
        }
        if (node.kind === 'phaseGroup') {
            const phase = await manager.findOneBy(Phase, { id: parentRowId! });
            const phaseGroup = manager.create(PhaseGroup, { name, phase: phase!, bracketType: node.bracketType ?? null });

            return (await manager.save(PhaseGroup, phaseGroup)).id;
        }
        if (node.kind === 'match') {
            const phaseGroup = await manager.findOneBy(PhaseGroup, { id: parentRowId! });
            const asked = node.scoringSystem ?? '';
            const match = manager.create(Match, {
                name,
                notes: node.subtitle ?? '',
                phaseGroup: phaseGroup!,
                scoringSystem: isScoringSystemType(asked) ? asked : tournament.defaultScoringSystem,
            });

            return (await manager.save(Match, match)).id;
        }

        throw new BadRequestException(`A ${node.kind} cannot be written from a structure plan yet.`);
    }

    private async writeMatchContents(manager: EntityManager, nodes: PlanNode[], rowIdByLocalId: Record<string, number>): Promise<void> {
        for (const node of nodes) {
            if (node.kind !== 'match' || node.action === 'skip' || node.action === 'remove') {
                continue;
            }

            const matchId = rowIdByLocalId[node.localId];
            if (!matchId) {
                continue;
            }
            if (node.entrantRowIds) {
                await this.seat(manager, matchId, node);
            }
            if (node.songIds?.length) {
                await this.addRounds(manager, matchId, node.songIds);
            }
        }
    }

    private async seat(manager: EntityManager, matchId: number, node: PlanNode): Promise<void> {
        const match = await manager.findOne(Match, { where: { id: matchId }, relations: { phaseGroup: { phase: { division: true } } } });
        const divisionId = match?.phaseGroup?.phase?.division?.id;
        if (!match || !divisionId) {
            throw new NotFoundException(`Match ${matchId}, which ${node.localId} seats, does not exist`);
        }

        const ids = [...new Set(node.entrantRowIds!)];
        const entrants = ids.length === 0 ? [] : await manager.find(Entrant, { where: { id: In(ids) }, relations: { division: true } });
        const foreign = entrants.filter((entrant) => entrant.division?.id !== divisionId);
        if (entrants.length !== ids.length || foreign.length > 0) {
            throw new BadRequestException(`${node.localId} seats somebody who is not an entrant of this division`);
        }

        match.entrants = entrants;
        await manager.save(Match, match);
    }

    private async addRounds(manager: EntityManager, matchId: number, songIds: number[]): Promise<void> {
        const wanted = [...new Set(songIds)];
        const songs = await manager.find(Song, { where: { id: In(wanted) } });
        if (songs.length !== wanted.length) {
            throw new NotFoundException(`A song a plan puts in match ${matchId} does not exist`);
        }

        const existing = await manager.find(Round, { where: { match: { id: matchId } }, relations: { song: true } });
        const played = new Set(existing.map((round) => round.song?.id).filter((id): id is number => id !== undefined));
        const match = await manager.findOneBy(Match, { id: matchId });

        for (const song of songs.filter((candidate) => !played.has(candidate.id))) {
            await manager.save(Round, manager.create(Round, { match: match!, song, standings: [] }));
        }
    }

    private async divisionOf(manager: EntityManager, node: PlanNode, rowIdByLocalId: Record<string, number>): Promise<number | null> {
        const rowId = rowIdByLocalId[node.localId];
        if (!rowId) {
            return null;
        }
        if (node.kind === 'division') {
            return rowId;
        }
        if (node.kind === 'phase') {
            const phase = await manager.findOne(Phase, { where: { id: rowId }, relations: { division: true } });

            return phase?.division?.id ?? null;
        }
        if (node.kind === 'phaseGroup') {
            const phaseGroup = await manager.findOne(PhaseGroup, { where: { id: rowId }, relations: { phase: { division: true } } });

            return phaseGroup?.phase?.division?.id ?? null;
        }
        if (node.kind === 'match') {
            const match = await manager.findOne(Match, {
                where: { id: rowId },
                relations: { phaseGroup: { phase: { division: true } } },
            });

            return match?.phaseGroup?.phase?.division?.id ?? null;
        }

        return null;
    }

    private async writeRoutes(manager: EntityManager, plan: StructurePlan, rowIdByLocalId: Record<string, number>): Promise<void> {
        const kindOf = new Map(plan.nodes.map((node) => [node.localId, node.kind]));
        const rules: AdvancementRule[] = [];

        for (const route of plan.routes) {
            const sourceId = rowIdByLocalId[route.sourceLocalId];
            const targetId = rowIdByLocalId[route.targetLocalId];
            if (!sourceId || !targetId) {
                continue;
            }

            const targetKind = kindOf.get(route.targetLocalId) === 'match' ? 'match' : 'phase_group';
            await manager.delete(AdvancementRule, { targetKind, targetId, targetSlot: route.targetSlot });

            rules.push(
                manager.create(AdvancementRule, {
                    sourceKind: kindOf.get(route.sourceLocalId) === 'match' ? 'match' : 'phase_group',
                    sourceId,
                    sourcePlacement: route.sourcePlacement,
                    targetKind,
                    targetId,
                    targetSlot: route.targetSlot,
                }),
            );
        }

        if (rules.length > 0) {
            await manager.save(AdvancementRule, rules);
        }
    }

    private async writeMappings(manager: EntityManager, created: PlanNode[], rowIdByLocalId: Record<string, number>): Promise<void> {
        const mappings = created
            .filter((node) => node.external && LOCAL_TYPE_OF[node.kind])
            .map((node) =>
                manager.create(ExternalMapping, {
                    provider: node.external!.provider,
                    localType: LOCAL_TYPE_OF[node.kind],
                    localId: String(rowIdByLocalId[node.localId]),
                    externalType: node.external!.externalType as ExternalMappingExternalType,
                    externalId: node.external!.externalId,
                }),
            );

        if (mappings.length === 0) {
            return;
        }

        const existing = await manager.find(ExternalMapping, {
            where: { externalId: In(mappings.map((mapping) => mapping.externalId)) },
        });
        const known = new Set(existing.map((mapping) => this.identityOf(mapping)));

        const fresh = mappings.filter((mapping) => !known.has(this.identityOf(mapping)));
        if (fresh.length > 0) {
            await manager.save(ExternalMapping, fresh);
        }
    }

    private identityOf(mapping: ExternalMapping): string {
        return [mapping.provider, mapping.localType, mapping.localId, mapping.externalType, mapping.externalId].join('|');
    }
}
