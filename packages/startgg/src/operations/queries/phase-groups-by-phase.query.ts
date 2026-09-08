export const PHASE_GROUPS_BY_PHASE_QUERY = `
query PhaseGroupsByPhase($phaseId: ID!, $page: Int!, $perPage: Int!) {
  phase(id: $phaseId) {
    id
    name
    phaseGroups(query: { page: $page, perPage: $perPage }) {
      pageInfo {
        total
        totalPages
      }
      nodes {
        id
        displayIdentifier
        bracketType
      }
    }
  }
}
`;
