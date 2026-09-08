import type { DirectoryLikeHandle, EntryHandle, FileLikeHandle } from "@/features/song/model/songImport/filesystem";
import { parseSimfile, toSongPath } from "@/features/song/model/songImport/stepmaniaParser";
import type { ScanResult, ScannedSong } from "@/features/song/model/songImport/types";

const NOTE_FILE_EXTENSIONS = [".ssc", ".sm"];

type ScanProgress = {
  packs: number;
  songs: number;
  charts: number;
};

function extension(name: string): string {
  const dot = name.lastIndexOf(".");

  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

async function entriesOf(directory: DirectoryLikeHandle): Promise<EntryHandle[]> {
  const entries: EntryHandle[] = [];
  for await (const entry of directory.values()) entries.push(entry);

  return entries;
}

async function readDirectories(directory: DirectoryLikeHandle): Promise<DirectoryLikeHandle[]> {
  const entries = await entriesOf(directory);

  return entries
    .filter((entry): entry is DirectoryLikeHandle => entry.kind === "directory" && !entry.name.startsWith("."))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function findPreferredNoteFile(directory: DirectoryLikeHandle): Promise<FileLikeHandle | null> {
  const files = (await entriesOf(directory))
    .filter((entry): entry is FileLikeHandle => entry.kind === "file")
    .filter((entry) => NOTE_FILE_EXTENSIONS.includes(extension(entry.name)));

  return (
    files.find((file) => extension(file.name) === ".ssc") ??
    files.find((file) => extension(file.name) === ".sm") ??
    null
  );
}

async function hasSongFolderChildren(children: DirectoryLikeHandle[]): Promise<boolean> {
  for (const child of children) {
    if (await findPreferredNoteFile(child)) return true;
  }

  return false;
}

export async function resolvePacks(root: DirectoryLikeHandle): Promise<DirectoryLikeHandle[]> {
  const children = await readDirectories(root);

  return (await hasSongFolderChildren(children)) ? [root] : children;
}

export async function scanSongsDirectory(
  root: DirectoryLikeHandle,
  onProgress?: (progress: ScanProgress) => void,
): Promise<ScanResult> {
  const packs = await resolvePacks(root);
  const songs: ScannedSong[] = [];
  const warnings: string[] = [];
  const packNames: string[] = [];
  let charts = 0;

  for (const pack of packs) {
    packNames.push(pack.name);

    for (const folder of await readDirectories(pack)) {
      const noteFile = await findPreferredNoteFile(folder);
      if (!noteFile) continue;

      const songPath = toSongPath(pack.name, folder.name);

      try {
        const file = await noteFile.getFile();
        const parsed = parseSimfile(noteFile.name, await file.text());

        songs.push({
          pack: pack.name,
          folder: folder.name,
          songPath,
          artist: parsed.artist,
          charts: parsed.charts,
        });
        charts += parsed.charts.length;
      } catch {
        warnings.push(`${songPath}: ${noteFile.name} could not be read and was skipped.`);
      }

      onProgress?.({ packs: packNames.length, songs: songs.length, charts });
    }

    onProgress?.({ packs: packNames.length, songs: songs.length, charts });
  }

  return { rootName: root.name, packs: packNames, songs, warnings };
}
