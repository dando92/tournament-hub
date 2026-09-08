export const divisionKeys = {
  summary: (divisionId: number) => ["division-summary", divisionId] as const,
  entrants: (divisionId: number) => ["division-entrants", divisionId] as const,
};
