import assert from "node:assert/strict";
import test from "node:test";
import { isAdvancementSourceTarget, validateAdvancementRules } from "@/features/match/model/advancementRuleValidation";

test("identifies a match or phase group targeting itself", () => {
    assert.equal(isAdvancementSourceTarget("match", 10, "match", 10), true);
    assert.equal(isAdvancementSourceTarget("phase_group", 20, "phase_group", 20), true);
    assert.equal(isAdvancementSourceTarget("match", 10, "phase_group", 10), false);
});

test("rejects duplicate source placements", () => {
    const errors = validateAdvancementRules([
        { sourcePlacement: 1, targetKind: "match", targetId: 20, targetSlot: 1 },
        { sourcePlacement: 1, targetKind: "match", targetId: 30, targetSlot: 1 },
    ], "match", 10);

    assert.deepEqual(errors, ["Rule 2: finishing place is already used."]);
});

test("rejects self-targets for matches and phase groups", () => {
    assert.deepEqual(
        validateAdvancementRules([
            { sourcePlacement: 1, targetKind: "match", targetId: 10, targetSlot: 1 },
        ], "match", 10),
        ["Rule 1: source cannot target itself."],
    );
    assert.deepEqual(
        validateAdvancementRules([
            { sourcePlacement: 1, targetKind: "phase_group", targetId: 20, targetSlot: 1 },
        ], "phase_group", 20),
        ["Rule 1: source cannot target itself."],
    );
});
