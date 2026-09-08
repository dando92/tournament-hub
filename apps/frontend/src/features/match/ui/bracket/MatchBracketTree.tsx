import { useMemo } from "react";
import { PhaseGroup } from "@/features/division/model/types";
import { Entrant } from "@/features/participant/model/types";
import { entrantPlayer } from "@/features/participant/model/entrant";
import { AdvancementRule, Match } from "@/features/match/model/types";
import { toOrdinal } from "@/shared/utils";
import { getActiveLabel, getMatchProgress, getMatchProgressLabel, getMatchProgressStatus } from "@/features/match/model/matchStatus";
import { StatusBadge } from "@/shared/components/ui/StatusIcon";
import StatusDot from "@/shared/components/ui/StatusDot";

type MatchBracketTreeProps = {
  matches: Match[];
  phaseGroups: PhaseGroup[];
  selectedMatchId: number | null;
  onSelectMatch: (match: Match) => void;
  onClearSelection: () => void;
};

type BracketEdge = {
  sourceId: number;
  targetId: number;
};

type PositionedMatch = {
  match: Match;
  column: number;
  row: number;
};

const CARD_WIDTH = 220;
const CARD_HEADER_HEIGHT = 30;
const CARD_ROW_HEIGHT = 28;
const COLUMN_GAP = 64;
const ROW_GAP = 28;

function getMatchEdges(matches: Match[]): BracketEdge[] {
  const matchIds = new Set(matches.map((match) => match.id));
  const edgeKeys = new Set<string>();

  return matches.flatMap((match) =>
    (match.advancementRules ?? [])
      .filter((rule) =>
        rule.sourceKind === "match"
        && rule.targetKind === "match"
        && rule.sourceId === match.id
        && matchIds.has(rule.targetId),
      )
      .map((rule) => {
        const key = `${rule.sourceId}:${rule.targetId}`;
        if (edgeKeys.has(key)) return null;
        edgeKeys.add(key);
        return { sourceId: rule.sourceId, targetId: rule.targetId };
      })
      .filter((edge): edge is BracketEdge => Boolean(edge)),
  );
}

function getColumns(matches: Match[], edges: BracketEdge[]): Map<number, number> {
  const columns = new Map(matches.map((match) => [match.id, 0]));

  for (let pass = 0; pass < matches.length; pass += 1) {
    let changed = false;
    for (const edge of edges) {
      const nextColumn = (columns.get(edge.sourceId) ?? 0) + 1;
      if (nextColumn > (columns.get(edge.targetId) ?? 0)) {
        columns.set(edge.targetId, nextColumn);
        changed = true;
      }
    }
    if (!changed) break;
  }

  return columns;
}

function getCompactRowCount(match: Match, matches: Match[], phaseGroups: PhaseGroup[]): number {
  const playerRows = match.entrants?.length ?? 0;
  const incomingRows = getIncomingAdvancementSourceRules(match, matches, phaseGroups).length;
  return Math.max(1, incomingRows + playerRows);
}

function getCardHeight(rowCount: number): number {
  return CARD_HEADER_HEIGHT + (rowCount * CARD_ROW_HEIGHT);
}

function getPositionedMatches(matches: Match[], edges: BracketEdge[]): PositionedMatch[] {
  const connectedIds = new Set(edges.flatMap((edge) => [edge.sourceId, edge.targetId]));
  const connectedMatches = matches.filter((match) => connectedIds.has(match.id));
  const columns = getColumns(connectedMatches, edges);
  const incomingByTarget = new Map<number, number[]>();

  edges.forEach((edge) => {
    incomingByTarget.set(edge.targetId, [...(incomingByTarget.get(edge.targetId) ?? []), edge.sourceId]);
  });

  const byColumn = new Map<number, Match[]>();
  connectedMatches.forEach((match) => {
    const column = columns.get(match.id) ?? 0;
    byColumn.set(column, [...(byColumn.get(column) ?? []), match]);
  });

  const rowByMatchId = new Map<number, number>();
  const maxColumn = Math.max(0, ...Array.from(byColumn.keys()));
  const positioned: PositionedMatch[] = [];

  for (let column = 0; column <= maxColumn; column += 1) {
    const columnMatches = [...(byColumn.get(column) ?? [])].sort((a, b) => {
      const aIncomingRows = (incomingByTarget.get(a.id) ?? []).map((id) => rowByMatchId.get(id) ?? 0);
      const bIncomingRows = (incomingByTarget.get(b.id) ?? []).map((id) => rowByMatchId.get(id) ?? 0);
      const aRow = aIncomingRows.length > 0 ? aIncomingRows.reduce((sum, row) => sum + row, 0) / aIncomingRows.length : Number.MAX_SAFE_INTEGER;
      const bRow = bIncomingRows.length > 0 ? bIncomingRows.reduce((sum, row) => sum + row, 0) / bIncomingRows.length : Number.MAX_SAFE_INTEGER;
      return aRow - bRow || a.id - b.id;
    });

    columnMatches.forEach((match, index) => {
      const incomingRows = (incomingByTarget.get(match.id) ?? [])
        .map((id) => rowByMatchId.get(id))
        .filter((row): row is number => row !== undefined);
      const preferredRow = incomingRows.length > 0
        ? Math.round(incomingRows.reduce((sum, row) => sum + row, 0) / incomingRows.length)
        : index;
      let row = preferredRow;
      while ([...rowByMatchId.entries()].some(([matchId, usedRow]) => (columns.get(matchId) ?? 0) === column && usedRow === row)) {
        row += 1;
      }
      rowByMatchId.set(match.id, row);
      positioned.push({ match, column, row });
    });
  }

  return positioned;
}

