export const matchKeys = {
  byId: (matchId: number) => ["matches", "id", matchId] as const,
  byDivision: (divisionId: number) => ["matches", "division", divisionId] as const,
  byPhaseGroup: (phaseGroupId: number) => ["matches", "phase-group", phaseGroupId] as const,
  scoringSystems: () => ["matches", "scoring-systems"] as const,
};
