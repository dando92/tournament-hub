import { createPortal } from "react-dom";
import { DragDropContext, Draggable, Droppable, type DropResult } from "react-beautiful-dnd";
import type { MatchSummaryDto } from "@tournament-hub/contracts";

import { focusRing } from "@/styles/buttonStyles";

export type EditableScheduleEntry = {
    match: MatchSummaryDto;
    expectedDurationMinutes: number;
};

type Props = {
    assigned: EditableScheduleEntry[];
    unassigned: MatchSummaryDto[];
    defaultExpectedDurationMinutes: number;
    editableDurations?: boolean;
    onAssignedChange: (entries: EditableScheduleEntry[]) => void;
    onUnassignedChange: (matches: MatchSummaryDto[]) => void;
};

export default function ControlRoomMatchAssignment({
    assigned,
    unassigned,
    defaultExpectedDurationMinutes,
    editableDurations = true,
    onAssignedChange,
    onUnassignedChange,
}: Props) {
    function move(result: DropResult) {
        if (!result.destination) return;
        const sourceId = result.source.droppableId;
        const destinationId = result.destination.droppableId;

        if (sourceId === "assigned" && destinationId === "assigned") {
            const next = [...assigned];
            const [entry] = next.splice(result.source.index, 1);
            next.splice(result.destination.index, 0, entry);
            onAssignedChange(next);
            return;
        }
        if (sourceId === "unassigned" && destinationId === "unassigned") {
            const next = [...unassigned];
            const [match] = next.splice(result.source.index, 1);
            next.splice(result.destination.index, 0, match);
            onUnassignedChange(next);
            return;
        }
        if (sourceId === "unassigned") {
            const source = [...unassigned];
            const [match] = source.splice(result.source.index, 1);
            const destination = [...assigned];
            destination.splice(result.destination.index, 0, { match, expectedDurationMinutes: defaultExpectedDurationMinutes });
            onUnassignedChange(source);
            onAssignedChange(destination);
            return;
        }

        const source = [...assigned];
        const [entry] = source.splice(result.source.index, 1);
        const destination = [...unassigned];
        destination.splice(result.destination.index, 0, entry.match);
        onAssignedChange(source);
        onUnassignedChange(destination);
    }

    return (
        <DragDropContext onDragEnd={move}>
            <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-2">
                <AssignedColumn
                    entries={assigned}
                    onChange={onAssignedChange}
                    editableDurations={editableDurations}
                    onRemove={(entry) => {
                        onAssignedChange(assigned.filter((candidate) => candidate.match.id !== entry.match.id));
                        onUnassignedChange([...unassigned, entry.match]);
                    }}
                />
                <UnassignedColumn
                    matches={unassigned}
                    onAdd={(match) => {
                        onUnassignedChange(unassigned.filter((candidate) => candidate.id !== match.id));
                        onAssignedChange([...assigned, { match, expectedDurationMinutes: defaultExpectedDurationMinutes }]);
                    }}
                />
            </div>
        </DragDropContext>
    );
}

