import SongsList from "@/features/song/ui/SongsList";
import { useTournamentPageContext } from "@/features/tournament/model/TournamentPageContext";

export default function SongsPage() {
  const { controls, tournamentId } = useTournamentPageContext();
  return <SongsList canEdit={controls} tournamentId={tournamentId} />;
}