function getPlayerPoint(match: Match, entrant: Entrant): number | null {
  const player = entrantPlayer(entrant);
  if (!player) return null;
  return match.matchResult?.playerPoints.find((result) => result.playerId === player.id)?.points ?? null;
}

function getAdvancedPlayerIds(match: Match): Set<number> {
  const sortedResults = [...(match.matchResult?.playerPoints ?? [])].sort(
    (left, right) => left.placement - right.placement || left.playerId - right.playerId,
  );

  return new Set(
    sortedResults
      .filter((_, index) =>
        (match.advancementRules ?? []).some(
          (rule) => rule.sourceKind === "match" && rule.sourceId === match.id && rule.sourcePlacement === index + 1,
        ),
      )
      .map((result) => result.playerId),
  );
}

function isAdvancementSourceResolved(rule: AdvancementRule, matches: Match[], phaseGroups: PhaseGroup[]): boolean {
  if (rule.sourceKind === "match") {
    const sourceMatch = matches.find((candidate) => candidate.id === rule.sourceId);
    return Boolean(sourceMatch?.matchResult);
  }

  const sourcePhaseGroup = phaseGroups.find((phaseGroup) => phaseGroup.id === rule.sourceId);
  return sourcePhaseGroup?.state === "completed";
}

function getIncomingAdvancementSourceRules(match: Match, matches: Match[], phaseGroups: PhaseGroup[]): AdvancementRule[] {
  return (match.advancementRules ?? []).filter(
    (rule) =>
      rule.targetKind === "match"
      && rule.targetId === match.id
      && !isAdvancementSourceResolved(rule, matches, phaseGroups),
  );
}

function getSourceRuleLabel(rule: AdvancementRule, matches: Match[], phaseGroups: PhaseGroup[]): string {
  const sourceName = rule.sourceName ?? (rule.sourceKind === "match"
    ? matches.find((match) => match.id === rule.sourceId)?.name ?? `Match ${rule.sourceId}`
    : phaseGroups.find((phaseGroup) => phaseGroup.id === rule.sourceId)?.name ?? `Phase group ${rule.sourceId}`);

  return `${toOrdinal(rule.sourcePlacement)} from ${sourceName}`;
}

function MatchBracketCard({
  match,
  phaseGroups,
  allMatches,
  rowCount,
  selected,
  onSelect,
}: {
  match: Match;
  phaseGroups: PhaseGroup[];
  allMatches: Match[];
  rowCount: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const incomingSourceRules = getIncomingAdvancementSourceRules(match, allMatches, phaseGroups);
  const progress = getMatchProgress(match);
  const sortedEntrants = [...(match.entrants ?? [])].sort((a, b) => {
    const aPoints = getPlayerPoint(match, a);
    const bPoints = getPlayerPoint(match, b);
    return (bPoints ?? Number.NEGATIVE_INFINITY) - (aPoints ?? Number.NEGATIVE_INFINITY) || a.id - b.id;
  });
  const advancedPlayerIds = getAdvancedPlayerIds(match);
  const hasRows = incomingSourceRules.length > 0 || sortedEntrants.length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      data-compact-match-card="true"
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`relative block w-[220px] rounded-md border-l-[3px] border-y border-r bg-ui-surface text-left shadow-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent ${
        selected
          ? "border-ui-accent bg-ui-selected font-semibold"
          : "border-ui-border hover:border-ui-border-strong hover:bg-ui-raised"
      }`}
    >
      <div className="border-b border-ui-border px-2.5 py-1.5">
        <div className="flex items-center gap-2">
          <StatusDot on={match.active} label={getActiveLabel(match.active)} />
          <span className="truncate text-xs font-semibold text-ui-text">{match.name}</span>
          <span className="ml-auto shrink-0">
            <StatusBadge status={getMatchProgressStatus(progress)} label={getMatchProgressLabel(progress)} />
          </span>
        </div>
      </div>
      <div className="divide-y divide-ui-border">
        {incomingSourceRules.map((rule) => (
          <div
            key={`${rule.sourceKind}-${rule.sourceId}-${rule.sourcePlacement}-${rule.targetSlot}`}
            className="grid grid-cols-[1fr_34px] items-center bg-ui-raised"
          >
            <span className="truncate px-2.5 py-1.5 text-xs font-medium text-ui-text-mute">
              {getSourceRuleLabel(rule, allMatches, phaseGroups)}
            </span>
            <span className="h-full px-2 py-1.5 text-center text-xs font-semibold text-ui-text-mute">
              -
            </span>
          </div>
        ))}
        {sortedEntrants.map((entrant) => {
          const points = getPlayerPoint(match, entrant);
          const player = entrantPlayer(entrant);
          const didAdvance = player ? advancedPlayerIds.has(player.id) : false;
          return (
            <div key={entrant.id} className="grid grid-cols-[1fr_34px] items-center">
              <span className="truncate px-2.5 py-1.5 text-xs font-medium text-ui-text">{entrant.name}</span>
              <span className={`h-full px-2 py-1.5 text-center text-xs font-semibold ${
                didAdvance ? "bg-state-done text-ui-surface" : "bg-ui-selected text-ui-text-soft"
              }`}>
                {points ?? "-"}
              </span>
            </div>
          );
        })}
        {!hasRows && (
          <div className="px-2.5 py-1.5 text-xs text-ui-text-mute">No data available</div>
        )}
        {Array.from({ length: Math.max(0, rowCount - (hasRows ? incomingSourceRules.length + sortedEntrants.length : 1)) }).map((_, index) => (
          <div key={`blank-${index}`} className="px-2.5 py-1.5 text-xs text-transparent">-</div>
        ))}
      </div>
    </div>
  );
}

