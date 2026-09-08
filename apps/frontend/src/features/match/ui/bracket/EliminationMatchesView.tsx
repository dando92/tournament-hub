import { ReactNode, useEffect, useState } from "react";
import { PhaseGroup } from "@/features/division/model/types";
import MatchBracketTree from "@/features/match/ui/bracket/MatchBracketTree";
import { Match } from "@/features/match/model/types";

type EliminationMatchesViewProps = {
  matches: Match[];
  phaseGroups: PhaseGroup[];
  renderMatchCard: (match: Match) => ReactNode;
};

export default function EliminationMatchesView({
  matches,
  phaseGroups,
  renderMatchCard,
}: EliminationMatchesViewProps) {
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const selectedMatch = matches.find((match) => match.id === selectedMatchId) ?? null;

  useEffect(() => {
    if (!selectedMatchId) return;
    if (!matches.some((match) => match.id === selectedMatchId)) {
      setSelectedMatchId(null);
    }
  }, [matches, selectedMatchId]);

  return (
    <div className="space-y-4">
      <MatchBracketTree
        matches={[...matches].sort((a, b) => a.id - b.id)}
        phaseGroups={phaseGroups}
        selectedMatchId={selectedMatchId}
        onSelectMatch={(match) => {
          if (selectedMatchId === match.id) {
            setSelectedMatchId(null);
            return;
          }
          setSelectedMatchId(match.id);
        }}
        onClearSelection={() => setSelectedMatchId(null)}
      />
      {selectedMatch && renderMatchCard(selectedMatch)}
    </div>
  );
}
