export const GET_EVENT_BY_SLUG_QUERY = `
query GetEventBySlug($slug: String!) {
  event(slug: $slug) {
    id
    name
    slug
    tournament {
      id
      name
      slug
    }
    phases {
      id
      name
    }
  }
}
`;
