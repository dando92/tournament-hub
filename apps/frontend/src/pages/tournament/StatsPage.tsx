import { useEffect, useMemo, useState } from "react";
import type { SongStatsRowDto } from "@tournament-hub/contracts";

import { findingsOf } from "@/features/stats/model/findings";
import { useTournamentStats } from "@/features/stats/model/useTournamentStats";
import DifficultyScatter from "@/features/stats/ui/DifficultyScatter";
import DivisionTabs from "@/features/stats/ui/DivisionTabs";
import FindingsStrip from "@/features/stats/ui/FindingsStrip";
import PackTabs, { type PackOption } from "@/features/stats/ui/PackTabs";
import PlacementsTable from "@/features/stats/ui/PlacementsTable";
import PlayerStatsTable from "@/features/stats/ui/PlayerStatsTable";
import Podium from "@/features/stats/ui/Podium";
import SongStatsTable from "@/features/stats/ui/SongStatsTable";
import SpreadList from "@/features/stats/ui/SpreadList";
import StatsSection from "@/features/stats/ui/StatsSection";
import { useTournamentPageContext } from "@/features/tournament/model/TournamentPageContext";

type Tab = "placements" | "players" | "songs";

const TABS: ReadonlyArray<{ key: Tab; label: string }> = [
  { key: "placements", label: "Placements" },
  { key: "players", label: "Players" },
  { key: "songs", label: "Songs" },
];

export default function StatsPage() {
  const { tournamentId, tournamentName } = useTournamentPageContext();
  const { placements, players, songs } = useTournamentStats(tournamentId);
  const [tab, setTab] = useState<Tab>("placements");
  const [divisionId, setDivisionId] = useState<number | null>(null);
  const [pack, setPack] = useState<string | null>(null);

  const allDivisions = useMemo(() => placements.data ?? [], [placements.data]);
  const finished = useMemo(() => allDivisions.filter((division) => division.complete), [allDivisions]);

  useEffect(() => {
    if (divisionId !== null && finished.some((division) => division.divisionId === divisionId)) {
      return;
    }
    setDivisionId(finished[0]?.divisionId ?? null);
  }, [finished, divisionId]);

  const selected = finished.find((division) => division.divisionId === divisionId) ?? null;
  const findings = useMemo(() => findingsOf(players.data ?? [], songs.data ?? [], allDivisions), [players.data, songs.data, allDivisions]);

  const allSongs = useMemo(() => songs.data ?? [], [songs.data]);
  const packs = useMemo(() => packsOf(allSongs), [allSongs]);
  const shownSongs = useMemo(() => (pack === null ? allSongs : allSongs.filter((song) => (song.group || "Unfiled") === pack)), [allSongs, pack]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ui-text-mute">{tournamentName}</span>
          <h1 className="text-2xl font-bold tracking-tight text-ui-text">Statistics</h1>
        </div>
        <div className="flex gap-1 rounded-xl border border-ui-border bg-ui-raised p-1">
          {TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              aria-pressed={tab === entry.key}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                tab === entry.key ? "bg-ui-surface text-ui-text shadow-sm" : "text-ui-text-mute hover:text-ui-text"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "placements" ? (
        <StatsSection
          title="Final placements"
          description="Read back off the advancement rules. Entrants the tournament never separated share a place."
          loading={placements.isLoading}
          error={placements.isError}
          empty={finished.length === 0}
          emptyMessage={
            allDivisions.length === 0 ? "No divisions yet." : "No division has finished yet, so there is no final order to read."
          }
        >
          <div className="flex flex-col gap-5">
            <DivisionTabs divisions={finished} unfinished={allDivisions.length - finished.length} selectedId={divisionId} onSelect={setDivisionId} />
            {selected ? (
              <>
                <Podium rows={selected.rows} />
                <PlacementsTable division={selected} />
              </>
            ) : null}
          </div>
        </StatsSection>
      ) : null}

      {tab === "players" ? (
        <div className="flex flex-col gap-6">
          <StatsSection
            title="What the numbers turned up"
            description="Findings rather than counters: each one names somebody."
            loading={players.isLoading || placements.isLoading}
            error={players.isError}
            empty={(players.data ?? []).length === 0}
          >
            <FindingsStrip findings={findings} />
          </StatsSection>
          <StatsSection
            title="Players"
            description="Every run recorded in this tournament, by the person who played it."
            loading={players.isLoading}
            error={players.isError}
            empty={(players.data ?? []).length === 0}
          >
            <PlayerStatsTable rows={players.data ?? []} />
          </StatsSection>
        </div>
      ) : null}

      {tab === "songs" ? (
        <StatsSection
          title="Songs"
          description="What the pool was worth: the difficulty each song declares against how the field actually scored on it."
          loading={songs.isLoading}
          error={songs.isError}
          empty={allSongs.length === 0}
        >
          <div className="flex flex-col gap-5">
            <PackTabs packs={packs} selected={pack} onSelect={setPack} />
            <div className="grid gap-4 lg:grid-cols-[1.9fr_1fr]">
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-ui-text">Declared difficulty against how it actually played</h3>
                <DifficultyScatter rows={shownSongs} />
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-ui-border bg-ui-surface p-4">
                <h3 className="text-sm font-semibold text-ui-text">Songs that decided something</h3>
                <p className="-mt-1 text-xs leading-snug text-ui-text-mute">
                  Ranked by how far apart they pulled the field. A song everybody passed alike decided nothing, however hard it was.
                </p>
                <SpreadList rows={shownSongs} />
              </div>
            </div>
            <SongStatsTable rows={shownSongs} />
          </div>
        </StatsSection>
      ) : null}
    </div>
  );
}

function packsOf(songs: SongStatsRowDto[]): PackOption[] {
  const counts = new Map<string, { songs: number; runs: number }>();

  for (const song of songs) {
    const name = song.group || "Unfiled";
    const held = counts.get(name) ?? { songs: 0, runs: 0 };
    counts.set(name, { songs: held.songs + 1, runs: held.runs + song.playedCount });
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, songs: count.songs, runs: count.runs }))
    .sort((left, right) => right.runs - left.runs || left.name.localeCompare(right.name))
    .map(({ name, songs: count }) => ({ name, songs: count }));
}
