import JSZip from "jszip";
import type { Participant, Player } from "@/features/participant/model/types";

const EDITABLE_INI_TEMPLATE = [
    "[Editable]",
    "BirthYear=0",
    "CharacterID=default",
    "DisplayName=Player2",
    "IgnoreStepCountCalories=0",
    "IsMale=1",
    "LastUsedHighScoreName=",
    "Voomax=0.000000",
    "WeightPounds=0",
    "",
].join("\r\n");

const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

export function playersForItgmaniaProfiles(participants: Participant[]): Player[] {
    const players = new Map<number, Player>();

    for (const participant of participants) {
        players.set(participant.player.id, participant.player);
    }

    return [...players.values()];
}

export function sanitizeWindowsName(value: string, fallback: string): string {
    const withoutControlCharacters = [...value]
        .map((character) => character.charCodeAt(0) < 32 ? "_" : character)
        .join("");
    const replaced = withoutControlCharacters.replace(/[<>:"/\\|?*]/g, "_").replace(/[. ]+$/g, "");
    const safe = replaced || fallback;
    return WINDOWS_RESERVED_NAME.test(safe) ? `_${safe}` : safe;
}

export function itgmaniaArchiveFileName(tournamentName: string): string {
    return `${sanitizeWindowsName(tournamentName, "Tournament")}.zip`;
}

export async function createItgmaniaProfilesArchive(players: Player[]): Promise<Blob> {
    const zip = new JSZip();
    zip.folder("LocalProfiles");
    const usedFolders = new Set<string>();

    for (const player of players) {
        if (/\r|\n/.test(player.playerName)) {
            throw new Error(`Player name cannot contain a line break: ${player.playerName}`);
        }

        const folder = uniqueFolderName(sanitizeWindowsName(player.playerName, `Player ${player.id}`), usedFolders);
        const editableIni = EDITABLE_INI_TEMPLATE.replace(/^DisplayName=.*$/m, `DisplayName=${player.playerName}`);
        zip.file(`LocalProfiles/${folder}/Editable.ini`, editableIni);
    }

    return zip.generateAsync({ type: "blob" });
}

function uniqueFolderName(baseName: string, usedFolders: Set<string>): string {
    let folderName = baseName;
    let suffix = 2;

    while (usedFolders.has(folderName.toLowerCase())) {
        folderName = `${baseName} (${suffix})`;
        suffix += 1;
    }

    usedFolders.add(folderName.toLowerCase());
    return folderName;
}
