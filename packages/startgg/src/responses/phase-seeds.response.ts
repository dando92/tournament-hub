import { StartggSeedNode } from '../startgg.types';
import { PageInfo } from './page-info.response';

export class PhaseSeedsResponse {
    phase?: {
        seeds?: {
            pageInfo?: PageInfo | null;
            nodes?: Array<{
                id: string | number;
                seedNum?: number | null;
                groupSeedNum?: number | null;
                phaseGroup?: {
                    id?: string | number | null;
                } | null;
                progressionSource?: {
                    originPlacement?: number | null;
                    originPhaseGroup?: {
                        id?: string | number | null;
                    } | null;
                } | null;
                entrant?: {
                    id: string | number;
                } | null;
            }> | null;
        } | null;
    } | null;

    static mapPage(data: PhaseSeedsResponse): { pageInfo: PageInfo; nodes: StartggSeedNode[] } {
        const seeds = data.phase?.seeds;
        return {
            pageInfo: seeds?.pageInfo ?? {},
            nodes: (seeds?.nodes ?? [])
                .filter((seed) =>
                    seed?.id &&
                    seed?.seedNum !== null &&
                    seed?.seedNum !== undefined,
                )
                .map((seed) => ({
                    id: String(seed.id),
                    seedNum: Number(seed.seedNum),
                    entrantId: seed.entrant?.id ? String(seed.entrant.id) : null,
                    groupSeedNum: seed.groupSeedNum ?? null,
                    phaseGroupId: seed.phaseGroup?.id ? String(seed.phaseGroup.id) : null,
                    progressionSource: seed.progressionSource ? {
                        originPhaseGroupId: seed.progressionSource.originPhaseGroup?.id
                            ? String(seed.progressionSource.originPhaseGroup.id)
                            : null,
                        originPlacement: seed.progressionSource.originPlacement ?? null,
                    } : null,
                })),
        };
    }
}
