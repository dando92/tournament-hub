import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faFileImport, faLayerGroup, faPlus } from "@fortawesome/free-solid-svg-icons";
import CreateSongModal from "@/features/song/ui/CreateSongModal";
import ImportSongsModal from "@/features/song/ui/ImportSongsModal";
import { useTournamentHeaderSongsManageMenu } from "@/features/song/model/useTournamentHeaderSongsManageMenu";
import { btnPrimary } from "@/styles/buttonStyles";

type Props = {
  tournamentId: number;
};

export default function TournamentHeaderSongsManageMenu({ tournamentId }: Props) {
  const {
    menuOpen,
    addInGroupOpen,
    addInNewGroupOpen,
    loadingSongsMeta,
    songGroups,
    selectedGroupName,
    songImport,
    setAddInGroupOpen,
    setAddInNewGroupOpen,
    openMenu,
    closeMenu,
    openAddInGroup,
    openAddInNewGroup,
    triggerImport,
    handleCreateSong,
  } = useTournamentHeaderSongsManageMenu({ tournamentId });

  return (
    <>
      <CreateSongModal
        open={addInGroupOpen}
        onClose={() => setAddInGroupOpen(false)}
        initialGroup={selectedGroupName}
        onCreate={handleCreateSong}
      />
      <CreateSongModal
        open={addInNewGroupOpen}
        onClose={() => setAddInNewGroupOpen(false)}
        existingGroups={songGroups}
        onCreate={handleCreateSong}
      />
      <ImportSongsModal
        state={songImport.state}
        chartMode={songImport.chartMode}
        onChartModeChange={songImport.setChartMode}
        onConfirm={songImport.confirm}
        onClose={songImport.close}
      />

      <div className="relative">
        <button
          type="button"
          onClick={menuOpen ? closeMenu : openMenu}
          className={`flex items-center gap-2 ${btnPrimary}`}
        >
          Manage
          <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={closeMenu} />
            <div className="absolute right-0 top-full mt-1 z-20 bg-ui-surface rounded shadow-lg border border-ui-border min-w-[180px]">
              <button
                type="button"
                disabled={!selectedGroupName || loadingSongsMeta}
                onClick={openAddInGroup}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-ui-text-soft hover:bg-ui-raised disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FontAwesomeIcon icon={faPlus} className="text-ui-text-mute" />
                Add song
              </button>
              <button
                type="button"
                disabled={loadingSongsMeta}
                onClick={openAddInNewGroup}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-ui-text-soft hover:bg-ui-raised disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FontAwesomeIcon icon={faLayerGroup} className="text-ui-text-mute" />
                New pack
              </button>
              <button
                type="button"
                disabled={loadingSongsMeta}
                onClick={triggerImport}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-ui-text-soft hover:bg-ui-raised disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FontAwesomeIcon icon={faFileImport} className="text-ui-text-mute" />
                Import songs
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
