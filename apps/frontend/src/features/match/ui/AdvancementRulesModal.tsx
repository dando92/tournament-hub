import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { AdvancementCompetitionKind, AdvancementRuleInput, MatchNeighbour } from "@/features/match/model/types";
import { isAdvancementSourceTarget, validateAdvancementRules } from "@/features/match/model/advancementRuleValidation";
import { Division } from "@/features/division/model/types";
import FormModal from "@/shared/components/ui/FormModal";
import Select from "@/shared/components/ui/Select";
import { btnCreate, btnTrash } from "@/styles/buttonStyles";
import { phaseGroupLabel } from "@/features/division/model/phaseGroupLabel";
import { poolsAreVisible } from "@/features/division/model/poolVisibility";

type AdvancementRulesModalProps = {
    open: boolean;
    sourceKind: AdvancementCompetitionKind;
    sourceId: number;
    rules: AdvancementRuleInput[];
    division: Division;
    allMatches: MatchNeighbour[];
    onChange: (rules: AdvancementRuleInput[]) => void;
    onSave: () => Promise<void>;
    onCancel: () => void;
};

type TargetOption = {
    kind: AdvancementCompetitionKind;
    id: number;
    label: string;
};

const numberInputClassName = "min-h-8 w-14 rounded border border-ui-border-strong bg-ui-raised px-2 py-1 text-sm font-medium text-ui-text outline-none focus:ring-2 focus:ring-ui-accent";

