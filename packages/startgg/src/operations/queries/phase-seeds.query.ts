export const PHASE_SEEDS_QUERY = `
query PhaseSeeds($phaseId: ID!, $page: Int!, $perPage: Int!) {
  phase(id: $phaseId) {
    seeds(query: { page: $page, perPage: $perPage }) {
      pageInfo {
        total
        totalPages
      }
      nodes {
        id
        seedNum
        groupSeedNum
        phaseGroup {
          id
        }
        progressionSource {
          originPlacement
          originPhaseGroup {
            id
          }
        }
        entrant {
          id
        }
      }
    }
  }
}
`;
