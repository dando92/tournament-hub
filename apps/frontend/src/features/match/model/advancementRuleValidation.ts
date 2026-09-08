import type { AdvancementCompetitionKind, AdvancementRuleInput } from "@/features/match/model/types";

export function isAdvancementSourceTarget(
    sourceKind: AdvancementCompetitionKind,
    sourceId: number,
    targetKind: AdvancementCompetitionKind,
    targetId: number,
): boolean {
    return sourceKind === targetKind && sourceId === targetId;
}

export function validateAdvancementRules(
    rules: AdvancementRuleInput[],
    sourceKind: AdvancementCompetitionKind,
    sourceId: number,
): string[] {
    const errors: string[] = [];
    const sourcePlacements = new Set<number>();
    const targetSlots = new Set<string>();

    for (const [index, rule] of rules.entries()) {
        const label = `Rule ${index + 1}`;
        if (rule.sourcePlacement <= 0 || !Number.isFinite(rule.sourcePlacement)) {
            errors.push(`${label}: finishing place must be greater than 0.`);
        } else if (sourcePlacements.has(rule.sourcePlacement)) {
            errors.push(`${label}: finishing place is already used.`);
        }
        sourcePlacements.add(rule.sourcePlacement);

        if (rule.targetId <= 0 || !Number.isFinite(rule.targetId)) {
            errors.push(`${label}: select a destination.`);
        }
        if (rule.targetSlot <= 0 || !Number.isFinite(rule.targetSlot)) {
            errors.push(`${label}: target slot must be greater than 0.`);
        }
        if (isAdvancementSourceTarget(sourceKind, sourceId, rule.targetKind, rule.targetId)) {
            errors.push(`${label}: source cannot target itself.`);
        }

        const targetKey = `${rule.targetKind}:${rule.targetId}:${rule.targetSlot}`;
        if (targetSlots.has(targetKey)) {
            errors.push(`${label}: target slot is already used.`);
        }
        targetSlots.add(targetKey);
    }

    return errors;
}
