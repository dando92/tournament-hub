const GRADIENTS = [
  "from-[#1E3A5F] to-[#2E6F8E]",
  "from-[#4A1E5F] to-[#9A3D8E]",
  "from-[#5F2D1E] to-[#C2761A]",
  "from-[#12403A] to-[#2E8F6F]",
  "from-[#3B1D5C] to-[#7E22CE]",
  "from-[#0E3B52] to-[#1F8DDE]",
];

function gradientOf(pack: string): string {
  const sum = [...pack].reduce((total, character) => total + character.charCodeAt(0), 0);

  return GRADIENTS[sum % GRADIENTS.length];
}

export default function PackBanner({ pack, summary }: { pack: string; summary: string }) {
  return (
    <div className={`relative flex h-[92px] items-end bg-gradient-to-br px-4 py-3 ${gradientOf(pack)}`}>
      <svg viewBox="0 0 1400 92" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full opacity-25" aria-hidden="true">
        <path d="M0 92 74 0h36L36 92ZM160 92 234 0h22l-74 92ZM380 92 454 0h46l-74 92ZM700 92 774 0h30l-74 92ZM1010 92 1084 0h40l-74 92Z" fill="#FFFFFF" />
      </svg>
      <span className="absolute right-2.5 top-2 rounded border border-white/40 px-1.5 py-px text-[8.5px] font-bold uppercase tracking-[0.10em] text-white/70">
        Placeholder art
      </span>
      <span className="relative truncate text-lg font-extrabold tracking-tight text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">{pack}</span>
      <span className="relative ml-3 shrink-0 text-[11.5px] font-semibold text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">{summary}</span>
    </div>
  );
}
