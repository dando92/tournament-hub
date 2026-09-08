import type { Dispatch, SetStateAction } from "react";
import { ParticipantsManageModal } from "@/features/tournament/model/TournamentPageContext";
import TournamentBreadcrumb from "@/features/tournament/ui/header/TournamentBreadcrumb";
import TournamentHeaderParticipantsManageMenu from "@/features/tournament/ui/header/TournamentHeaderParticipantsManageMenu";
import TournamentHeaderSongsManageMenu from "@/features/tournament/ui/header/TournamentHeaderSongsManageMenu";


type TournamentPageHeaderProps = {
  tournamentId: number;
  tournamentName: string;
  controls: boolean;
  isSongsPage: boolean;
  isParticipantsPage: boolean;
  onOpenParticipantsManageModal: Dispatch<SetStateAction<ParticipantsManageModal>>;
};

export default function TournamentPageHeader({
  tournamentId,
  tournamentName,
  controls,
  isSongsPage,
  isParticipantsPage,
  onOpenParticipantsManageModal,
}: TournamentPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <TournamentBreadcrumb tournamentName={tournamentName} />

      {controls && (
        <div className="ml-auto flex items-center gap-2">
          {isSongsPage && (
            <TournamentHeaderSongsManageMenu tournamentId={tournamentId} />
          )}
          {isParticipantsPage && <TournamentHeaderParticipantsManageMenu onOpen={onOpenParticipantsManageModal} />}
        </div>
      )}
    </div>
  );
}
