import test from "node:test";
import assert from "node:assert/strict";

import { getMatchCommitState, getMatchProgress, getMatchProgressLabel } from "../../src/features/match/model/matchStatus.ts";
import type { Match } from "../../src/features/match/model/types.ts";

const TIE = { playerIds: [101, 102], fromPlacement: 1, toPlacement: 2 };

function match(status: Match["resultState"]["status"], tiebreaks: Match["tiebreaks"] = []): Match {
  return {
    id: 1,
    name: "Match",
    subtitle: "",
    notes: "",
    scoringSystem: "PlacementPointsWithFailZero",
    active: false,
    entrants: [],
    rounds: [{ id: 1, song: null, standings: [] }],
    tiebreaks,
    advancementRules: [],
    resultState: { status, entries: [], ambiguousTies: status === "tiebreak_required" ? [TIE] : [] },
    matchResult: null,
    phaseGroupId: 1,
  };
}

function handScoredAttempt(points: Array<number | null>): Match["tiebreaks"] {
  return [{
    id: 50,
    sequence: 1,
    invalidated: false,
    song: null,
    standings: TIE.playerIds.map((playerId, index) => ({
      id: 500 + index,
      player: { id: playerId, playerName: `Player ${playerId}` },
      score: null,
      manualPoints: points[index],
    })),
  }];
}

test("shows the tiebreak action instead of commit for an ambiguous placement", () => {
  const tied = match("tiebreak_required");

  assert.equal(getMatchProgress(tied), "tiebreakRequired");
  assert.equal(getMatchProgressLabel("tiebreakRequired"), "Tiebreak required");
  assert.equal(getMatchCommitState(tied), "Tiebreak");
});

test("stops offering a tiebreak once one is on the table", () => {
  const attempted = match("tiebreak_required", handScoredAttempt([0, 0]));

  assert.equal(getMatchProgress(attempted), "tiebreakInProgress");
  assert.equal(getMatchProgressLabel("tiebreakInProgress"), "Tiebreak in progress");
  assert.equal(getMatchCommitState(attempted), "Tiebreak");
});

test("keeps the attempt in progress while its values separate nobody", () => {
  assert.equal(getMatchProgress(match("tiebreak_required", handScoredAttempt([1, 1]))), "tiebreakInProgress");
});

test("offers a tiebreak again once the attempt on the table was invalidated", () => {
  const attempts = handScoredAttempt([1, 0]);
  attempts[0].invalidated = true;

  assert.equal(getMatchProgress(match("tiebreak_required", attempts)), "tiebreakRequired");
});

test("uses the server result state as the commit authority", () => {
  assert.equal(getMatchCommitState(match("ready")), "Pending");
  assert.equal(getMatchCommitState(match("incomplete")), "Disabled");
});
