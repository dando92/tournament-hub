import { Participant } from '@/features/participant/model/types';
import ParticipantMembershipRow from '@/features/division/ui/ParticipantMembershipRow';

type ParticipantMembershipListProps = {
    participants: Participant[];
    divisionParticipantIds: Set<number>;
    canEdit: boolean;
    selecting: boolean;
    selectedIds: Set<number>;
    onActivate: (participant: Participant, extend: boolean) => void;
    emptyMessage: string;
};

export default function ParticipantMembershipList({
    participants,
    divisionParticipantIds,
    canEdit,
    selecting,
    selectedIds,
    onActivate,
    emptyMessage,
}: ParticipantMembershipListProps) {
    if (participants.length === 0) {
        return <p className="text-sm italic text-ui-text-mute">{emptyMessage}</p>;
    }

    return (
        <div className="grid gap-1 md:grid-cols-2 xl:grid-cols-3">
            {participants.map((participant) => (
                <ParticipantMembershipRow
                    key={participant.id}
                    name={participant.player.playerName}
                    present={divisionParticipantIds.has(participant.id)}
                    canEdit={canEdit}
                    selecting={selecting}
                    selected={selectedIds.has(participant.id)}
                    onActivate={(extend) => onActivate(participant, extend)}
                />
            ))}
        </div>
    );
}
