export type PackOption = {
  name: string;
  songs: number;
};

export default function PackTabs({
  packs,
  selected,
  onSelect,
}: {
  packs: PackOption[];
  selected: string | null;
  onSelect: (pack: string | null) => void;
}) {
  if (packs.length < 2) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-ui-border pb-1">
      <Tab label="All packs" count={packs.reduce((total, pack) => total + pack.songs, 0)} selected={selected === null} onClick={() => onSelect(null)} />
      {packs.map((pack) => (
        <Tab key={pack.name} label={pack.name} count={pack.songs} selected={selected === pack.name} onClick={() => onSelect(pack.name)} />
      ))}
    </div>
  );
}

function Tab({ label, count, selected, onClick }: { label: string; count: number; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex max-w-[18rem] items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
        selected
          ? "border-ui-border bg-ui-surface text-ui-text shadow-[inset_0_-3px_0_0_rgb(var(--ui-accent))]"
          : "border-transparent text-ui-text-mute hover:text-ui-text"
      }`}
    >
      <span className="truncate">{label}</span>
      <span className="shrink-0 text-xs font-normal tabular-nums text-ui-text-mute">{count}</span>
    </button>
  );
}
