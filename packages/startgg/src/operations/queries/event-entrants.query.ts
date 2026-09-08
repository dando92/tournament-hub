export const EVENT_ENTRANTS_QUERY = `
query EventEntrants($eventId: ID!, $page: Int!, $perPage: Int!) {
  event(id: $eventId) {
    entrants(query: { page: $page, perPage: $perPage }) {
      pageInfo {
        total
        totalPages
      }
      nodes {
        id
        name
        participants {
          id
          gamerTag
        }
      }
    }
  }
}
`;
