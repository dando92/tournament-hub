import { Song } from "@/features/song/model/types";
import { chartDifficultyPresentation, meterColor } from "@/features/song/model/chartDifficultyPresentation";
import { displaySongLabel } from "@/features/song/model/songTitle";
import DeleteConfirmButton from "@/shared/components/ui/DeleteConfirmButton";
import OverflowMarquee from "@/shared/components/ui/OverflowMarquee";

type Props = {
  song: Song;
  canEdit: boolean;
  onDelete: (id: number) => void;
};

export default function SongRow({ song, canEdit, onDelete }: Props) {
  const label = displaySongLabel(song);
  const slot = song.chartDifficulty ? chartDifficultyPresentation[song.chartDifficulty] : null;

  return (
    <div className="border-b border-ui-border last:border-0">
      <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-ui-raised transition-colors">
        <span
          className={`${slot ? slot.badge : meterColor(song.difficulty)} text-white text-xs font-bold w-7 h-7 flex items-center justify-center rounded shrink-0`}
          title={slot ? `${slot.label} ${song.difficulty}` : `Level ${song.difficulty}`}
        >
          {song.difficulty}
        </span>

        {slot && (
          <span className={`${slot.text} text-[10px] font-semibold uppercase tracking-wider w-14 shrink-0`}>
            {slot.label}
          </span>
        )}

        <OverflowMarquee text={label} className="flex-1 text-sm text-ui-text" />

        {canEdit && (
          <DeleteConfirmButton
            onConfirm={() => onDelete(song.id)}
            className="text-sm shrink-0"
            title="Delete song"
            confirmMessage={`Delete "${label}"?`}
          />
        )}
      </div>
    </div>
  );
}
