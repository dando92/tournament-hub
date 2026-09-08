import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GenerateBracketRequest } from "@/features/division/model/types";
import { generateBracket, listBracketTypes } from "@/features/division/api/division.api";
import { useTournamentTree } from "@/features/tournament/model/TournamentTreeContext";
import { treeNodeKey } from "@/shared/lib/treeState";
import { phasePath } from "@/features/tournament/model/treeSelection";

export function useTournamentStructureDialogs() {
  const navigate = useNavigate();
  const tree = useTournamentTree();
  const { dialog, tournamentId } = tree;
  const [bracketTypes, setBracketTypes] = useState<string[]>([]);

  const dialogPhaseId = dialog.kind === "createPool" ? dialog.phaseId : dialog.kind === "generateBracket" ? dialog.phaseId : undefined;
  const dialogPhase = useMemo(
    () =>
      dialogPhaseId === undefined
        ? undefined
        : tree.divisions.flatMap((division) => division.phases).find((phase) => phase.id === dialogPhaseId),
    [tree.divisions, dialogPhaseId],
  );

  useEffect(() => {
    if (dialog.kind !== "generateBracket" || bracketTypes.length > 0) return;
    listBracketTypes()
      .then(setBracketTypes)
      .catch(() => setBracketTypes([]));
  }, [dialog.kind, bracketTypes.length]);

  async function handleGenerateBracket(request: GenerateBracketRequest) {
    const generated = await generateBracket(request);
    await tree.refreshTree();
    tree.expandNode(treeNodeKey("division", request.divisionId));
    tree.expandNode(treeNodeKey("phase", generated.phaseId));
    navigate(phasePath(tournamentId ?? 0, request.divisionId, generated.phaseId));
  }

  return { bracketTypes, dialogPhase, handleGenerateBracket };
}
