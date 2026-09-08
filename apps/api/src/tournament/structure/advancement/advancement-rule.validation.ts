import { BadRequestException } from '@nestjs/common';
import { AdvancementCompetitionKind } from '@tournament-hub/persistence';
import { AdvancementRuleInputDto } from './advancement-rule.requests';

export function assertValidAdvancementRules(
  sourceKind: AdvancementCompetitionKind,
  sourceId: number,
  rules: AdvancementRuleInputDto[],
): void {
  const sourcePlacements = new Set<number>();

  for (const rule of rules ?? []) {
    if (rule.targetKind === sourceKind && rule.targetId === sourceId) {
      throw new BadRequestException('An advancement source cannot target itself');
    }
    if (sourcePlacements.has(rule.sourcePlacement)) {
      throw new BadRequestException(`Source placement ${rule.sourcePlacement} is used more than once`);
    }
    sourcePlacements.add(rule.sourcePlacement);
  }
}
