import { GraphQLError } from "graphql";
import type { GraphQLContext } from "./context.js";

// Stub resolvers so the server boots and the schema is queryable end-to-end.
// Real query/mutation logic (search, pagination, checkout transaction, etc.)
// is implemented in the next pass — see the plan for field-by-field behavior.
function notImplemented(field: string): never {
  throw new GraphQLError(`${field} is not implemented yet`, {
    extensions: { code: "NOT_IMPLEMENTED" },
  });
}

export const resolvers = {
  Query: {
    books: (_: unknown, __: unknown, ___: GraphQLContext) => notImplemented("Query.books"),
    genres: (_: unknown, __: unknown, ___: GraphQLContext) => notImplemented("Query.genres"),
    users: (_: unknown, __: unknown, ___: GraphQLContext) => notImplemented("Query.users"),
    orders: (_: unknown, __: unknown, ___: GraphQLContext) => notImplemented("Query.orders"),
    report: (_: unknown, __: unknown, ___: GraphQLContext) => notImplemented("Query.report"),
  },
  Mutation: {
    submitReview: (_: unknown, __: unknown, ___: GraphQLContext) => notImplemented("Mutation.submitReview"),
    checkout: (_: unknown, __: unknown, ___: GraphQLContext) => notImplemented("Mutation.checkout"),
  },
};
