import { useEffect, useRef } from 'react';
import { usePageNotices } from '@/shared/context/PageNoticeContext';
import { PageNoticeTone } from '@/shared/lib/pageNotices';
import { focusRing } from '@/styles/buttonStyles';


const TONE: Record<PageNoticeTone, { frame: string; text: string; action: string }> = {
    failure: {
        frame: 'border-state-failed/40 bg-state-failed/10',
        text: 'text-state-failed',
        action: 'border-state-failed/40 text-state-failed hover:bg-state-failed/10',
    },
    warning: {
        frame: 'border-state-pending/40 bg-state-pending/10',
        text: 'text-state-pending',
        action: 'border-state-pending/40 text-state-pending hover:bg-state-pending/10',
    },
};

export default function PageNotices() {
    const { notices, dismiss } = usePageNotices();
    const slot = useRef<HTMLDivElement>(null);
    const shown = notices.map((notice) => `${notice.message}:${notice.count}`).join('|');

    useEffect(() => {
        if (shown.length === 0) {
            return;
        }
        slot.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [shown]);

    if (notices.length === 0) {
        return null;
    }

    return (
        <div ref={slot} className="mb-4 flex flex-col gap-2">
            {notices.map((notice) => {
                const tone = TONE[notice.tone];

                return (
                    <div key={notice.message} role="alert" className={`flex items-start gap-2.5 rounded border px-3 py-2.5 ${tone.frame}`}>
                        <NoticeGlyph tone={notice.tone} />

                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <p className={`text-sm font-semibold ${tone.text}`}>{notice.message}</p>
                            {notice.detail && <p className="text-xs text-ui-text-soft">{notice.detail}</p>}
                        </div>

                        {notice.count > 1 && (
                            <span className="shrink-0 rounded-full border border-ui-border bg-ui-raised px-2 text-xs font-semibold tabular-nums text-ui-text-soft">
                                {notice.count}&times;
                            </span>
                        )}

                        {notice.retry && (
                            <button type="button" onClick={notice.retry} className={`shrink-0 rounded border px-2.5 py-1 text-xs font-semibold transition-colors ${tone.action} ${focusRing}`}>
                                Try again
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => dismiss(notice.message)}
                            aria-label="Dismiss"
                            className={`relative -my-1 -mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded text-ui-text-mute transition-colors before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:bg-ui-raised hover:text-ui-text sm:before:hidden ${focusRing}`}
                        >
                            <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                                <path d="M2.5 2.5 9.5 9.5 M9.5 2.5 2.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

function NoticeGlyph({ tone }: { tone: PageNoticeTone }) {
    return (
        <svg viewBox="0 0 14 14" className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${TONE[tone].text}`} aria-hidden="true">
            <circle cx="7" cy="7" r="6" fill="currentColor" />
            {tone === 'failure' ? (
                <path d="M4.8 4.8 9.2 9.2 M9.2 4.8 4.8 9.2" fill="none" stroke="rgb(var(--ui-surface))" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
                <>
                    <path d="M7 3.8 V7.5" fill="none" stroke="rgb(var(--ui-surface))" strokeWidth="1.6" strokeLinecap="round" />
                    <circle cx="7" cy="9.9" r="0.95" fill="rgb(var(--ui-surface))" />
                </>
            )}
        </svg>
    );
}
