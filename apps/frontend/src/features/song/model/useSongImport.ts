import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { importSongs } from "@/features/song/api/song.api";
import {
  DirectoryPickerUnsupportedError,
  pickSongsDirectory,
} from "@/features/song/model/songImport/filesystem";
import { scanSongsDirectory } from "@/features/song/model/songImport/scan";
import { buildImportRows } from "@/features/song/model/songImport/stepmaniaParser";
import type { ChartMode, ScanResult } from "@/features/song/model/songImport/types";
import { usePageNotices } from "@/shared/context/PageNoticeContext";


export type ScanProgress = { packs: number; songs: number; charts: number };

export type SongImportState =
  | { status: "idle" }
  | { status: "scanning"; folder: string; progress: ScanProgress }
  | { status: "empty"; folder: string }
  | { status: "ready"; scan: ScanResult }
  | { status: "importing"; folder: string; total: number }
  | { status: "failed"; message: string };

type Options = {
  tournamentId: number;
};

const PROGRESS_INTERVAL_MS = 120;

function messageOf(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    (error instanceof Error ? error.message : fallback)
  );
}

export function useSongImport({ tournamentId }: Options) {
  const navigate = useNavigate();
  const { report } = usePageNotices();
  const [state, setState] = useState<SongImportState>({ status: "idle" });
  const [chartMode, setChartMode] = useState<ChartMode>("all");
  const lastProgressAt = useRef(0);

  const close = useCallback(() => setState({ status: "idle" }), []);

  const start = useCallback(async () => {
    setChartMode("all");

    let directory;
    try {
      directory = await pickSongsDirectory();
    } catch (error) {
      if (error instanceof DirectoryPickerUnsupportedError) {
        report(error.message);
        return;
      }

      report(messageOf(error, "Could not open that folder."));
      return;
    }

    if (!directory) return;

    setState({ status: "scanning", folder: directory.name, progress: { packs: 0, songs: 0, charts: 0 } });
    lastProgressAt.current = 0;

    try {
      const scan = await scanSongsDirectory(directory, (progress) => {
        const now = Date.now();
        if (now - lastProgressAt.current < PROGRESS_INTERVAL_MS) return;

        lastProgressAt.current = now;
        setState({ status: "scanning", folder: directory.name, progress });
      });

      if (scan.songs.length === 0) {
        setState({ status: "empty", folder: scan.rootName });
        return;
      }

      setState({ status: "ready", scan });
    } catch (error) {
      setState({ status: "failed", message: messageOf(error, "That folder could not be read.") });
    }
  }, [report]);

  const confirm = useCallback(async () => {
    if (state.status !== "ready") return;

    const { rows, warnings } = buildImportRows(state.scan.songs, chartMode);
    if (rows.length === 0) {
      setState({
        status: "failed",
        message: "None of the songs in that folder holds a dance-single chart this application can import.",
      });
      return;
    }

    setState({ status: "importing", folder: state.scan.rootName, total: rows.length });

    try {
      await importSongs(tournamentId, rows);
      setState({ status: "idle" });

      if (warnings.length > 0) console.warn("Song import warnings:", warnings, state.scan.warnings);

      navigate(`/tournament/${tournamentId}/songs`);
    } catch (error) {
      setState({ status: "failed", message: messageOf(error, "The songs could not be saved.") });
    }
  }, [chartMode, navigate, state, tournamentId]);

  return { state, chartMode, setChartMode, start, confirm, close };
}
