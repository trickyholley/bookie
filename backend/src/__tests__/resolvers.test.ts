import { describe, expect, it } from "vitest";
import { resolvers } from "../resolvers.js";

describe("resolvers wiring", () => {
  it("stubs every field declared in the shared schema's Query/Mutation types", () => {
    expect(Object.keys(resolvers.Query).sort()).toEqual(
      ["books", "genres", "orders", "report", "users"].sort(),
    );
    expect(Object.keys(resolvers.Mutation).sort()).toEqual(
      ["checkout", "submitReview"].sort(),
    );
  });
});