export default function MatchBracketTree({
  matches,
  phaseGroups,
  selectedMatchId,
  onSelectMatch,
  onClearSelection,
}: MatchBracketTreeProps) {
  const { edges, positionedMatches, unlinkedMatches, width, height } = useMemo(() => {
    const nextEdges = getMatchEdges(matches);
    const connectedIds = new Set(nextEdges.flatMap((edge) => [edge.sourceId, edge.targetId]));
    const nextPositionedMatches = getPositionedMatches(matches, nextEdges);
    const maxColumn = Math.max(0, ...nextPositionedMatches.map((positioned) => positioned.column));
    const maxRow = Math.max(0, ...nextPositionedMatches.map((positioned) => positioned.row));
    const maxRowsPerCard = Math.max(1, ...matches.map((match) => getCompactRowCount(match, matches, phaseGroups)));
    const cardHeight = getCardHeight(maxRowsPerCard);

    return {
      edges: nextEdges,
      positionedMatches: nextPositionedMatches,
      unlinkedMatches: matches.filter((match) => !connectedIds.has(match.id)).sort((a, b) => a.id - b.id),
      cardHeight,
      maxRowsPerCard,
      width: (maxColumn + 1) * CARD_WIDTH + maxColumn * COLUMN_GAP,
      height: (maxRow + 1) * cardHeight + maxRow * ROW_GAP,
    };
  }, [matches, phaseGroups]);
  const maxRowsPerCard = Math.max(1, ...matches.map((match) => getCompactRowCount(match, matches, phaseGroups)));
  const cardHeight = getCardHeight(maxRowsPerCard);

  const positionByMatchId = new Map(positionedMatches.map((positioned) => [positioned.match.id, positioned]));
  const handleBackgroundClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-compact-match-card='true']")) return;
    onClearSelection();
  };

  return (
    <div className="space-y-4" onClick={handleBackgroundClick}>
      {positionedMatches.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-ui-border bg-ui-raised p-4">
          <div className="relative" style={{ width, height }}>
            <svg className="pointer-events-none absolute inset-0" width={width} height={height}>
              {edges.map((edge) => {
                const source = positionByMatchId.get(edge.sourceId);
                const target = positionByMatchId.get(edge.targetId);
                if (!source || !target) return null;

                const x1 = source.column * (CARD_WIDTH + COLUMN_GAP) + CARD_WIDTH;
                const y1 = source.row * (cardHeight + ROW_GAP) + cardHeight / 2;
                const x2 = target.column * (CARD_WIDTH + COLUMN_GAP);
                const y2 = target.row * (cardHeight + ROW_GAP) + cardHeight / 2;
                const midX = x1 + (x2 - x1) / 2;

                return (
                  <path
                    key={`${edge.sourceId}-${edge.targetId}`}
                    d={`M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`}
                    fill="none"
                    stroke="rgb(var(--ui-border-strong))"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
            {positionedMatches.map(({ match, column, row }) => (
              <div
                key={match.id}
                className="absolute"
                style={{
                  left: column * (CARD_WIDTH + COLUMN_GAP),
                  top: row * (cardHeight + ROW_GAP),
                }}
              >
                <MatchBracketCard
                  match={match}
                  phaseGroups={phaseGroups}
                  allMatches={matches}
                  rowCount={maxRowsPerCard}
                  selected={selectedMatchId === match.id}
                  onSelect={() => onSelectMatch(match)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {unlinkedMatches.length > 0 && (
        <div className="rounded-md border border-ui-border bg-ui-surface p-3">
          <div className="mb-2 text-xs font-semibold text-ui-text-mute">Unlinked matches</div>
          <div className="flex flex-wrap gap-3">
            {unlinkedMatches.map((match) => (
              <MatchBracketCard
                key={match.id}
                match={match}
                phaseGroups={phaseGroups}
                allMatches={matches}
                rowCount={getCompactRowCount(match, matches, phaseGroups)}
                selected={selectedMatchId === match.id}
                onSelect={() => onSelectMatch(match)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
