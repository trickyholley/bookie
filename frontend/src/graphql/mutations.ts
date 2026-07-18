import { gql } from "@apollo/client";
import type { TypedDocumentNode } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import type { CheckoutArgs, CheckoutData, SubmitReviewArgs, SubmitReviewData } from "@bookie/shared";
import { BOOK_FIELDS } from "@/graphql/fragments";

// Typing the document itself as TypedDocumentNode<Data, Variables> lets
// useMutation infer TData/TVariables on its own — passing generics directly
// to useMutation is deprecated in Apollo Client v4.
export const SUBMIT_REVIEW_MUTATION: TypedDocumentNode<SubmitReviewData, SubmitReviewArgs> = gql`
  ${BOOK_FIELDS}
  mutation SubmitReview($bookId: ID!, $userId: ID!, $rating: Int!) {
    submitReview(bookId: $bookId, userId: $userId, rating: $rating) {
      id
      rating
      createdAt
      user {
        id
        name
      }
      book {
        ...BookFields
      }
    }
  }
`;

export function useSubmitReviewMutation() {
  return useMutation(SUBMIT_REVIEW_MUTATION);
}

export const CHECKOUT_MUTATION: TypedDocumentNode<CheckoutData, CheckoutArgs> = gql`
  ${BOOK_FIELDS}
  mutation Checkout($userId: ID!, $items: [CheckoutItemInput!]!) {
    checkout(userId: $userId, items: $items) {
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

export function useCheckoutMutation() {
  return useMutation(CHECKOUT_MUTATION);
}
