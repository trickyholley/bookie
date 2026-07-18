import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

export interface GraphQLContext {
  prisma: PrismaClient;
}

export async function createContext(): Promise<GraphQLContext> {
  return { prisma };
}
