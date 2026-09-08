import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as MatchesApi from "@/features/match/api/match.api";
import { matchKeys } from "@/features/match/api/match.keys";
import { updateAdvancementRulesForSource } from "@/features/match/api/advancement-rule.api";
import { CreateMatchRequest, MatchAdvancementRuleInput, RoundSourceRequest } from "@/features/match/model/types";
import { usePageNotices } from "@/shared/context/PageNoticeContext";

export function useMatches(divisionId: number, phaseGroupId?: number) {
  const queryClient = useQueryClient();
  const { report, dismiss } = usePageNotices();
  const queryKey = useMemo(
    () => (phaseGroupId !== undefined ? matchKeys.byPhaseGroup(phaseGroupId) : matchKeys.byDivision(divisionId)),
    [divisionId, phaseGroupId],
  );
  const query = useQuery({
    queryKey,
    queryFn: () => phaseGroupId !== undefined
      ? MatchesApi.listByPhaseGroup(phaseGroupId)
      : MatchesApi.listByDivision(divisionId),
  });

  async function run(work: () => Promise<void>, failure: string): Promise<void> {
    try {
      await work();
      dismiss(failure);
    } catch (error) {
      console.error(failure, error);
      report(failure);
      throw error;
    }
  }

  async function list() {
    await queryClient.invalidateQueries({ queryKey, exact: true });
  }

  return {
    matches: query.data ?? [],
    loading: query.isLoading,
    actions: {
      list,


      create: (request: CreateMatchRequest) => MatchesApi.create(request),

      editMatchNotes: (matchId: number, notes: string) => MatchesApi.editMatchNotes(matchId, notes),

      updateMatchScoringSystem: (matchId: number, scoringSystem: string) =>
        MatchesApi.updateMatchScoringSystem(matchId, scoringSystem),

      updateMatchEntrants: (matchId: number, entrantIds: number[]) => MatchesApi.updateMatchEntrants(matchId, entrantIds),

      replaceRoundSong: (roundId: number, source: RoundSourceRequest) => MatchesApi.replaceRoundSong(roundId, source),


      renameMatch: (matchId: number, name: string) =>
        run(() => MatchesApi.renameMatch(matchId, name), "Error renaming match."),

      deleteMatch: (matchId: number) =>
        run(() => MatchesApi.deleteMatch(matchId), "Error deleting match."),

      addRound: (matchId: number, source: RoundSourceRequest = {}) =>
        run(() => MatchesApi.addRound(matchId, source), "Error adding a round to the match."),

      deleteRound: (roundId: number) =>
        run(() => MatchesApi.deleteRound(roundId), "Error deleting the round."),

      saveScore: (
        playerId: number,
        roundId: number,
        score: { percentage: number; isFailed: boolean; scoreId?: number },
      ) => run(() => MatchesApi.upsertScore(roundId, playerId, score), "Error saving the score."),

      savePoints: (playerId: number, roundId: number, points: number) =>
        run(() => MatchesApi.upsertPoints(roundId, playerId, points), "Error saving the points."),

      deleteStanding: (playerId: number, roundId: number) =>
        run(() => MatchesApi.deleteStanding(roundId, playerId), "Error deleting the standing."),

      createTiebreak: (matchId: number, playerIds: number[], songId?: number) =>
        run(() => MatchesApi.createTiebreak(matchId, playerIds, songId).then(() => undefined), "Error creating the tiebreak."),

      deleteTiebreak: (matchId: number, tiebreakId: number) =>
        run(() => MatchesApi.deleteTiebreak(matchId, tiebreakId), "Error deleting the tiebreak."),

      saveTiebreakScore: (
        matchId: number,
        tiebreakId: number,
        playerId: number,
        score: { percentage: number; isFailed: boolean; scoreId?: number },
      ) => run(() => MatchesApi.upsertTiebreakScore(matchId, tiebreakId, playerId, score), "Error saving the tiebreak score."),

      saveTiebreakPoints: (matchId: number, tiebreakId: number, playerId: number, points: number) =>
        run(() => MatchesApi.upsertTiebreakPoints(matchId, tiebreakId, playerId, points), "Error saving the tiebreak points."),

      clearTiebreakStanding: (matchId: number, tiebreakId: number, playerId: number) =>
        run(() => MatchesApi.clearTiebreakStanding(matchId, tiebreakId, playerId), "Error clearing the tiebreak standing."),

      updateMatchAdvancementRules: (matchId: number, rules: MatchAdvancementRuleInput[]) =>
        run(
          () => updateAdvancementRulesForSource("match", matchId, rules),
          "Error updating match advancement rules.",
        ),

      updateMatchActive: (matchId: number, active: boolean) =>
        run(() => MatchesApi.updateMatchActive(matchId, active), "Error updating match active state."),

      commitMatchResult: (matchId: number) =>
        run(async () => {
          const { startggReport } = await MatchesApi.commitMatchResult(matchId);
          if (startggReport === "failed") {
            report("Match completed, but reporting the result to start.gg failed.", {
              tone: "warning",
              detail: "The bracket here is correct. The one on start.gg is not.",
            });
          }
        }, "Error committing match result."),

      reopenMatchResult: (matchId: number) =>
        run(async () => {
          try {
            await MatchesApi.reopenMatchResult(matchId);
          } catch (error) {
            if (error instanceof MatchesApi.AdvancementRollbackBlockedError) {
              report(error.message);
              return;
            }
            throw error;
          }
        }, "Error re-opening match."),
    },
  };
}
