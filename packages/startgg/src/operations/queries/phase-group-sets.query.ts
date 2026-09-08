export const PHASE_GROUP_SETS_QUERY = `
query PhaseGroupSets($phaseGroupId: ID!, $page: Int!, $perPage: Int!) {
  phaseGroup(id: $phaseGroupId) {
    displayIdentifier
    sets(page: $page, perPage: $perPage, sortType: STANDARD) {
      pageInfo {
        total
        totalPages
      }
      nodes {
        id
        fullRoundText
        state
        completedAt
        winnerId
        slots {
          prereqId
          prereqPlacement
          prereqType
          entrant {
            id
            name
          }
          standing {
            placement
            stats {
              score {
                value
              }
            }
          }
        }
      }
    }
  }
}
`;
