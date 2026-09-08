import test from "node:test";
import assert from "node:assert/strict";

import { refsIn, spellReason } from "../../src/features/structure/model/planReasons.ts";


test("a reason gives up the nodes it is about, drafted ones included", () => {
    assert.deepEqual(refsIn("phase:-1 is a phase and cannot hang from a phase."), ["phase:-1"]);
    assert.deepEqual(refsIn("A route joins pool:3 to match:-12, which the plan does not carry."), ["pool:3", "match:-12"]);
    assert.deepEqual(refsIn("The structure changed while this plan was open."), []);
});

test("a reason reads as its words and its nodes, in the order it was written", () => {
    const pieces = spellReason("match:-2 would be written into pool:7, which the plan does not leave standing.");

    assert.deepEqual(
        pieces.map((piece) => piece.ref ?? piece.text),
        ["match:-2", " would be written into ", "pool:7", ", which the plan does not leave standing."],
    );
    assert.deepEqual(
        pieces.filter((piece) => piece.ref).map((piece) => piece.text),
        ["match:-2", "pool:7"],
    );
});

test("a sentence with nothing to point at is still a sentence", () => {
    assert.deepEqual(spellReason("That change could not be saved."), [{ text: "That change could not be saved." }]);
});
