import { MouseEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { focusRing } from '@/styles/buttonStyles';


type ParticipantMembershipRowProps = {
    name: string;
    present: boolean;
    canEdit: boolean;
    selecting: boolean;
    selected: boolean;
    onActivate: (extend: boolean) => void;
};

export default function ParticipantMembershipRow({ name, present, canEdit, selecting, selected, onActivate }: ParticipantMembershipRowProps) {
    const action = present ? 'Remove' : 'Add';

    if (!canEdit) {
        return (
            <div className={`flex items-center gap-3 rounded border-l-[3px] border-transparent px-3 py-2 text-sm ${present ? 'bg-ui-raised text-ui-text' : 'bg-ui-raised/50 text-ui-text-mute'}`}>
                <MembershipMark present={present} />
                <span className="truncate">{name}</span>
            </div>
        );
    }

    const activate = (event: MouseEvent<HTMLButtonElement>) => onActivate(event.shiftKey);
    const surface = selected ? 'bg-ui-selected' : present ? 'bg-ui-raised hover:bg-ui-selected' : 'bg-ui-raised/50 hover:bg-ui-selected';

    return (
        <button
            type="button"
            onClick={activate}
            role={selecting ? 'checkbox' : undefined}
            aria-checked={selecting ? selected : undefined}
            aria-pressed={selecting ? undefined : present}
            aria-label={selecting ? name : `${action} ${name}`}
            title={selecting ? undefined : `${action} ${name}`}
            className={`group flex w-full items-center gap-3 rounded border-l-[3px] px-3 py-2 text-left text-sm transition-colors ${focusRing} ${surface} ${
                selected ? 'border-ui-accent font-semibold' : 'border-transparent'
            } ${present ? 'text-ui-text' : 'text-ui-text-mute'}`}
        >
            {selecting && <SelectionBox selected={selected} />}
            <MembershipMark present={present} />
            <span className="truncate">{name}</span>
            {!selecting && (
                <span className="ml-auto hidden shrink-0 pl-2 text-xs text-ui-text-soft opacity-0 transition-opacity group-hover:opacity-100 sm:inline">{action}</span>
            )}
        </button>
    );
}

function MembershipMark({ present }: { present: boolean }) {
    return (
        <span className="w-4 shrink-0 text-center text-xs" aria-hidden>
            {present && <FontAwesomeIcon icon={faCheck} />}
        </span>
    );
}

function SelectionBox({ selected }: { selected: boolean }) {
    return (
        <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border text-[10px] ${
                selected ? 'border-ui-accent bg-ui-accent text-ui-accent-contrast' : 'border-ui-border-strong'
            }`}
            aria-hidden
        >
            {selected && <FontAwesomeIcon icon={faCheck} />}
        </span>
    );
}
