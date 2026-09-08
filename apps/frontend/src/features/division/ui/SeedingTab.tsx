import { useEffect, useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable, DropResult } from "react-beautiful-dnd";
import SeedingEntrantRow from "@/features/division/ui/SeedingEntrantRow";
import PlayersSearchBar from "@/features/division/ui/PlayersSearchBar";
import { updateDivisionSeeding } from "@/features/division/api/division.api";
import { Division } from "@/features/division/model/types";
import { Entrant } from "@/features/participant/model/types";
import { btnPrimary, btnSecondary } from "@/styles/buttonStyles";
import { usePageNotices } from "@/shared/context/PageNoticeContext";

type SeedingTabProps = {
  division: Division;
  entrants: Entrant[];
  canEdit: boolean;
};

export default function SeedingTab({ division, entrants: roster, canEdit }: SeedingTabProps) {
  const { report, dismiss } = usePageNotices();
  const entrants = useMemo(
    () => roster.filter((entrant) => entrant.status === "active"),
    [roster],
  );
  const entrantsById = useMemo(() => new Map(entrants.map((entrant) => [entrant.id, entrant])), [entrants]);
  const [draftEntrantIds, setDraftEntrantIds] = useState<number[]>(() => entrants.map((entrant) => entrant.id));
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const lowerSearch = search.toLowerCase();

  useEffect(() => {
    setDraftEntrantIds(entrants.map((entrant) => entrant.id));
  }, [entrants]);

  const visibleEntrantIds = useMemo(
    () =>
      draftEntrantIds.filter((entrantId) =>
        (entrantsById.get(entrantId)?.name ?? "").toLowerCase().includes(lowerSearch),
      ),
    [draftEntrantIds, entrantsById, lowerSearch],
  );
  const dirty = useMemo(
    () => draftEntrantIds.some((entrantId, index) => entrants[index]?.id !== entrantId),
    [draftEntrantIds, entrants],
  );

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = [...visibleEntrantIds];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    const reorderedSet = new Set(reordered);
    let visibleIndex = 0;
    setDraftEntrantIds((current) =>
      current.map((entrantId) => (reorderedSet.has(entrantId) ? reordered[visibleIndex++] : entrantId)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDivisionSeeding(division.id, draftEntrantIds);
      dismiss("Error updating division seeding.");
    } catch {
      report("Error updating division seeding.");
    } finally {
      setSaving(false);
    }
  };

  if (entrants.length === 0) {
    return <p className="text-sm text-ui-text-mute italic">No entrants in this division yet.</p>;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <PlayersSearchBar value={search} onChange={setSearch} />

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="division-seeding">
          {(droppableProvided) => (
            <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps} className="flex flex-col gap-1">
              {visibleEntrantIds.map((entrantId, index) => {
                const entrant = entrantsById.get(entrantId);
                if (!entrant) return null;

                const reorderable = canEdit && !saving;

                return (
                  <Draggable
                    key={entrantId}
                    draggableId={`entrant-${entrantId}`}
                    index={index}
                    isDragDisabled={!reorderable}
                  >
                    {(draggableProvided, draggableSnapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        {...draggableProvided.dragHandleProps}
                      >
                        <SeedingEntrantRow
                          name={entrant.name}
                          saving={saving}
                          seedNumber={draftEntrantIds.indexOf(entrantId) + 1}
                          draggable={reorderable}
                          dragging={draggableSnapshot.isDragging}
                        />
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {canEdit && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDraftEntrantIds(entrants.map((entrant) => entrant.id))}
            disabled={!dirty || saving}
            className={`${btnSecondary} text-sm disabled:cursor-not-allowed disabled:opacity-60`}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`${btnPrimary} text-sm disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {saving ? "Saving..." : "Save seeding"}
          </button>
        </div>
      )}
    </div>
  );
}
