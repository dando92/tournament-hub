export function formatBracketType(bracketType: string | null | undefined): string | null {
  switch (bracketType) {
    case "SingleElimination":
    case "SINGLE_ELIMINATION":
      return "Single elimination";
    case "DoubleElimination":
    case "DOUBLE_ELIMINATION":
      return "Double elimination";
    case "Manual":
      return "First phase only";
    case "RoundRobin":
    case "ROUND_ROBIN":
      return "Round robin";
    case "Swiss":
    case "SWISS":
      return "Swiss";
    case "CustomSchedule":
    case "CUSTOM_SCHEDULE":
      return "Custom schedule";
    default:
      return bracketType ?? null;
  }
}

export function isEliminationBracket(bracketType: string | null | undefined): boolean {
  return bracketType === "SingleElimination"
    || bracketType === "SINGLE_ELIMINATION"
    || bracketType === "DoubleElimination"
    || bracketType === "DOUBLE_ELIMINATION";
}

export function isRoundRobinBracket(bracketType: string | null | undefined): boolean {
  return bracketType === "RoundRobin" || bracketType === "ROUND_ROBIN";
}