function AssignedColumn({
    entries,
    onChange,
    onRemove,
    editableDurations,
}: {
    entries: EditableScheduleEntry[];
    onChange: (entries: EditableScheduleEntry[]) => void;
    onRemove: (entry: EditableScheduleEntry) => void;
    editableDurations: boolean;
}) {
    return (
        <Droppable droppableId="assigned">
            {(provided) => (
                <section className="rounded-lg border border-ui-border bg-ui-raised p-3">
                    <ColumnTitle title="Schedule order" count={entries.length} />
                    <div ref={provided.innerRef} {...provided.droppableProps} className="flex min-h-40 flex-col gap-2">
                        {entries.map((entry, index) => (
                            <Draggable key={entry.match.id} draggableId={`match-${entry.match.id}`} index={index}>
                                {(drag, snapshot) => {
                                    const row = (
                                        <div
                                            ref={drag.innerRef}
                                            {...drag.draggableProps}
                                            {...drag.dragHandleProps}
                                            aria-label={`Drag ${entry.match.name}`}
                                            className={`flex cursor-grab items-center gap-2 rounded border border-ui-border bg-ui-surface px-3 py-2 active:cursor-grabbing ${snapshot.isDragging ? "shadow-lg" : ""}`}
                                            style={{ ...drag.draggableProps.style, zIndex: snapshot.isDragging ? 10000 : undefined }}
                                        >
                                            <span aria-hidden="true" className="text-ui-text-mute">⋮⋮</span>
                                            <span className="min-w-0 flex-1 truncate text-sm text-ui-text">{entry.match.name}</span>
                                            {editableDurations && <label className="flex items-center gap-1 text-xs text-ui-text-mute">
                                                <span className="sr-only">Expected duration for {entry.match.name}</span>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={1440}
                                                    value={entry.expectedDurationMinutes}
                                                    onChange={(event) => {
                                                        const minutes = Math.max(1, Math.min(1440, Number(event.target.value)));
                                                        onChange(entries.map((candidate) => candidate.match.id === entry.match.id
                                                            ? { ...candidate, expectedDurationMinutes: minutes }
                                                            : candidate));
                                                    }}
                                                    className={`w-16 rounded border border-ui-border bg-ui-canvas px-2 py-1 text-right text-ui-text ${focusRing}`}
                                                />
                                                min
                                            </label>}
                                            <button type="button" onClick={() => onRemove(entry)} className="text-xs text-ui-text-soft">Remove</button>
                                        </div>
                                    );
                                    return snapshot.isDragging ? createPortal(row, document.body) : row;
                                }}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                        {entries.length === 0 && <EmptyColumn />}
                    </div>
                </section>
            )}
        </Droppable>
    );
}

function UnassignedColumn({ matches, onAdd }: { matches: MatchSummaryDto[]; onAdd: (match: MatchSummaryDto) => void }) {
    return (
        <Droppable droppableId="unassigned">
            {(provided) => (
                <section className="rounded-lg border border-ui-border bg-ui-raised p-3">
                    <ColumnTitle title="Unassigned" count={matches.length} />
                    <div ref={provided.innerRef} {...provided.droppableProps} className="flex min-h-40 flex-col gap-2">
                        {matches.map((match, index) => (
                            <Draggable key={match.id} draggableId={`match-${match.id}`} index={index}>
                                {(drag, snapshot) => {
                                    const row = (
                                        <div
                                            ref={drag.innerRef}
                                            {...drag.draggableProps}
                                            {...drag.dragHandleProps}
                                            aria-label={`Drag ${match.name}`}
                                            className={`flex cursor-grab items-center gap-2 rounded border border-ui-border bg-ui-surface px-3 py-2 active:cursor-grabbing ${snapshot.isDragging ? "shadow-lg" : ""}`}
                                            style={{ ...drag.draggableProps.style, zIndex: snapshot.isDragging ? 10000 : undefined }}
                                        >
                                            <span aria-hidden="true" className="text-ui-text-mute">⋮⋮</span>
                                            <span className="min-w-0 flex-1 truncate text-sm text-ui-text">{match.name}</span>
                                            <button type="button" onClick={() => onAdd(match)} className="text-xs text-ui-text-soft">Add</button>
                                        </div>
                                    );
                                    return snapshot.isDragging ? createPortal(row, document.body) : row;
                                }}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                        {matches.length === 0 && <EmptyColumn />}
                    </div>
                </section>
            )}
        </Droppable>
    );
}

function ColumnTitle({ title, count }: { title: string; count: number }) {
    return <h3 className="mb-2 font-semibold text-ui-text">{title} <span className="text-xs font-normal text-ui-text-mute">({count})</span></h3>;
}

function EmptyColumn() {
    return <p className="py-6 text-center text-sm text-ui-text-mute">Drop matches here.</p>;
}
