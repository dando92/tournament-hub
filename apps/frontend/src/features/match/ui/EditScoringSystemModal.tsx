import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import FormModal from '@/shared/components/ui/FormModal';
import Select from '@/shared/components/ui/Select';
import { listScoringSystems } from '@/features/match/api/match.api';
import { matchKeys } from '@/features/match/api/match.keys';
import { scoringSystemLabel } from '@/features/match/model/scoringSystem';
import type { Match } from '@/features/match/model/types';

type Props = {
    open: boolean;
    match: Match;
    onClose: () => void;
    onSave: (matchId: number, scoringSystem: string) => Promise<void>;
};

export default function EditScoringSystemModal({ open, match, onClose, onSave }: Props) {
    const [scoringSystem, setScoringSystem] = useState<string>(match.scoringSystem);
    const systemsQuery = useQuery({
        queryKey: matchKeys.scoringSystems(),
        queryFn: listScoringSystems,
        enabled: open,
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        setScoringSystem(match.scoringSystem);
    }, [match.scoringSystem, open]);

    const hasPlayedScores = match.rounds.some((round) => round.song !== null && round.standings.length > 0);

    const unchanged = scoringSystem === match.scoringSystem;

    return (
        <FormModal
            open={open}
            title={`Edit scoring for ${match.name}`}
            confirmText="Save"
            validate={() => (scoringSystem ? [] : ['Choose a scoring system.'])}
            onConfirm={() => (unchanged ? undefined : onSave(match.id, scoringSystem))}
            onClose={onClose}
            failureFallback="The scoring system could not be saved."
        >
            <label className="flex flex-col gap-2 font-medium text-ui-text-soft">
                Scoring system
                <Select
                    value={scoringSystem}
                    onChange={setScoringSystem}
                    options={(systemsQuery.data ?? [match.scoringSystem]).map((system) => ({ value: system, label: scoringSystemLabel(system) }))}
                    disabled={systemsQuery.isLoading}
                />
                {systemsQuery.isError && <span className="text-xs font-normal text-state-failed">Unable to load scoring systems.</span>}
            </label>
            {hasPlayedScores && <p className="text-xs text-state-pending">Saving will recalculate the points of every completed song round.</p>}
        </FormModal>
    );
}
