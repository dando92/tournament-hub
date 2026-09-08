import type { Division } from "@/features/division/model/types";
import type { Match, MatchNeighbour } from "@/features/match/model/types";
import MatchCard from "@/features/match/ui/MatchCard";

type Props = {
    division: Division;
    match: Match;
    allMatches: MatchNeighbour[];
};

const noop = () => {};
const noopAsync = async () => {};

export default function ReadOnlyMatchCard({ division, match, allMatches }: Props) {
    return (
        <MatchCard
            division={division}
            divisionEntrants={[]}
            match={match}
            allMatches={allMatches}
            controls={false}
            allowMobileTableScroll={false}
            onMatchUpdated={noop}
            onDeleteMatch={noop}
            onAddPlayersToMatch={noopAsync}
            onAddRounds={noopAsync}
            onReplaceRoundSong={noopAsync}
            onDeleteRound={noopAsync}
            onAddHandScoredRound={noop}
            onChangePoints={noop}
            onAddStandingToMatch={noopAsync}
            onEditMatchNotes={noopAsync}
            onUpdateMatchScoringSystem={noopAsync}
            onEditStanding={noopAsync}
            onDeleteStanding={noopAsync}
            onCreateTiebreak={noopAsync}
            onDeleteTiebreak={noop}
            onSaveTiebreakScore={noopAsync}
            onSaveTiebreakPoints={noop}
            onClearTiebreakStanding={noopAsync}
        />
    );
}
