import { btnDanger, btnPrimary, btnSecondary } from "@/styles/buttonStyles";
import Select from "@/shared/components/ui/Select";
import { useTournamentConfigurationPage } from "@/features/tournament/model/useTournamentConfigurationPage";
import { scoringSystemLabel } from "@/features/match/model/scoringSystem";
import ControlRoomKeySection from "@/features/configuration/ui/ControlRoomKeySection";

export default function ConfigurationPage() {
  const {
    tournamentId,
    controlRoomKey,
    form,
    setForm,
    scoringSystems,
    loading,
    saving,
    changingStatus,
    isClosed,
    isDirty,
    canSave,
    resetForm,
    handleSave,
    handleClose,
    handleReopen,
  } = useTournamentConfigurationPage();

  if (loading) {
    return <p className="text-sm text-ui-text-mute">Loading configuration...</p>;
  }

  return (
    <div className="max-w-3xl">
      <div className="rounded-xl border border-ui-border bg-ui-surface p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-ui-text">Configuration</h2>
          <p className="text-sm text-ui-text-mute">
            Tournament-wide integration and match defaults.
          </p>
        </div>

        {isClosed && (
          <div className="mb-5 rounded-lg border border-state-pending/30 bg-state-pending/10 px-4 py-3 text-sm text-ui-text-soft">
            This tournament is closed and read-only. Reopen it before making
            changes.
          </div>
        )}

        <div className="grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-ui-text">
              Tournament name
            </span>
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              className="rounded border border-ui-border-strong px-3 py-2 text-sm"
              placeholder="Tournament name"
              disabled={isClosed}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-ui-text">
              start.gg API key
            </span>
            <input
              type="password"
              value={form.startggApiKey}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  startggApiKey: event.target.value,
                }))
              }
              className="rounded border border-ui-border-strong px-3 py-2 text-sm"
              placeholder="Paste tournament start.gg API key"
              autoComplete="off"
              disabled={isClosed}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-ui-text">
              Default match scoring system
            </span>
            <Select
              value={form.defaultScoringSystem}
              onChange={(defaultScoringSystem) => setForm((current) => ({ ...current, defaultScoringSystem }))}
              options={scoringSystems.map((system) => ({ value: system, label: scoringSystemLabel(system) }))}
              disabled={isClosed}
            />
          </label>
        </div>

        <ControlRoomKeySection tournamentId={tournamentId} status={controlRoomKey} disabled={isClosed} />

        <div className="mt-6 flex flex-wrap justify-between gap-2">
          {isClosed ? (
            <button
              type="button"
              onClick={handleReopen}
              disabled={changingStatus}
              className={`${btnPrimary} text-sm`}
            >
              {changingStatus ? "Reopening..." : "Reopen tournament"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              disabled={changingStatus || saving}
              className={`${btnDanger} text-sm`}
            >
              {changingStatus ? "Closing..." : "Close tournament"}
            </button>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetForm}
              disabled={!isDirty || saving}
              className={`${btnSecondary} text-sm disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={`${btnPrimary} text-sm disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
