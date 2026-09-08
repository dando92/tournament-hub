import { TournamentRef } from "@/features/tournament/model/types";
import { getBannerGradient } from "@/features/tournament/model/tournamentBanner";

type TournamentCardProps = {
  tournament: TournamentRef;
  onClick: () => void;
};

export default function TournamentCard({ tournament, onClick }: TournamentCardProps) {
  const initial = tournament.name.charAt(0).toUpperCase();
  const gradient = getBannerGradient(tournament.id);

  return (
    <div
      onClick={onClick}
      className="flex flex-col rounded-lg overflow-hidden border border-ui-border shadow-sm hover:shadow-md cursor-pointer transition-shadow bg-ui-surface"
    >
      <div className={`bg-gradient-to-br ${gradient} h-32 flex items-center justify-center`}>
        <span className="text-white text-5xl font-black opacity-30 select-none">{initial}</span>
      </div>

      <div className="p-3 flex flex-col gap-1">
        <h3 className="font-bold text-ui-text text-sm leading-tight line-clamp-2">
          {tournament.name}
        </h3>
      </div>
    </div>
  );
}
