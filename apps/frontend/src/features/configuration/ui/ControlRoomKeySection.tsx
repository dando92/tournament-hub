import { btnDanger, btnPrimary, btnSecondary } from "@/styles/buttonStyles";
import { ControlRoomKeyStatus } from "@/features/tournament/model/types";
import { useControlRoomKey } from "@/features/tournament/model/useControlRoomKey";

export default function ControlRoomKeySection({
  tournamentId,
  status,
  disabled,
}: {
  tournamentId: number;
  status: ControlRoomKeyStatus;
  disabled: boolean;
}) {
  const { issuedKey, copied, issuing, revoking, issue, revoke, copy } = useControlRoomKey(tournamentId);

  return (
    <section className="mt-6 rounded-lg border border-ui-border bg-ui-canvas p-4">
      <h3 className="text-sm font-bold text-ui-text">Lobby control room</h3>
      <p className="mt-1 text-sm text-ui-text-mute">
        A control room reads what may be played and reports what was played. One key pairs one venue with this
        tournament, and stops working when the tournament closes.
      </p>

      <dl className="mt-3 grid gap-1 text-sm">
        <div className="flex gap-2">
          <dt className="text-ui-text-mute">Key</dt>
          <dd className="text-ui-text">{status.hasKey ? `Issued ${formatMoment(status.issuedAt)}` : "None issued"}</dd>
        </div>
        {status.hasKey && (
          <div className="flex gap-2">
            <dt className="text-ui-text-mute">Last used</dt>
            <dd className="text-ui-text">{status.lastUsedAt ? formatMoment(status.lastUsedAt) : "Never"}</dd>
          </div>
        )}
      </dl>

      {issuedKey && (
        <div className="mt-3 rounded border border-state-pending/30 bg-state-pending/10 p-3">
          <p className="text-sm text-ui-text-soft">
            Copy it now. It is stored hashed, so this is the only time it can be read.
          </p>
          <code className="mt-2 block break-all rounded border border-ui-border bg-ui-surface px-2 py-1 font-mono text-xs text-ui-text">
            {issuedKey}
          </code>
          <button type="button" onClick={copy} className={`${btnSecondary} mt-2 text-sm`}>
            {copied ? "Copied" : "Copy key"}
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => issue(status.hasKey)}
          disabled={disabled || issuing}
          className={`${btnPrimary} text-sm disabled:cursor-not-allowed`}
        >
          {issuing ? "Generating..." : status.hasKey ? "Generate new key" : "Generate key"}
        </button>
        {status.hasKey && (
          <button type="button" onClick={revoke} disabled={revoking} className={`${btnDanger} text-sm`}>
            {revoking ? "Revoking..." : "Revoke key"}
          </button>
        )}
      </div>
    </section>
  );
}

function formatMoment(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}
