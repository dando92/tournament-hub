export const EVENT_SETS_QUERY = `
query EventSets($eventId: ID!, $page: Int!, $perPage: Int!) {
  event(id: $eventId) {
    sets(page: $page, perPage: $perPage, sortType: STANDARD) {
      pageInfo {
        total
        totalPages
      }
      nodes {
        id
        fullRoundText
        phaseGroup {
          displayIdentifier
          phase {
            id
            name
          }
        }
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
