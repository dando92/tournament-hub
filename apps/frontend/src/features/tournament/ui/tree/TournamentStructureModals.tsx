import CreateDivisionModal from "@/features/division/ui/CreateDivisionModal";
import CreatePhaseModal from "@/features/division/ui/CreatePhaseModal";
import CreatePoolModal from "@/features/division/ui/CreatePoolModal";
import GenerateBracketModal from "@/features/division/ui/GenerateBracketModal";
import StartggImportModal from "@/features/tournament/ui/StartggImportModal";
import RenameModal from "@/shared/components/ui/RenameModal";
import { useTournamentTree } from "@/features/tournament/model/TournamentTreeContext";
import { useTournamentStructureDialogs } from "@/features/tournament/model/useTournamentStructureDialogs";
import { nextPoolName } from "@/features/division/model/poolVisibility";
import { divisionPath } from "@/features/tournament/model/treeSelection";
import { treeNodeKey } from "@/shared/lib/treeState";
import { useNavigate } from "react-router-dom";

export default function TournamentStructureModals() {
  const navigate = useNavigate();
  const tree = useTournamentTree();
  const { dialog, closeDialog, tournamentId, tournamentName, divisions } = tree;
  const { bracketTypes, dialogPhase, handleGenerateBracket } = useTournamentStructureDialogs();

  return (
    <>
      <CreateDivisionModal
        open={dialog.kind === "createDivision"}
        onClose={closeDialog}
        onCreate={(name) => tree.addDivision(name)}
      />

      <CreatePhaseModal
        open={dialog.kind === "createPhase"}
        onClose={closeDialog}
        divisions={divisions.map((division) => ({ id: division.id, name: division.name }))}
        divisionId={dialog.kind === "createPhase" ? dialog.divisionId : undefined}
        onCreate={(name, divisionId) => tree.addPhase(divisionId, name)}
      />

      <CreatePoolModal
        open={dialog.kind === "createPool"}
        phaseName={dialogPhase?.name ?? ""}
        suggestedName={nextPoolName(dialogPhase)}
        onClose={closeDialog}
        onCreate={(name) => (dialog.kind === "createPool" ? tree.createPool(dialog.phaseId, name) : Promise.resolve())}
      />

      <GenerateBracketModal
        open={dialog.kind === "generateBracket"}
        onClose={closeDialog}
        divisions={divisions}
        currentDivisionId={dialog.kind === "generateBracket" ? dialog.divisionId : undefined}
        currentPhaseId={dialog.kind === "generateBracket" ? dialog.phaseId : undefined}
        currentPhaseName={dialogPhase?.name}
        bracketTypes={bracketTypes}
        onGenerate={handleGenerateBracket}
      />

      <StartggImportModal
        open={dialog.kind === "startggImport"}
        onClose={closeDialog}
        fixedTournamentId={tournamentId ?? undefined}
        fixedTournamentName={tournamentName}
        onImported={async ({ tournamentId: importedTournamentId, divisionId }) => {
          await tree.refreshTree();
          tree.expandNode(treeNodeKey("division", divisionId));
          navigate(divisionPath(importedTournamentId, divisionId));
        }}
      />

      <RenameModal
        open={dialog.kind === "rename"}
        noun={dialog.kind === "rename" ? dialog.noun : ""}
        currentName={dialog.kind === "rename" ? dialog.currentName : ""}
        onClose={closeDialog}
        onRename={(name) => (dialog.kind === "rename" ? dialog.apply(name) : Promise.resolve())}
      />
    </>
  );
}
