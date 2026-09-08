import FormModal from "@/shared/components/ui/FormModal";
import Select from "@/shared/components/ui/Select";
import { CreateMatchRequest } from "@/features/match/model/types";
import CreateMatchSongFields from "@/features/match/ui/CreateMatchSongFields";
import { useCreateMatchModal } from "@/features/match/model/useCreateMatchModal";
import CascadingPathPicker from "@/shared/components/ui/CascadingPathPicker";
import MultiSelect from "@/shared/components/ui/MultiSelect";
import { scoringSystemLabel } from "@/features/match/model/scoringSystem";

type CreateMatchModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (request: CreateMatchRequest) => Promise<void>;
  divisionId?: number;
  phaseId?: number;
  phaseGroupId?: number;
  tournamentId?: number;
};

export default function CreateMatchModal(props: CreateMatchModalProps) {
  const state = useCreateMatchModal(props);

  return (
    <FormModal
      title="Create Match"
      confirmText="Create match"
      open={props.open}
      onClose={props.onClose}
      validate={state.validate}
      onConfirm={state.handleSubmit}
      failureFallback="The match could not be created."
    >
      <div className="flex flex-col w-full gap-3">
        <div className="w-full">
          <h3>Destination</h3>
          <CascadingPathPicker
            levels={state.pathLevels}
            value={state.pathValue}
            onValueChange={state.setPathValue}
            ariaLabel="Match destination"
          />
        </div>

        <div className="w-full">
          <h3>Name</h3>
          <input
            data-autofocus
            className="w-full border border-ui-border-strong px-2 py-2 rounded-lg"
            type="text"
            value={state.name}
            onChange={(event) => state.setName(event.target.value)}
            placeholder="Type match name"
          />
        </div>
        <div className="w-full">
          <h3>Subtitle</h3>
          <input
            className="w-full border border-ui-border-strong px-2 py-2 rounded-lg"
            type="text"
            value={state.subtitle}
            onChange={(event) => state.setSubtitle(event.target.value)}
            placeholder="Type subtitle"
          />
        </div>
        <div>
          <h3>Scoring system</h3>
          <Select
            options={state.scoringSystems.map((system) => ({ value: system, label: scoringSystemLabel(system) }))}
            placeholder="Select scoring system…"
            value={state.scoringSystem}
            onChange={state.setScoringSystem}
          />
        </div>
        <div className="w-full">
          <h3>Entrants</h3>
          <MultiSelect
            options={state.entrants.map((entrant) => ({ value: entrant.id, label: entrant.name }))}
            onChange={(selected) =>
              state.setSelectedEntrants(
                selected
                  .map((option) => state.entrants.find((entrant) => entrant.id === option.value))
                  .filter((entrant): entrant is (typeof state.entrants)[number] => Boolean(entrant)),
              )
            }
            value={state.selectedEntrants.map((entrant) => ({ value: entrant.id, label: entrant.name }))}
          />
        </div>

        <CreateMatchSongFields
          songAddType={state.songAddType}
          songs={state.songs}
          songGroups={state.songGroups}
          selectedSongs={state.selectedSongs}
          roll={state.roll}
          onSongAddTypeChange={state.setSongAddType}
          onSelectedSongsChange={state.setSelectedSongs}
        />
      </div>
    </FormModal>
  );
}
