import { useEffect, useState } from "react";
import FormModal from "@/shared/components/ui/FormModal";
import Select from "@/shared/components/ui/Select";
import { TournamentDivisionOption } from "@/features/tournament/model/types";
import { GenerateBracketRequest } from "@/features/division/model/types";
import { formatBracketType } from "@/features/division/model/bracketType";
import { readBracketType, writeBracketType } from "@/shared/lib/bracketPreferences";

type Props = {
  open: boolean;
  divisions: TournamentDivisionOption[];
  currentDivisionId?: number;
  currentPhaseId?: number;
  currentPhaseName?: string;
  bracketTypes: string[];
  onClose: () => void;
  onGenerate: (request: GenerateBracketRequest) => Promise<void>;
};

export default function GenerateBracketModal({
  open,
  divisions,
  currentDivisionId,
  currentPhaseId,
  currentPhaseName,
  bracketTypes,
  onClose,
  onGenerate,
}: Props) {
  const initialDivisionId = currentDivisionId ?? divisions[0]?.id ?? 0;
  const [divisionId, setDivisionId] = useState(initialDivisionId);
  const [phaseName, setPhaseName] = useState("");
  const [bracketType, setBracketType] = useState(() => readBracketType(bracketTypes));
  const [playerPerMatch, setPlayerPerMatch] = useState(2);

  useEffect(() => {
    if (!open) return;
    const nextDivisionId = currentDivisionId ?? divisions[0]?.id ?? 0;
    setDivisionId(nextDivisionId);
    setPhaseName("");
    setBracketType(readBracketType(bracketTypes));
    setPlayerPerMatch(2);
  }, [bracketTypes, currentDivisionId, divisions, open]);

  const validate = () => {
    const errors: string[] = [];
    if (!divisionId) {
      errors.push("Choose the division the bracket belongs to.");
    }
    if (!bracketType) {
      errors.push("Choose a bracket type.");
    }
    if (playerPerMatch < 2) {
      errors.push("A match holds at least two players.");
    }

    return errors;
  };

  const handleGenerate = () =>
    onGenerate({
      divisionId,
      phaseId: currentPhaseId,
      phaseName: currentPhaseId ? undefined : phaseName.trim() || undefined,
      bracketType,
      playerPerMatch,
    });

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Generate bracket"
      confirmText="Generate"
      validate={validate}
      onConfirm={handleGenerate}
      failureFallback="The bracket could not be generated."
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-4">
        {currentPhaseId ? (
          <p className="text-sm text-ui-text-mute">
            The bracket is built in <span className="font-semibold text-ui-text">{currentPhaseName}</span>.
          </p>
        ) : null}
        {!currentDivisionId && !currentPhaseId && (
          <div>
            <label className="block text-sm font-medium mb-1">Division</label>
            <Select
              value={divisionId}
              onChange={setDivisionId}
              options={divisions.map((division) => ({ value: division.id, label: division.name }))}
            />
          </div>
        )}
        {!currentPhaseId && (
          <div>
            <label className="block text-sm font-medium mb-1">Phase name</label>
            <input
              data-autofocus
              type="text"
              value={phaseName}
              onChange={(event) => setPhaseName(event.target.value)}
              placeholder="Bracket"
              className="border rounded px-2 py-2 text-sm w-full"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">Bracket type</label>
          <Select
            value={bracketType}
            onChange={(nextType) => {
              setBracketType(nextType);
              writeBracketType(nextType);
            }}
            options={bracketTypes.map((candidate) => ({
              value: candidate,
              label: formatBracketType(candidate) ?? candidate,
            }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Players per match</label>
          <input
            type="number"
            min={2}
            value={playerPerMatch}
            onChange={(event) => setPlayerPerMatch(Number(event.target.value))}
            className="border rounded px-2 py-2 text-sm w-full"
          />
        </div>
      </div>
    </FormModal>
  );
}
