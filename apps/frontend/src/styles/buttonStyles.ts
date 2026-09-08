export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ui-canvas";

export const btnPrimary = `rounded border border-ui-border-strong bg-ui-raised px-3 py-2 font-semibold text-ui-text transition-colors hover:bg-ui-selected disabled:opacity-50 ${focusRing}`;

export const btnSecondary = `rounded border border-ui-border bg-ui-surface px-3 py-2 text-ui-text-soft transition-colors hover:bg-ui-raised hover:text-ui-text disabled:opacity-50 ${focusRing}`;

export const btnDanger = `rounded border border-state-failed/40 px-3 py-2 text-state-failed transition-colors hover:bg-state-failed/10 disabled:opacity-50 ${focusRing}`;

export const btnGhost = `rounded px-3 py-2 text-ui-text-soft transition-colors hover:bg-ui-raised hover:text-ui-text disabled:opacity-50 ${focusRing}`;

export const btnTrash =
  "inline-flex items-center justify-center rounded p-2 -m-1 text-ui-text-mute transition-colors hover:bg-state-failed/10 hover:text-state-failed disabled:opacity-50";

export const btnCreate = `border-dashed border-ui-border-strong text-ui-text-soft transition-colors hover:bg-ui-raised hover:text-ui-text disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

export const btnCreateIcon =
  "text-ui-text-mute transition-colors hover:text-ui-text disabled:cursor-not-allowed disabled:opacity-50";
