import PlayersTab from "@/features/division/ui/PlayersTab";
import { useDivisionPageContext } from "@/features/division/model/DivisionPageContext";

export default function DivisionPlayersPage() {
  const { division, entrants, controls } = useDivisionPageContext();
  return <PlayersTab division={division} entrants={entrants} canEdit={controls} />;
}
