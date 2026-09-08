import { BadRequestException } from '@nestjs/common';
import { assertValidAdvancementRules } from '@tournament/structure/advancement/advancement-rule.validation';

describe('advancement rule validation', () => {
  it.each([
    ['match', 10],
    ['phase_group', 20],
  ] as const)('rejects a %s source targeting itself', (sourceKind, sourceId) => {
    expect(() => assertValidAdvancementRules(sourceKind, sourceId, [{
      sourcePlacement: 1,
      targetKind: sourceKind,
      targetId: sourceId,
      targetSlot: 1,
    }])).toThrow(BadRequestException);
  });

  it('rejects duplicate source placements', () => {
    expect(() => assertValidAdvancementRules('match', 10, [
      { sourcePlacement: 1, targetKind: 'match', targetId: 20, targetSlot: 1 },
      { sourcePlacement: 1, targetKind: 'match', targetId: 30, targetSlot: 1 },
    ])).toThrow('Source placement 1 is used more than once');
  });

  it('accepts distinct source placements', () => {
    expect(() => assertValidAdvancementRules('match', 10, [
      { sourcePlacement: 1, targetKind: 'match', targetId: 20, targetSlot: 1 },
      { sourcePlacement: 2, targetKind: 'phase_group', targetId: 30, targetSlot: 1 },
    ])).not.toThrow();
  });
});
