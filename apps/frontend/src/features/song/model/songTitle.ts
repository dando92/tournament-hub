export function displaySongTitle(title: string): string {
    const normalized = title.trim().replace(/[\\/]+$/, "");
    const segments = normalized.split(/[\\/]+/);
    return segments.at(-1)?.trim() || normalized;
}

export function displaySongLabel(song: { title: string; artist?: string | null }): string {
    const title = displaySongTitle(song.title);
    return song.artist ? `${song.artist} - ${title}` : title;
}
