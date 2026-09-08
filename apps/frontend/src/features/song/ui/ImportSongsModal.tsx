import { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch, faFolderOpen, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import BaseModal from "@/shared/components/ui/BaseModal";
import { buildImportRows } from "@/features/song/model/songImport/stepmaniaParser";
import type { ChartMode } from "@/features/song/model/songImport/types";
import type { SongImportState } from "@/features/song/model/useSongImport";
import { btnPrimary, btnSecondary } from "@/styles/buttonStyles";

type Props = {
  state: SongImportState;
  chartMode: ChartMode;
  onChartModeChange: (mode: ChartMode) => void;
  onConfirm: () => void;
  onClose: () => void;
};

const CHART_MODES: Array<{ value: ChartMode; label: string; description: string }> = [
  { value: "all", label: "All difficulties", description: "Every dance-single chart of each song." },
  { value: "highest", label: "Highest difficulty only", description: "Only the chart with the highest level." },
];

export default function ImportSongsModal({ state, chartMode, onChartModeChange, onConfirm, onClose }: Props) {
  const songs = state.status === "ready" ? state.scan.songs : null;
  const chartCount = useMemo(() => (songs ? buildImportRows(songs, chartMode).rows.length : 0), [songs, chartMode]);

  const busy = state.status === "scanning" || state.status === "importing";

  return (
    <BaseModal
      open={state.status !== "idle"}
      onClose={busy ? () => undefined : onClose}
      title="Import songs"
      maxWidth="max-w-lg"
      footer={
        state.status === "ready" ? (
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className={`text-sm ${btnSecondary}`}>
              Cancel
            </button>
            <button type="button" onClick={onConfirm} disabled={chartCount === 0} className={`text-sm ${btnPrimary}`}>
              Import {chartCount} chart{chartCount === 1 ? "" : "s"}
            </button>
          </div>
        ) : busy ? undefined : (
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className={`text-sm ${btnSecondary}`}>
              Close
            </button>
          </div>
        )
      }
    >
      {state.status === "scanning" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <FontAwesomeIcon icon={faCircleNotch} spin className="text-2xl text-ui-text-mute" />
          <p className="text-sm text-ui-text">
            Reading <span className="font-semibold">{state.folder}</span>…
          </p>
          <p className="text-xs text-ui-text-mute">
            {state.progress.packs} pack{state.progress.packs === 1 ? "" : "s"}, {state.progress.songs} song
            {state.progress.songs === 1 ? "" : "s"}, {state.progress.charts} chart
            {state.progress.charts === 1 ? "" : "s"} so far
          </p>
        </div>
      )}

      {state.status === "empty" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <FontAwesomeIcon icon={faTriangleExclamation} className="text-2xl text-state-failed" />
          <p className="text-sm text-ui-text">
            No valid StepMania simfiles (.ssc or .sm) were found in{" "}
            <span className="font-semibold">{state.folder}</span>.
          </p>
          <p className="text-xs text-ui-text-mute">
            Select either your ITGmania <span className="font-semibold">Songs</span> folder or a single pack folder.
          </p>
        </div>
      )}

      {state.status === "failed" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <FontAwesomeIcon icon={faTriangleExclamation} className="text-2xl text-state-failed" />
          <p className="text-sm text-ui-text">{state.message}</p>
        </div>
      )}

      {state.status === "importing" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <FontAwesomeIcon icon={faCircleNotch} spin className="text-2xl text-ui-text-mute" />
          <p className="text-sm text-ui-text">
            Adding {state.total} chart{state.total === 1 ? "" : "s"} from{" "}
            <span className="font-semibold">{state.folder}</span> to the pool…
          </p>
        </div>
      )}

      {state.status === "ready" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded border border-ui-border bg-ui-raised px-3 py-2.5">
            <FontAwesomeIcon icon={faFolderOpen} className="mt-0.5 text-ui-text-mute" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ui-text">{state.scan.rootName}</p>
              <p className="text-xs text-ui-text-mute">
                {state.scan.packs.length} pack{state.scan.packs.length === 1 ? "" : "s"}, {state.scan.songs.length} song
                {state.scan.songs.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <p className="text-sm text-ui-text-soft">Is this the folder you want to import songs from?</p>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-ui-text-soft">Charts to import</legend>
            {CHART_MODES.map((mode) => (
              <label
                key={mode.value}
                className={`flex cursor-pointer items-start gap-2 rounded border px-3 py-2 transition-colors ${
                  chartMode === mode.value
                    ? "border-ui-border-strong bg-ui-selected"
                    : "border-ui-border hover:bg-ui-raised"
                }`}
              >
                <input
                  type="radio"
                  name="chart-mode"
                  value={mode.value}
                  checked={chartMode === mode.value}
                  onChange={() => onChartModeChange(mode.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm text-ui-text">{mode.label}</span>
                  <span className="block text-xs text-ui-text-mute">{mode.description}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <p className="text-xs text-ui-text-mute">
            {chartCount} dance-single chart{chartCount === 1 ? "" : "s"} will be imported.
            {state.scan.warnings.length > 0 &&
              ` ${state.scan.warnings.length} song folder${state.scan.warnings.length === 1 ? "" : "s"} could not be read and will be skipped.`}
          </p>
        </div>
      )}
    </BaseModal>
  );
}
