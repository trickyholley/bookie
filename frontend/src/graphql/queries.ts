import { gql } from "@apollo/client";
import type { TypedDocumentNode } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import type {
  BooksQueryArgs,
  BooksQueryData,
  GenresQueryData,
  OrdersQueryArgs,
  OrdersQueryData,
  RecentOrdersQueryArgs,
  RecentOrdersQueryData,
  ReportQueryData,
  UsersQueryArgs,
  UsersQueryData,
} from "@bookie/shared";
import { BOOK_FIELDS } from "@/graphql/fragments";

// Typing the document itself as TypedDocumentNode<Data, Variables> lets
// useQuery infer TData/TVariables on its own — passing generics directly to
// useQuery is deprecated in Apollo Client v4.
export const BOOKS_QUERY: TypedDocumentNode<BooksQueryData, BooksQueryArgs> = gql`
  ${BOOK_FIELDS}
  query Books($search: String, $genreId: ID, $page: Int, $pageSize: Int, $userId: ID) {
    books(search: $search, genreId: $genreId, page: $page, pageSize: $pageSize, userId: $userId) {
      items {
        ...BookFields
      }
      totalCount
      page
      pageSize
      totalPages
    }
  }
`;

export function useBooksQuery(variables: BooksQueryArgs) {
  return useQuery(BOOKS_QUERY, { variables });
}

export const GENRES_QUERY: TypedDocumentNode<GenresQueryData, Record<string, never>> = gql`
  query Genres {
    genres {
      id
      name
    }
  }
`;

export function useGenresQuery() {
  return useQuery(GENRES_QUERY);
}

export const USERS_QUERY: TypedDocumentNode<UsersQueryData, UsersQueryArgs> = gql`
  query Users($search: String, $limit: Int, $offset: Int) {
    users(search: $search, limit: $limit, offset: $offset) {
      id
      name
    }
  }
`;

export function useUsersQuery(variables: UsersQueryArgs) {
  return useQuery(USERS_QUERY, { variables });
}

export const ORDERS_QUERY: TypedDocumentNode<OrdersQueryData, OrdersQueryArgs> = gql`
  ${BOOK_FIELDS}
  query Orders($userId: ID!) {
    orders(userId: $userId) {
      id
      createdAt
      total
      items {
        id
        format
        quantity
        unitPrice
        book {
          ...BookFields
        }
      }
    }
  }
`;

export function useOrdersQuery(variables: OrdersQueryArgs) {
  // Order history should reflect a checkout that just happened elsewhere in
  // the app rather than show a stale cached list, so always hit the network.
  return useQuery(ORDERS_QUERY, { variables, fetchPolicy: "cache-and-network" });
}

export const RECENT_ORDERS_QUERY: TypedDocumentNode<RecentOrdersQueryData, RecentOrdersQueryArgs> = gql`
  ${BOOK_FIELDS}
  query RecentOrders($page: Int, $pageSize: Int) {
    recentOrders(page: $page, pageSize: $pageSize) {
      items {
        id
        createdAt
        total
        user {
          id
          name
        }
        items {
          id
          format
          quantity
          unitPrice
          book {
            ...BookFields
          }
        }
      }
      totalCount
      page
      pageSize
      totalPages
    }
  }
`;

export function useRecentOrdersQuery(variables: RecentOrdersQueryArgs) {
  return useQuery(RECENT_ORDERS_QUERY, { variables, fetchPolicy: "cache-and-network" });
}

export const REPORT_QUERY: TypedDocumentNode<ReportQueryData, Record<string, never>> = gql`
  query Report {
    report {
      totalBooksPurchased
      byGenre {
        totalBooksPurchased
        genre {
          id
          name
        }
      }
    }
  }
`;

export function useReportQuery() {
  // Same reasoning as useOrdersQuery: reporting numbers should move after a
  // checkout, not stay pinned to whatever was cached on first visit.
  return useQuery(REPORT_QUERY, { fetchPolicy: "cache-and-network" });
}
