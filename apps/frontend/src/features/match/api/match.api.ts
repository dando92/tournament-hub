import axios from "axios";
import { Match, Score, CommitMatchResultResponse, CreateMatchRequest, RoundSourceRequest } from "@/features/match/model/types";

const confirmationHeaders = { "x-confirm-schedule-stop": "true" };

export class AdvancementRollbackBlockedError extends Error {}

async function withControlRoomStopConfirmation(request: (confirmed: boolean) => Promise<void>): Promise<boolean> {
  try {
    await request(false);
    return true;
  } catch (error) {
    const response = (error as { response?: { data?: { code?: string; message?: string } } })?.response;
    if (response?.data?.code !== "SCHEDULE_STOP_CONFIRMATION_REQUIRED") throw error;
    if (!window.confirm(`${response.data.message ?? "This change will stop a running schedule."} Continue?`)) return false;
    await request(true);
    return true;
  }
}

export async function listByDivision(divisionId: number): Promise<Match[]> {
  try {
    const response = await axios.get<Match[]>(`matches/division/${divisionId}`);
    return response.data;
  } catch (error) {
    console.error("Error listing matches by division:", error);
    throw new Error("Unable to list matches by division.");
  }
}

export async function listByPhaseGroup(phaseGroupId: number): Promise<Match[]> {
  try {
    const response = await axios.get<Match[]>(`matches/phase-group/${phaseGroupId}`);
    return response.data;
  } catch (error) {
    console.error("Error listing matches by pool:", error);
    throw new Error("Unable to list matches by pool.");
  }
}

export async function create(request: CreateMatchRequest): Promise<number> {
  try {
    const response = await axios.post<{ id: number }>("matches", {
      name: request.name,
      subtitle: request.subtitle,
      notes: request.notes,
      entrantIds: request.entrantIds,
      scoringSystem: request.scoringSystem,
      phaseGroupId: request.phaseGroupId,
      group: request.group,
      levels: request.levels,
      songIds: request.songIds,
    });
    return response.data.id;
  } catch (error) {
    console.error("Error creating match:", error);
    throw new Error("Unable to create match.");
  }
}

