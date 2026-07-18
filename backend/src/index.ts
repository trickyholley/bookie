import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { createContext, type GraphQLContext } from "./context.js";
import { resolvers } from "./resolvers.js";

const schemaPath = fileURLToPath(import.meta.resolve("@bookie/shared/schema.graphql"));
const typeDefs = readFileSync(schemaPath, "utf-8");

const server = new ApolloServer<GraphQLContext>({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  context: createContext,
  listen: { port: Number(process.env.PORT) || 4000 },
});

console.log(`Apollo Server ready at ${url}`);
