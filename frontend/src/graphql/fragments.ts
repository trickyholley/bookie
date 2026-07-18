import { gql } from "@apollo/client";

// Shared across every operation that returns a Book, so the shape only has
// to be kept in sync with shared/schema.graphql (and shared/src/types.ts) in
// one place instead of once per query.
export const BOOK_FIELDS = gql`
  fragment BookFields on Book {
    id
    title
    price
    formats
    averageRating
    reviewCount
    myRating
    publisher {
      id
      name
    }
    authors {
      id
      name
    }
    genres {
      id
      name
    }
  }
`;