export default function AdvancementRulesModal({
    open,
    sourceKind,
    sourceId,
    rules,
    division,
    allMatches,
    onChange,
    onSave,
    onCancel,
}: AdvancementRulesModalProps) {
    const phaseGroups = (division.phases ?? []).flatMap((phase) =>
        (phase.phaseGroups ?? []).map((phaseGroup) => ({
            kind: "phase_group" as const,
            id: phaseGroup.id,
            label: poolsAreVisible(phase) ? `${phase.name} / ${phaseGroupLabel(phaseGroup)}` : phase.name,
        })),
    );
    const phaseGroupLabelById = new Map(phaseGroups.map((phaseGroup) => [phaseGroup.id, phaseGroup.label]));
    const matchOptions: TargetOption[] = [...allMatches]
        .filter((match) => !isAdvancementSourceTarget(sourceKind, sourceId, "match", match.id))
        .sort((left, right) => left.id - right.id)
        .map((match) => ({
            kind: "match",
            id: match.id,
            label: `${phaseGroupLabelById.get(match.phaseGroupId) ?? "Unknown pool"} / ${match.name}`,
        }));
    const phaseGroupOptions: TargetOption[] = phaseGroups.filter((phaseGroup) =>
        !isAdvancementSourceTarget(sourceKind, sourceId, "phase_group", phaseGroup.id),
    );
    const targetOptions = [...matchOptions, ...phaseGroupOptions];
    const sourceLabel = sourceKind === "match"
        ? matchOptionsLabel(allMatches.find((match) => match.id === sourceId), phaseGroupLabelById)
        : phaseGroupLabelById.get(sourceId) ?? `Pool ${sourceId}`;

    const draftRules = rules.map((rule) => ({
        sourcePlacement: rule.sourcePlacement,
        targetKind: rule.targetKind,
        targetId: rule.targetId,
        targetSlot: rule.targetSlot,
    }));

    const updateRule = (index: number, nextRule: AdvancementRuleInput) => {
        onChange(draftRules.map((rule, currentIndex) => (currentIndex === index ? nextRule : rule)));
    };

    const addRule = () => {
        const target = targetOptions[0];
        onChange([
            ...draftRules,
            {
                sourcePlacement: draftRules.length + 1,
                targetKind: target?.kind ?? "match",
                targetId: target?.id ?? 0,
                targetSlot: draftRules.length + 1,
            },
        ]);
    };

    const addAdvancement = (
        <button type="button" className={`${btnCreate} w-full rounded border px-3 py-2 text-sm sm:w-auto`} onClick={addRule}>
            <FontAwesomeIcon icon={faPlus} className="mr-2 text-xs" />
            Add advancement
        </button>
    );

    return (
        <FormModal
            open={open}
            onClose={onCancel}
            title={`Advancement from ${sourceLabel}`}
            confirmText="Save rules"
            validate={() => validateAdvancementRules(draftRules, sourceKind, sourceId)}
            onConfirm={onSave}
            leadingActions={addAdvancement}
            failureFallback="The advancement rules could not be saved."
            maxWidth="max-w-4xl"
            fitViewport
        >
            <div className="flex flex-col">
                <p className="mb-3 text-sm text-ui-text-mute">Choose where each finishing position advances.</p>

                {draftRules.length === 0 ? (
                    <div className="rounded border border-dashed border-ui-border-strong bg-ui-canvas px-4 py-6 text-center text-sm text-ui-text-mute">
                        No advancement rules configured.
                    </div>
                ) : (
                    <div className="divide-y divide-ui-border border-y border-ui-border">
                        {draftRules.map((rule, index) => (
                            <div key={index} className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1.5 py-2.5 text-sm leading-8 text-ui-text-soft">
                                    <InlineNumber
                                        value={rule.sourcePlacement}
                                        ariaLabel={`Rule ${index + 1} finishing place`}
                                        onChange={(sourcePlacement) => updateRule(index, { ...rule, sourcePlacement })}
                                    />
                                    <span>place</span>
                                    <span>advances to</span>
                                    <InlineDestination
                                        rule={rule}
                                        matchOptions={matchOptions}
                                        phaseGroupOptions={phaseGroupOptions}
                                        ariaLabel={`Rule ${index + 1} destination`}
                                        onChange={(targetKind, targetId) => updateRule(index, { ...rule, targetKind, targetId })}
                                    />
                                    <span className="flex w-full items-center gap-1.5 sm:w-auto">
                                        <span>in slot</span>
                                        <InlineNumber
                                            value={rule.targetSlot}
                                                ariaLabel={`Rule ${index + 1} target slot`}
                                            onChange={(targetSlot) => updateRule(index, { ...rule, targetSlot })}
                                        />
                                        <button
                                            type="button"
                                            className={`${btnTrash} ml-auto shrink-0 sm:ml-1`}
                                            onClick={() => onChange(draftRules.filter((_, currentIndex) => currentIndex !== index))}
                                                aria-label={`Delete advancement rule ${index + 1}`}
                                        >
                                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                        </button>
                                    </span>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </FormModal>
    );
}

function InlineNumber({
    value,
    ariaLabel,
    onChange,
}: {
    value: number;
    ariaLabel: string;
    onChange: (value: number) => void;
}) {
    return (
        <input
            type="number"
            min={1}
            step={1}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            className={numberInputClassName}
            aria-label={ariaLabel}
        />
    );
}

function InlineDestination({
    rule,
    matchOptions,
    phaseGroupOptions,
    ariaLabel,
    onChange,
}: {
    rule: AdvancementRuleInput;
    matchOptions: TargetOption[];
    phaseGroupOptions: TargetOption[];
    ariaLabel: string;
    onChange: (kind: AdvancementCompetitionKind, id: number) => void;
}) {
    return (
        <Select
            variant="inline"
            className="min-w-0 max-w-[calc(100vw-9rem)] sm:max-w-[32rem]"
            value={rule.targetId > 0 ? `${rule.targetKind}:${rule.targetId}` : ''}
            onChange={(destination) => {
                if (!destination) {
                    onChange(rule.targetKind, 0);
                    return;
                }
                const [kind, rawId] = destination.split(':');
                onChange(kind as AdvancementCompetitionKind, Number(rawId));
            }}
            options={[
                { value: '', label: 'Select destination' },
                ...(matchOptions.length > 0 ? [{ label: 'Matches', options: matchOptions.map((target) => ({ value: `match:${target.id}`, label: target.label })) }] : []),
                ...(phaseGroupOptions.length > 0
                    ? [{ label: 'Pools', options: phaseGroupOptions.map((target) => ({ value: `phase_group:${target.id}`, label: target.label })) }]
                    : []),
            ]}
            aria-label={ariaLabel}
        />
    );
}

function matchOptionsLabel(match: MatchNeighbour | undefined, phaseGroupLabelById: Map<number, string>): string {
    if (!match) {
        return "Match";
    }
    return `${phaseGroupLabelById.get(match.phaseGroupId) ?? "Unknown pool"} / ${match.name}`;
}
