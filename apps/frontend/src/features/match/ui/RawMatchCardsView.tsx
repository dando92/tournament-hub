import { ReactNode } from "react";
import { Match } from "@/features/match/model/types";
import CreateCard from "@/shared/components/ui/CreateCard";

type RawMatchCardsViewProps = {
  matches: Match[];
  renderMatchCard: (match: Match) => ReactNode;
  onCreateMatch?: () => void;
};

export default function RawMatchCardsView({ matches, renderMatchCard, onCreateMatch }: RawMatchCardsViewProps) {
  return (
    <div>
      {[...matches].sort((a, b) => a.id - b.id).map((match) => renderMatchCard(match))}
      {onCreateMatch && <CreateCard label="Create match" onClick={onCreateMatch} />}
    </div>
  );
}