export async function getMatch(matchId: number): Promise<Match> {
  try {
    const response = await axios.get<Match>(`matches/${matchId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching match:", error);
    throw new Error("Unable to fetch match.");
  }
}

export async function editMatchNotes(matchId: number, notes: string): Promise<void> {
  try {
    await axios.patch(`matches/${matchId}`, { notes });
  } catch (error) {
    console.error("Error editing match notes:", error);
    throw new Error("Unable to edit match notes.");
  }
}

export async function renameMatch(matchId: number, name: string): Promise<void> {
  try {
    await axios.patch(`matches/${matchId}`, { name });
  } catch (error) {
    console.error("Error renaming match:", error);
    throw new Error("Unable to rename match.");
  }
}

export async function updateMatchScoringSystem(matchId: number, scoringSystem: string): Promise<void> {
  try {
    await axios.patch(`matches/${matchId}`, { scoringSystem });
  } catch (error) {
    console.error("Error updating match scoring system:", error);
    throw new Error("Unable to update the match scoring system.");
  }
}

export async function updateMatchEntrants(matchId: number, entrantIds: number[]): Promise<void> {
  try {
    await withControlRoomStopConfirmation((confirmed) => axios.patch(
      `matches/${matchId}`,
      { entrantIds },
      confirmed ? { headers: confirmationHeaders } : undefined,
    ).then(() => undefined));
  } catch (error) {
    console.error("Error updating match entrants:", error);
    throw new Error("Unable to update match entrants.");
  }
}

export async function deleteMatch(matchId: number): Promise<void> {
  try {
    await withControlRoomStopConfirmation((confirmed) => axios.delete(
      `matches/${matchId}`,
      confirmed ? { headers: confirmationHeaders } : undefined,
    ).then(() => undefined));
  } catch (error) {
    console.error("Error deleting match:", error);
    throw new Error("Unable to delete match.");
  }
}

export async function addRound(matchId: number, source: RoundSourceRequest = {}): Promise<void> {
  try {
    await withControlRoomStopConfirmation((confirmed) => axios.post(
      `matches/${matchId}/rounds`,
      source,
      confirmed ? { headers: confirmationHeaders } : undefined,
    ).then(() => undefined));
  } catch (error) {
    console.error("Error adding round to match:", error);
    throw new Error("Unable to add a round to the match.");
  }
}

export async function deleteRound(roundId: number): Promise<void> {
  try {
    await withControlRoomStopConfirmation((confirmed) => axios.delete(
      `rounds/${roundId}`,
      confirmed ? { headers: confirmationHeaders } : undefined,
    ).then(() => undefined));
  } catch (error) {
    console.error("Error deleting round:", error);
    throw new Error("Unable to delete the round.");
  }
}

export async function replaceRoundSong(roundId: number, source: RoundSourceRequest): Promise<void> {
  try {
    await withControlRoomStopConfirmation((confirmed) => axios.put(
      `rounds/${roundId}`,
      source,
      confirmed ? { headers: confirmationHeaders } : undefined,
    ).then(() => undefined));
  } catch (error) {
    console.error("Error replacing the song of a round:", error);
    throw new Error("Unable to replace the song of the round.");
  }
}

export async function upsertScore(
  roundId: number,
  playerId: number,
  score: { percentage: number; isFailed: boolean; scoreId?: number },
): Promise<void> {
  try {
    await axios.put(`rounds/${roundId}/scores/${playerId}`, score);
  } catch (error) {
    console.error("Error saving a score:", error);
    throw new Error("Unable to save the score.");
  }
}

export async function upsertPoints(roundId: number, playerId: number, points: number): Promise<void> {
  try {
    await withControlRoomStopConfirmation((confirmed) => axios.put(
      `rounds/${roundId}/points/${playerId}`,
      { points },
      confirmed ? { headers: confirmationHeaders } : undefined,
    ).then(() => undefined));
  } catch (error) {
    console.error("Error saving points:", error);
    throw new Error("Unable to save the points.");
  }
}

export async function deleteStanding(roundId: number, playerId: number): Promise<void> {
  try {
    await withControlRoomStopConfirmation((confirmed) => axios.delete(
      `rounds/${roundId}/standings/${playerId}`,
      confirmed ? { headers: confirmationHeaders } : undefined,
    ).then(() => undefined));
  } catch (error) {
    console.error("Error deleting a standing:", error);
    throw new Error("Unable to delete the standing.");
  }
}

export async function listScores(songId: number, playerId: number): Promise<Score[]> {
  try {
    const response = await axios.get<Score[]>("scores", {
      params: { songId, playerId },
    });
    return response.data;
  } catch (error) {
    console.error("Error listing scores:", error);
    throw new Error("Unable to list scores.");
  }
}

export async function updateMatchActive(matchId: number, active: boolean): Promise<void> {
  try {
    await axios.put(`matches/${matchId}/active`, { active });
  } catch (error) {
    console.error("Error updating match active state:", error);
    throw new Error("Unable to update match active state.");
  }
}

export async function commitMatchResult(matchId: number): Promise<CommitMatchResultResponse> {
  try {
    const response = await axios.put<CommitMatchResultResponse>(`matches/${matchId}/result`, {});
    return response.data;
  } catch (error) {
    console.error("Error committing match result:", error);
    throw new Error("Unable to commit match result.");
  }
}

export async function reopenMatchResult(matchId: number): Promise<boolean> {
  try {
    return await withControlRoomStopConfirmation((confirmed) => axios.delete(
      `matches/${matchId}/result`,
      confirmed ? { headers: confirmationHeaders } : undefined,
    ).then(() => undefined));
  } catch (error) {
    console.error("Error re-opening match result:", error);
    const response = (error as { response?: { data?: { code?: string; message?: string } } })?.response;
    if (response?.data?.code === "ADVANCEMENT_ROLLBACK_BLOCKED_BY_TARGET_PROGRESS") {
      throw new AdvancementRollbackBlockedError(response.data.message ?? "An affected advancement target already has scores or a committed result.");
    }
    throw new Error("Unable to re-open match result.");
  }
}

export async function createTiebreak(matchId: number, playerIds: number[], songId?: number): Promise<number> {
  const response = await axios.post<{ id: number }>(`matches/${matchId}/tiebreaks`, {
    playerIds,
    ...(songId ? { songId } : {}),
  });
  return response.data.id;
}

export async function deleteTiebreak(matchId: number, tiebreakId: number): Promise<void> {
  await axios.delete(`matches/${matchId}/tiebreaks/${tiebreakId}`);
}

export async function upsertTiebreakScore(
  matchId: number,
  tiebreakId: number,
  playerId: number,
  score: { percentage: number; isFailed: boolean; scoreId?: number },
): Promise<void> {
  await axios.put(`matches/${matchId}/tiebreaks/${tiebreakId}/scores/${playerId}`, score);
}

export async function upsertTiebreakPoints(matchId: number, tiebreakId: number, playerId: number, points: number): Promise<void> {
  await axios.put(`matches/${matchId}/tiebreaks/${tiebreakId}/points/${playerId}`, { points });
}

export async function clearTiebreakStanding(matchId: number, tiebreakId: number, playerId: number): Promise<void> {
  await axios.delete(`matches/${matchId}/tiebreaks/${tiebreakId}/standings/${playerId}`);
}

export async function listScoringSystems(): Promise<string[]> {
  const response = await axios.get<string[]>("matches/scoring-systems");
  return response.data;
}
