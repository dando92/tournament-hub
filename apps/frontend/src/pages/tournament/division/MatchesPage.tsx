import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useDivisionMatchesPage } from "@/features/division/model/useDivisionMatchesPage";
import PoolAdvancementEditor from "@/features/division/ui/PoolAdvancementEditor";
import ConnectedMatchCard from "@/features/match/ui/ConnectedMatchCard";
import MatchListRow from "@/features/match/ui/MatchListRow";
import { rowOfMatch } from "@/features/match/model/matchRow";
import CreateMatchModal from "@/features/match/ui/CreateMatchModal";
import StatusIcon from "@/shared/components/ui/StatusIcon";
import CreateCard from "@/shared/components/ui/CreateCard";
import { poolStatus } from "@/features/tournament/model/treeStatus";
import { btnPrimary } from "@/styles/buttonStyles";


const LIST_MAX_HEIGHT = "max-h-[min(48vh,26rem)]";

export default function DivisionMatchesPage() {
  const page = useDivisionMatchesPage();
  const { division, controls, tournamentId, groups, highlight, selectedMatch, matchCreation } = page;

  return (
    <div className="flex flex-col gap-3">
      {page.advancementEditorPool && (
        <PoolAdvancementEditor
          division={division}
          phaseGroup={page.advancementEditorPool}
          allMatches={page.matches}
          onClose={page.closeAdvancement}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded border border-ui-border-strong bg-ui-surface px-3 focus-within:border-ui-accent focus-within:ring-2 focus-within:ring-ui-accent/20 sm:max-w-xs">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="shrink-0 text-xs text-ui-text-mute" />
          <input
            type="search"
            value={page.query}
            onChange={(event) => page.setQuery(event.target.value)}
            placeholder="Search match, player, song…"
            aria-label="Search matches"
            className="w-full min-w-0 bg-transparent text-sm text-ui-text outline-none placeholder:text-ui-text-mute"
          />
        </label>

        {page.searching && (
          <span className="inline-flex items-center gap-1 rounded-full border border-ui-border-strong bg-ui-selected py-0.5 pl-3 pr-1 text-xs text-ui-text-soft">
            searching all of {division.name}
            <button
              type="button"
              onClick={() => page.setQuery("")}
              aria-label="Clear search"
              className="rounded-full px-1.5 py-0.5 text-ui-text-mute transition-colors hover:bg-ui-border hover:text-ui-text"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </span>
        )}

        <span className="text-xs tabular-nums text-ui-text-mute">
          {page.totalInScope} match{page.totalInScope !== 1 ? "es" : ""}
        </span>

        {controls && page.createTargetPool !== undefined && (
          <button type="button" onClick={matchCreation.openCreateMatch} className={`${btnPrimary} ml-auto text-sm`}>
            <FontAwesomeIcon icon={faPlus} className="mr-2 text-xs" />
            New match
          </button>
        )}
      </div>

      {page.totalInScope === 0 ? (
        <EmptyState
          searching={page.searching}
          controls={controls}
          hasPhase={groups.length > 0}
          onCreate={matchCreation.openCreateMatch}
        />
      ) : (
        <div className={`flex flex-col overflow-hidden rounded-lg border border-ui-border bg-ui-row ${LIST_MAX_HEIGHT}`}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {groups
              .filter((group) => group.matches.length > 0)
              .map((group) => (
                <section key={group.pool.id} className="border-t border-ui-separator first:border-t-0">
                  <header className="sticky top-0 z-10 border-b border-ui-separator bg-ui-row text-[11px] font-semibold uppercase tracking-wider text-ui-text-mute">
                    <button
                      type="button"
                      aria-pressed={page.selectedPhaseGroupId === group.pool.id}
                      onClick={() => page.selectPhaseGroup(group.pool.id)}
                      className={`flex w-full items-center gap-2 border-l-[3px] px-3 py-1.5 text-left transition-colors hover:bg-ui-raised/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-accent ${
                        page.selectedPhaseGroupId === group.pool.id ? "border-ui-accent text-ui-text" : "border-transparent"
                      }`}
                    >
                      <StatusIcon status={poolStatus(group.pool)} className="h-3 w-3" />
                      {group.label}
                      {(groups.length > 1 || page.searching) && (
                        <span className="truncate font-medium normal-case tracking-normal">
                          {group.poolVisible ? `${division.name} / ${group.phaseName}` : division.name}
                        </span>
                      )}
                      <span className="ml-auto font-medium normal-case tracking-normal tabular-nums">
                        {group.matches.length}
                      </span>
                    </button>
                  </header>
                  {group.matches.map((match) => (
                    <div key={match.id} ref={match.id === highlight.matchId ? page.routedRowRef : undefined}>
                      <MatchListRow
                        match={rowOfMatch(match)}
                        selected={match.id === selectedMatch?.id}
                        routed={match.id === highlight.matchId}
                        controls={controls}
                        onSelect={() => page.selectMatch(match.id)}
                        onCommit={() => void page.commitMatch(match)}
                        onTiebreak={() => page.selectMatch(match.id)}
                      />
                    </div>
                  ))}
                </section>
              ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {page.displayedMatches.map((match) => (
          <ConnectedMatchCard
            key={match.id}
            match={match}
            division={division}
            divisionEntrants={page.entrants}
            allMatches={page.matches}
            actions={page.actions}
            controls={controls}
            tournamentId={tournamentId}
            highlight={highlight}
            onHighlight={page.setHighlight}
          />
        ))}
      </div>

      <CreateMatchModal
        open={matchCreation.createMatchOpen}
        onClose={matchCreation.closeCreateMatch}
        onCreate={matchCreation.createMatch}
        divisionId={division.id}
        phaseId={page.createTargetPhase}
        phaseGroupId={page.scopePoolId ?? undefined}
        tournamentId={tournamentId}
      />
    </div>
  );
}

function EmptyState({
  searching,
  controls,
  hasPhase,
  onCreate,
}: {
  searching: boolean;
  controls: boolean;
  hasPhase: boolean;
  onCreate: () => void;
}) {
  if (searching) {
    return <p className="py-10 text-center text-sm text-ui-text-mute">No match found.</p>;
  }
  if (!hasPhase) {
    return (
      <p className="py-10 text-center text-sm text-ui-text-mute">
        {controls ? "No phase here yet. Right-click a division in the tree to add one." : "No phase here yet."}
      </p>
    );
  }
  if (!controls) {
    return <p className="py-10 text-center text-sm text-ui-text-mute">No matches yet.</p>;
  }
  return <CreateCard label="Create match" onClick={onCreate} />;
}
