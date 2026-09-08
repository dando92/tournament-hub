import { useEffect, useState } from "react";
import * as MatchesApi from "@/features/match/api/match.api";

export type ScoreOption = {
  id: number;
  percentage: number;
  isFailed: boolean;
};

type UseStandingModalOptions = {
  open: boolean;
  playerId: number;
  songId: number;
  initialPercentage?: number;
  initialScoreId?: number;
  initialIsFailed?: boolean;
};

export function useStandingModal({
  open,
  playerId,
  songId,
  initialPercentage,
  initialScoreId,
  initialIsFailed,
}: UseStandingModalOptions) {
  const [percentage, setPercentage] = useState("0");
  const [isFailed, setIsFailed] = useState(false);
  const [scoreOptions, setScoreOptions] = useState<ScoreOption[]>([]);
  const [selectedScoreId, setSelectedScoreId] = useState("");
  const [loadingScores, setLoadingScores] = useState(false);

  useEffect(() => {
    if (open) {
      setPercentage(initialPercentage !== undefined ? String(initialPercentage) : "0");
      setIsFailed(initialIsFailed ?? false);
      setSelectedScoreId(initialScoreId ? String(initialScoreId) : "");
    }
  }, [open, initialPercentage, initialScoreId, initialIsFailed]);

  useEffect(() => {
    if (!open) {
      setScoreOptions([]);
      return;
    }

    let cancelled = false;
    setLoadingScores(true);
    MatchesApi.listScores(songId, playerId)
      .then((scores) => {
        if (cancelled) return;

        const options = scores.map((score) => ({
          id: score.id,
          percentage: Number(score.percentage),
          isFailed: score.isFailed,
        }));
        const hasInitialScore = initialScoreId ? options.some((score) => score.id === initialScoreId) : true;
        if (!hasInitialScore && initialScoreId) {
          options.unshift({
            id: initialScoreId,
            percentage: initialPercentage ?? 0,
            isFailed: initialIsFailed ?? false,
          });
        }
        setScoreOptions(options);
      })
      .catch(() => {
        if (!cancelled) setScoreOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingScores(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, songId, playerId, initialScoreId, initialPercentage, initialIsFailed]);

  const isRegisteredScoreMode = selectedScoreId !== "";
  const selectedScore = scoreOptions.find((score) => score.id === Number(selectedScoreId));
  const normalizedPercentage = percentage.trim().replace(",", ".");
  const percentageIsValid =
    /^\d+(?:\.\d{1,2})?$/.test(normalizedPercentage) &&
    Number(normalizedPercentage) >= 0 &&
    Number(normalizedPercentage) <= 100;
  const canSave = isRegisteredScoreMode ? Boolean(selectedScore) : percentageIsValid;

  useEffect(() => {
    if (!selectedScore) return;
    setPercentage(String(selectedScore.percentage));
    setIsFailed(selectedScore.isFailed);
  }, [selectedScore]);

  return {
    percentage,
    isFailed,
    scoreOptions,
    selectedScoreId,
    selectedScore,
    loadingScores,
    isRegisteredScoreMode,
    percentageIsValid,
    canSave,
    normalizedPercentage,
    setPercentage,
    setIsFailed,
    setSelectedScoreId,
  };
}
