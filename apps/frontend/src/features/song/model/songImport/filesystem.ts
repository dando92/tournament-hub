export interface FileLikeHandle {
  kind: "file";
  name: string;
  getFile(): Promise<{ text(): Promise<string> }>;
}

export interface DirectoryLikeHandle {
  kind: "directory";
  name: string;
  values(): AsyncIterable<FileLikeHandle | DirectoryLikeHandle>;
}

export type EntryHandle = FileLikeHandle | DirectoryLikeHandle;

export class DirectoryPickerUnsupportedError extends Error {
  constructor() {
    super("This browser cannot open a folder. Use a Chromium-based browser to import songs from disk.");
    this.name = "DirectoryPickerUnsupportedError";
  }
}

type DirectoryPicker = (options?: { id?: string; mode?: "read" | "readwrite" }) => Promise<DirectoryLikeHandle>;

function directoryPicker(): DirectoryPicker | null {
  const picker = (window as unknown as { showDirectoryPicker?: DirectoryPicker }).showDirectoryPicker;

  return typeof picker === "function" ? picker.bind(window) : null;
}

export function supportsDirectoryPicker(): boolean {
  return directoryPicker() !== null;
}

export async function pickSongsDirectory(): Promise<DirectoryLikeHandle | null> {
  const picker = directoryPicker();
  if (!picker) throw new DirectoryPickerUnsupportedError();

  try {
    return await picker({ id: "tournament-hub-songs", mode: "read" });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null;

    throw error;
  }
}
