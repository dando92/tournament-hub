
type ModalErrorsProps = {
    errors: string[];
    tone: 'waiting' | 'asked';
};

export default function ModalErrors({ errors, tone }: ModalErrorsProps) {
    if (errors.length === 0) {
        return null;
    }

    const skin = tone === 'asked' ? 'border-state-failed/40 text-state-failed' : 'border-ui-border text-ui-text-mute';

    return (
        <div className={`flex flex-col gap-1 rounded border px-3 py-2 text-xs ${skin}`} role={tone === 'asked' ? 'alert' : undefined} aria-live="polite">
            {errors.map((error) => (
                <p key={error}>{error}</p>
            ))}
        </div>
    );
}
