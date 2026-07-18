import { GraphQLError } from "graphql";
import type {
  BooksQueryArgs,
  CheckoutArgs,
  OrdersQueryArgs,
  SubmitReviewArgs,
  UsersQueryArgs,
} from "@bookie/shared";
import { Prisma } from "../generated/prisma/client.js";
import type { GraphQLContext } from "./context.js";

const bookInclude = {
  publisher: true,
  authors: { include: { author: true } },
  genres: { include: { genre: true } },
} satisfies Prisma.BookInclude;

type BookWithRelations = Prisma.BookGetPayload<{ include: typeof bookInclude }>;

interface RatingSummary {
  average: number | null;
  count: number;
}

// Single groupBy over Review for however many book ids are in play (a page
// of books, or the handful of books in a user's orders) instead of one query
// per book — keeps book listings and order histories at O(1) review queries.
async function loadRatings(
  prisma: GraphQLContext["prisma"],
  bookIds: string[],
): Promise<Map<string, RatingSummary>> {
  if (bookIds.length === 0) return new Map();
  const grouped = await prisma.review.groupBy({
    by: ["bookId"],
    where: { bookId: { in: bookIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return new Map(
    grouped.map((row) => [row.bookId, { average: row._avg.rating, count: row._count.rating }]),
  );
}

function toBookDTO(book: BookWithRelations, ratings: Map<string, RatingSummary>) {
  const rating = ratings.get(book.id);
  return {
    id: book.id,
    title: book.title,
    price: Number(book.price),
    formats: book.formats,
    publisher: book.publisher,
    authors: book.authors.map((bookAuthor) => bookAuthor.author),
    genres: book.genres.map((bookGenre) => bookGenre.genre),
    averageRating: rating?.average ?? null,
    reviewCount: rating?.count ?? 0,
  };
}

// Order totals are summed in JS floating point, which can leave artifacts
// like 35.400000000000006 — round to the nearest cent before returning.
function roundCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function orderTotal(items: { unitPrice: number; quantity: number }[]): number {
  return roundCents(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
}

function assertValidRating(rating: number): void {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new GraphQLError("rating must be an integer between 1 and 5", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
}

export const resolvers = {
  Query: {
    books: async (_parent: unknown, args: BooksQueryArgs, ctx: GraphQLContext) => {
      const page = args.page ?? 1;
      const pageSize = args.pageSize ?? 20;

      const where: Prisma.BookWhereInput = {};
      if (args.search) {
        where.OR = [
          { title: { contains: args.search, mode: "insensitive" } },
          { authors: { some: { author: { name: { contains: args.search, mode: "insensitive" } } } } },
        ];
      }
      if (args.genreId) {
        where.genres = { some: { genreId: args.genreId } };
      }

      const [totalCount, books] = await Promise.all([
        ctx.prisma.book.count({ where }),
        ctx.prisma.book.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { title: "asc" },
          include: bookInclude,
        }),
      ]);

      const ratings = await loadRatings(
        ctx.prisma,
        books.map((book) => book.id),
      );

      return {
        items: books.map((book) => toBookDTO(book, ratings)),
        totalCount,
        page,
        pageSize,
        totalPages: pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0,
      };
    },

    genres: (_parent: unknown, _args: unknown, ctx: GraphQLContext) =>
      ctx.prisma.genre.findMany({ orderBy: { name: "asc" } }),

    users: (_parent: unknown, args: UsersQueryArgs, ctx: GraphQLContext) =>
      ctx.prisma.user.findMany({
        where: args.search ? { name: { contains: args.search, mode: "insensitive" } } : {},
        orderBy: { name: "asc" },
        take: args.limit ?? 20,
      }),

    orders: async (_parent: unknown, args: OrdersQueryArgs, ctx: GraphQLContext) => {
      const orders = await ctx.prisma.order.findMany({
        where: { userId: args.userId },
        orderBy: { createdAt: "desc" },
        include: { items: { include: { book: { include: bookInclude } } } },
      });

      const bookIds = [...new Set(orders.flatMap((order) => order.items.map((item) => item.bookId)))];
      const ratings = await loadRatings(ctx.prisma, bookIds);

      return orders.map((order) => {
        const items = order.items.map((item) => ({
          id: item.id,
          book: toBookDTO(item.book, ratings),
          format: item.format,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        }));
        return {
          id: order.id,
          createdAt: order.createdAt.toISOString(),
          items,
          total: orderTotal(items),
        };
      });
    },

    report: async (_parent: unknown, _args: unknown, ctx: GraphQLContext) => {
      const [totalAgg, byGenreRows] = await Promise.all([
        ctx.prisma.orderItem.aggregate({ _sum: { quantity: true } }),
        // A purchased book counts toward every genre it belongs to, so this
        // has to join through BookGenre rather than a plain groupBy on
        // OrderItem — a book with 2 genres contributes its quantity twice.
        ctx.prisma.$queryRaw<{ id: string; name: string; total: bigint }[]>`
          SELECT g.id, g.name, SUM(oi.quantity)::bigint AS total
          FROM "OrderItem" oi
          JOIN "BookGenre" bg ON bg."bookId" = oi."bookId"
          JOIN "Genre" g ON g.id = bg."genreId"
          GROUP BY g.id, g.name
          ORDER BY total DESC
        `,
      ]);

      return {
        totalBooksPurchased: totalAgg._sum.quantity ?? 0,
        byGenre: byGenreRows.map((row) => ({
          genre: { id: row.id, name: row.name },
          totalBooksPurchased: Number(row.total),
        })),
      };
    },
  },

  Mutation: {
    submitReview: async (_parent: unknown, args: SubmitReviewArgs, ctx: GraphQLContext) => {
      assertValidRating(args.rating);

      let review;
      try {
        review = await ctx.prisma.review.create({
          data: { bookId: args.bookId, userId: args.userId, rating: args.rating },
          include: { book: { include: bookInclude }, user: true },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new GraphQLError("this user has already reviewed this book", {
            extensions: { code: "ALREADY_REVIEWED" },
          });
        }
        throw error;
      }

      const ratings = await loadRatings(ctx.prisma, [review.bookId]);
      return {
        id: review.id,
        book: toBookDTO(review.book, ratings),
        user: review.user,
        rating: review.rating,
        createdAt: review.createdAt.toISOString(),
      };
    },

    checkout: async (_parent: unknown, args: CheckoutArgs, ctx: GraphQLContext) => {
      if (args.items.length === 0) {
        throw new GraphQLError("checkout requires at least one item", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
      for (const item of args.items) {
        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
          throw new GraphQLError("quantity must be a positive integer", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
      }

      const bookIds = [...new Set(args.items.map((item) => item.bookId))];
      const books = await ctx.prisma.book.findMany({ where: { id: { in: bookIds } } });
      const priceByBookId = new Map(books.map((book) => [book.id, book.price]));
      for (const bookId of bookIds) {
        if (!priceByBookId.has(bookId)) {
          throw new GraphQLError(`book ${bookId} does not exist`, {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
      }

      // Order + its items are created atomically: unitPrice is snapshotted
      // from the current book price inside the same transaction that
      // creates the order, so a partial write can never leave an order
      // without its items (or vice versa).
      const orderId = await ctx.prisma.$transaction(async (tx) => {
        const order = await tx.order.create({ data: { userId: args.userId } });
        await tx.orderItem.createMany({
          data: args.items.map((item) => ({
            orderId: order.id,
            bookId: item.bookId,
            format: item.format,
            quantity: item.quantity,
            unitPrice: priceByBookId.get(item.bookId)!,
          })),
        });
        return order.id;
      });

      const order = await ctx.prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: { include: { book: { include: bookInclude } } } },
      });
      const ratings = await loadRatings(
        ctx.prisma,
        order.items.map((item) => item.bookId),
      );

      const items = order.items.map((item) => ({
        id: item.id,
        book: toBookDTO(item.book, ratings),
        format: item.format,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      }));

      return {
        id: order.id,
        createdAt: order.createdAt.toISOString(),
        items,
        total: orderTotal(items),
      };
    },
  },
};
