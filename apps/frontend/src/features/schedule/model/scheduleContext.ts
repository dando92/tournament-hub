import type { TournamentDivisionOption } from "@/features/tournament/model/types";


export function divisionNameOf(divisions: TournamentDivisionOption[], phaseGroupId: number): string | null {
    return divisions.find((division) => division.phases.some((phase) => phase.phaseGroups?.some((pool) => pool.id === phaseGroupId)))?.name ?? null;
}

export function divisionIdOf(divisions: TournamentDivisionOption[], phaseGroupId: number): number | null {
    return divisions.find((division) => division.phases.some((phase) => phase.phaseGroups?.some((pool) => pool.id === phaseGroupId)))?.id ?? null;
}

export function phaseAddressLabel(divisions: TournamentDivisionOption[], phaseGroupId: number): string | null {
    for (const division of divisions) {
        for (const phase of division.phases) {
            const pool = phase.phaseGroups?.find((candidate) => candidate.id === phaseGroupId);
            if (pool) {
                return `${phase.name} · ${pool.name}`;
            }
        }
    }

    return null;
}

export function competitionAddressLabel(divisions: TournamentDivisionOption[], phaseGroupId: number): string {
    for (const division of divisions) {
        for (const phase of division.phases) {
            const pool = phase.phaseGroups?.find((candidate) => candidate.id === phaseGroupId);
            if (pool) {
                return `${division.name} · ${phase.name} · ${pool.name}`;
            }
        }
    }

    return "Tournament match";
}
