import { useState } from "react";
import * as MatchesApi from "@/features/match/api/match.api";
import { CreateMatchRequest } from "@/features/match/model/types";

export function useCreateMatchAction() {
  const [createMatchOpen, setCreateMatchOpen] = useState(false);

  const createMatch = async (request: CreateMatchRequest) => {
    await MatchesApi.create(request);
  };

  return {
    createMatchOpen,
    openCreateMatch: () => setCreateMatchOpen(true),
    closeCreateMatch: () => setCreateMatchOpen(false),
    createMatch,
  };
}
