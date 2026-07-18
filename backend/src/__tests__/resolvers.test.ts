import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, type DeepMockProxy } from "vitest-mock-extended";
import { resolvers } from "../resolvers.js";
import type { GraphQLContext } from "../context.js";
import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";

const { Decimal } = Prisma;

describe("resolvers wiring", () => {
  it("declares every field from the shared schema's Query/Mutation types", () => {
    expect(Object.keys(resolvers.Query).sort()).toEqual(
      ["books", "genres", "orders", "report", "users"].sort(),
    );
    expect(Object.keys(resolvers.Mutation).sort()).toEqual(
      ["checkout", "submitReview"].sort(),
    );
  });
});

describe("Mutation.checkout", () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let ctx: GraphQLContext;

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    ctx = { prisma };
  });

  it("runs inside a single transaction and snapshots the book's current price as unitPrice", async () => {
    const bookId = "book-1";
    const userId = "user-1";

    prisma.book.findMany.mockResolvedValue([
      { id: bookId, title: "Some Book", price: new Decimal("19.99") } as never,
    ]);

    const orderCreate = vi.fn().mockResolvedValue({ id: "order-1" });
    const orderItemCreateMany = vi.fn().mockResolvedValue({ count: 1 });
    prisma.$transaction.mockImplementation(async (callback) =>
      (callback as (tx: unknown) => unknown)({
        order: { create: orderCreate },
        orderItem: { createMany: orderItemCreateMany },
      }),
    );

    prisma.order.findUniqueOrThrow.mockResolvedValue({
      id: "order-1",
      userId,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      items: [
        {
          id: "item-1",
          orderId: "order-1",
          bookId,
          format: "HARDCOVER",
          quantity: 2,
          unitPrice: new Decimal("19.99"),
          book: {
            id: bookId,
            title: "Some Book",
            price: new Decimal("19.99"),
            formats: ["HARDCOVER"],
            publisherId: "pub-1",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            publisher: { id: "pub-1", name: "Some Publisher" },
            authors: [],
            genres: [],
          },
        },
      ],
    } as never);
    // groupBy's overloaded generic signature defeats mockDeep's type
    // inference; the runtime mock function is still there underneath.
    (prisma.review.groupBy as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(
      [],
    );

    const result = await resolvers.Mutation.checkout(
      undefined,
      { userId, items: [{ bookId, format: "HARDCOVER", quantity: 2 }] },
      ctx,
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(orderCreate).toHaveBeenCalledWith({ data: { userId } });
    expect(orderItemCreateMany).toHaveBeenCalledWith({
      data: [{ orderId: "order-1", bookId, format: "HARDCOVER", quantity: 2, unitPrice: new Decimal("19.99") }],
    });
    expect(result.items[0]!.unitPrice).toBe(19.99);
    expect(result.total).toBe(39.98);
  });

  it("rejects checkout for a book id that doesn't exist without opening a transaction", async () => {
    prisma.book.findMany.mockResolvedValue([]);

    await expect(
      resolvers.Mutation.checkout(
        undefined,
        { userId: "user-1", items: [{ bookId: "missing-book", format: "HARDCOVER", quantity: 1 }] },
        ctx,
      ),
    ).rejects.toThrow(/does not exist/);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a non-positive quantity without touching the database", async () => {
    await expect(
      resolvers.Mutation.checkout(
        undefined,
        { userId: "user-1", items: [{ bookId: "book-1", format: "HARDCOVER", quantity: 0 }] },
        ctx,
      ),
    ).rejects.toThrow(/positive integer/);

    expect(prisma.book.findMany).not.toHaveBeenCalled();
  });
});
