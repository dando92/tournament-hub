import { useState } from "react";
import type { Participant } from "@/features/participant/model/types";
import {
    createItgmaniaProfilesArchive,
    itgmaniaArchiveFileName,
    playersForItgmaniaProfiles,
} from "@/features/participant/model/itgmaniaProfiles";
import { usePageNotices } from "@/shared/context/PageNoticeContext";

type Options = {
    tournamentName: string;
    participants: Participant[];
};

export function useItgmaniaProfileExport({ tournamentName, participants }: Options) {
    const { report, dismiss } = usePageNotices();
    const [exporting, setExporting] = useState(false);

    const exportProfiles = async () => {
        setExporting(true);
        try {
            const players = playersForItgmaniaProfiles(participants);
            const archive = await createItgmaniaProfilesArchive(players);
            downloadArchive(archive, itgmaniaArchiveFileName(tournamentName));
            dismiss("Failed to export ITGmania profiles.");
        } catch {
            report("Failed to export ITGmania profiles.");
        } finally {
            setExporting(false);
        }
    };

    return { exporting, exportProfiles };
}

function downloadArchive(archive: Blob, fileName: string): void {
    const url = URL.createObjectURL(archive);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
