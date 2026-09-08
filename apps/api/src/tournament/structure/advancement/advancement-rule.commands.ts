import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdvancementCompetitionKind } from '@tournament-hub/persistence';
import { AdvancementRuleInputDto } from './advancement-rule.requests';
import { MatchQueries } from '@match/match.queries';
import { MatchStore } from '@match/match.store';
import { UiUpdatePublisher } from '@tournament/shared/ui-update.publisher';
import { PhaseGroupQueries } from '@tournament/structure/phase-group/phase-group.queries';
import { AdvancementRuleStore } from './advancement-rule.store';
import { ScheduleRunner } from '@tournament/competition/schedule/schedule.runner';
import { assertValidAdvancementRules } from './advancement-rule.validation';

@Injectable()
export class AdvancementRuleCommands {
  constructor(
    private readonly advancementRules: AdvancementRuleStore,
    private readonly matchQueries: MatchQueries,
    private readonly matches: MatchStore,
    private readonly phaseGroupQueries: PhaseGroupQueries,
    private readonly publisher: UiUpdatePublisher,
    private readonly controlRoom: ScheduleRunner,
  ) {}

  async updateForSource(
    sourceKind: AdvancementCompetitionKind,
    sourceId: number,
    rules: AdvancementRuleInputDto[],
  ): Promise<void> {
    await this.assertSourceExists(sourceKind, sourceId);
    assertValidAdvancementRules(sourceKind, sourceId, rules);
    const previous = await this.advancementRules.findBySource(sourceKind, sourceId);
    await this.advancementRules.deleteBySource(sourceKind, sourceId);
    await this.advancementRules.createAll(
      (rules ?? []).map((rule) => ({
        sourceKind,
        sourceId,
        sourcePlacement: rule.sourcePlacement,
        targetKind: rule.targetKind,
        targetId: rule.targetId,
        targetSlot: rule.targetSlot,
      })),
    );

    if (sourceKind === 'match') {
      await this.matches.refreshState(sourceId);
    }

    const affectedMatchIds = [...previous, ...(rules ?? [])]
      .filter((rule) => rule.targetKind === 'match')
      .map((rule) => rule.targetId);
    await this.controlRoom.recalculateForMatches([...new Set(affectedMatchIds)]);

    await this.announce(sourceKind, sourceId);
  }

  private async assertSourceExists(sourceKind: AdvancementCompetitionKind, sourceId: number): Promise<void> {
    if (sourceKind === 'match') {
      if (!(await this.matchQueries.exists(sourceId))) throw new NotFoundException(`Match with ID ${sourceId} not found`);
      return;
    }

    if (sourceKind === 'phase_group') {
      if (!(await this.phaseGroupQueries.exists(sourceId))) throw new NotFoundException(`PhaseGroup with ID ${sourceId} not found`);
      return;
    }

    throw new BadRequestException(`Unsupported advancement rule source kind "${sourceKind}"`);
  }

  private async announce(sourceKind: AdvancementCompetitionKind, sourceId: number): Promise<void> {
    const address = sourceKind === 'match'
      ? await this.phaseGroupQueries.addressOfMatchPool(sourceId)
      : await this.phaseGroupQueries.address(sourceId);
    if (!address) return;

    await this.publisher.emitPhaseGroupUpdate(address);
  }
}
