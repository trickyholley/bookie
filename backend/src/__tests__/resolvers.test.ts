import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, type DeepMockProxy } from "vitest-mock-extended";
import { resolvers } from "../resolvers.js";
import type { GraphQLContext } from "../context.js";
import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";

const { Decimal } = Prisma;

describe("resolvers wiring", () => {
  it("declares every field from the shared schema's Query/Mutation types", () => {
    expect(Object.keys(resolvers.Query).sort()).toEqual(
      ["books", "genres", "orders", "recentOrders", "report", "users"].sort(),
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
      user: { id: userId, name: "Some User" },
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
    prisma.review.findMany.mockResolvedValue([]);

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
    expect(result.user).toEqual({ id: userId, name: "Some User" });
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

describe("Mutation.submitReview", () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let ctx: GraphQLContext;

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    ctx = { prisma };
  });

  it("upserts on (bookId, userId) so a second submission edits the rating instead of being rejected", async () => {
    const bookId = "book-1";
    const userId = "user-1";

    prisma.review.upsert.mockResolvedValue({
      id: "review-1",
      bookId,
      userId,
      rating: 4,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
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
      user: { id: userId, name: "Some User" },
    } as never);
    (prisma.review.groupBy as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(
      [],
    );

    const result = await resolvers.Mutation.submitReview(undefined, { bookId, userId, rating: 4 }, ctx);

    expect(prisma.review.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bookId_userId: { bookId, userId } },
        create: { bookId, userId, rating: 4 },
        update: { rating: 4 },
      }),
    );
    expect(result.rating).toBe(4);
    expect(result.book.myRating).toBe(4);
  });

  it("rejects a rating outside 1-5 without touching the database", async () => {
    await expect(
      resolvers.Mutation.submitReview(undefined, { bookId: "book-1", userId: "user-1", rating: 6 }, ctx),
    ).rejects.toThrow(/integer between 1 and 5/);

    expect(prisma.review.upsert).not.toHaveBeenCalled();
  });
});

describe("Query.recentOrders", () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let ctx: GraphQLContext;

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    ctx = { prisma };
  });

  it("paginates across all users, ordered by most recent, without filtering by userId", async () => {
    prisma.order.count.mockResolvedValue(37);
    prisma.order.findMany.mockResolvedValue([
      {
        id: "order-2",
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
        user: { id: "user-2", name: "Bea" },
        items: [
          {
            id: "item-2",
            bookId: "book-2",
            format: "SOFTCOVER",
            quantity: 1,
            unitPrice: new Decimal("9.5"),
            book: {
              id: "book-2",
              title: "Another Book",
              price: new Decimal("9.5"),
              formats: ["SOFTCOVER"],
              publisherId: "pub-1",
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
              publisher: { id: "pub-1", name: "Some Publisher" },
              authors: [],
              genres: [],
            },
          },
        ],
      },
    ] as never);
    (prisma.review.groupBy as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(
      [],
    );

    const result = await resolvers.Query.recentOrders(undefined, { page: 2, pageSize: 10 }, ctx);

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" }, skip: 10, take: 10 }),
    );
    expect(prisma.order.findMany.mock.calls[0]![0]).not.toHaveProperty("where");
    expect(result.items[0]!.user).toEqual({ id: "user-2", name: "Bea" });
    expect(result.totalCount).toBe(37);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(4);
  });
});
