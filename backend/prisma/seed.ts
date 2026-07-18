import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../generated/prisma/client.js";
import { Format } from "../generated/prisma/enums.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Assignment-stated target scale (see plan doc) — cheap enough to seed by
// default rather than a reduced dev sample, as long as everything below goes
// through batched createMany instead of one round-trip per row/relation.
const PUBLISHER_COUNT = 100;
const AUTHOR_COUNT = 10_000;
const BOOK_COUNT = 10_000;
const USER_COUNT = 1_000;
const REVIEW_COUNT = 5_000;
const ORDER_COUNT = 1_500;
const CHUNK_SIZE = 5_000;

// Deterministic PRNG (mulberry32) instead of Math.random(), so re-running the
// seed against a fresh database always produces the same data.
function mulberry32(seed: number) {
  let state = seed;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function pick<T>(pool: readonly T[]): T {
  return pool[randInt(0, pool.length - 1)] as T;
}

// Picks `count` unique indices out of [0, poolSize) — poolSize is always far
// larger than count here, so a retry-on-collision loop stays cheap.
function sampleUniqueIndices(poolSize: number, count: number): number[] {
  const chosen = new Set<number>();
  while (chosen.size < count) {
    chosen.add(randInt(0, poolSize - 1));
  }
  return Array.from(chosen);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Small local word pools instead of @faker-js/faker: at 10k+ rows the actual
// cost is DB round-trips (handled via chunked createMany below), not string
// generation, so plain array lookups are already as cheap as it gets and
// avoid a dependency + its per-call overhead entirely. Kept human-readable
// (not literal random characters) so the search feature has something
// meaningful to filter on.
const FIRST_NAMES = [
  "Ava", "Liam", "Noah", "Emma", "Olivia", "Elijah", "Sophia", "Mason", "Isabella", "Logan",
  "Mia", "Lucas", "Amelia", "Ethan", "Harper", "James", "Evelyn", "Benjamin", "Abigail", "Jacob",
  "Ella", "Michael", "Scarlett", "Alexander", "Grace", "William", "Chloe", "Daniel", "Victoria", "Henry",
  "Riley", "Jackson", "Aria", "Sebastian", "Lily", "Matthew", "Zoey", "David", "Nora", "Joseph",
];
const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
];
const TITLE_ADJECTIVES = [
  "Silent", "Hidden", "Lost", "Broken", "Golden", "Crimson", "Eternal", "Forgotten", "Whispering", "Shattered",
  "Radiant", "Frozen", "Wandering", "Sacred", "Distant", "Fading", "Endless", "Scarlet", "Midnight", "Velvet",
  "Bitter", "Ancient", "Restless", "Quiet",
];
const TITLE_NOUNS = [
  "Ocean", "Garden", "Kingdom", "Shadow", "River", "Storm", "Mirror", "Forest", "Empire", "Harbor",
  "Flame", "Journey", "Horizon", "Tower", "Echo", "Compass", "Bridge", "Labyrinth", "Meadow", "Star",
  "Chronicle", "Legacy", "Whisper", "Path",
];
const PUBLISHER_PREFIXES = [
  "Northwind", "Blue Harbor", "Golden Quill", "Ironwood", "Silverline", "Cobalt", "Amber Hollow", "Willowbrook",
  "Stonegate", "Redwood", "Emberlight", "Pinecrest", "Slate", "Marlow", "Thistle", "Cedar Grove",
  "Brightwater", "Hollowmere", "Fernwood", "Graystone",
];
const PUBLISHER_SUFFIXES = ["Press", "Books", "Publishing", "House", "Media"];
const GENRE_NAMES = [
  "Fiction", "Non-Fiction", "Mystery", "Thriller", "Romance", "Science Fiction", "Fantasy", "Horror",
  "Biography", "History", "Self-Help", "Business", "Poetry", "Young Adult", "Children's",
];
const FORMAT_VALUES = Object.values(Format);

function personName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function bookTitle(): string {
  const article = pick(["The", "A", ""]);
  const title = `${pick(TITLE_ADJECTIVES)} ${pick(TITLE_NOUNS)}`;
  return article ? `${article} ${title}` : title;
}

function randomPrice(): number {
  return Math.round((rand() * 45 + 4.99) * 100) / 100;
}

function daysAgo(maxDays: number): Date {
  return new Date(Date.now() - randInt(0, maxDays) * 24 * 60 * 60 * 1000);
}

async function main() {
  console.time("seed");

  // Truncate + cascade instead of per-model deleteMany: one round trip,
  // FK-order-agnostic, and makes the seed safely re-runnable.
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "OrderItem", "Order", "Review", "BookGenre", "BookAuthor", "Book", "User", "Author", "Genre", "Publisher" RESTART IDENTITY CASCADE;`,
  );

  const publisherIds = Array.from({ length: PUBLISHER_COUNT }, () => randomUUID());
  const publishers = publisherIds.map((id, i) => ({
    id,
    name: `${PUBLISHER_PREFIXES[Math.floor(i / PUBLISHER_SUFFIXES.length)]} ${PUBLISHER_SUFFIXES[i % PUBLISHER_SUFFIXES.length]}`,
  }));
  await prisma.publisher.createMany({ data: publishers });

  const genreIds = Array.from({ length: GENRE_NAMES.length }, () => randomUUID());
  const genres = genreIds.map((id, i) => ({ id, name: GENRE_NAMES[i]! }));
  await prisma.genre.createMany({ data: genres });

  const authorIds = Array.from({ length: AUTHOR_COUNT }, () => randomUUID());
  const authors = authorIds.map((id) => ({ id, name: personName() }));
  for (const batch of chunk(authors, CHUNK_SIZE)) {
    await prisma.author.createMany({ data: batch });
  }

  const bookIds = Array.from({ length: BOOK_COUNT }, () => randomUUID());
  const bookPrices = new Map<string, number>();
  const books = bookIds.map((id) => {
    const price = randomPrice();
    bookPrices.set(id, price);
    return {
      id,
      title: bookTitle(),
      price,
      formats: sampleUniqueIndices(FORMAT_VALUES.length, randInt(1, FORMAT_VALUES.length)).map(
        (i) => FORMAT_VALUES[i]!,
      ),
      publisherId: pick(publisherIds),
      createdAt: daysAgo(730),
    };
  });
  for (const batch of chunk(books, CHUNK_SIZE)) {
    await prisma.book.createMany({ data: batch });
  }

  const bookAuthorRows: { bookId: string; authorId: string }[] = [];
  const bookGenreRows: { bookId: string; genreId: string }[] = [];
  for (const bookId of bookIds) {
    for (const i of sampleUniqueIndices(authorIds.length, randInt(1, 3))) {
      bookAuthorRows.push({ bookId, authorId: authorIds[i]! });
    }
    for (const i of sampleUniqueIndices(genreIds.length, randInt(1, 3))) {
      bookGenreRows.push({ bookId, genreId: genreIds[i]! });
    }
  }
  for (const batch of chunk(bookAuthorRows, CHUNK_SIZE)) {
    await prisma.bookAuthor.createMany({ data: batch });
  }
  for (const batch of chunk(bookGenreRows, CHUNK_SIZE)) {
    await prisma.bookGenre.createMany({ data: batch });
  }

  const userIds = Array.from({ length: USER_COUNT }, () => randomUUID());
  const users = userIds.map((id) => ({ id, name: personName() }));
  await prisma.user.createMany({ data: users });

  const reviewPairs = new Set<string>();
  const reviews: { id: string; bookId: string; userId: string; rating: number; createdAt: Date }[] = [];
  while (reviews.length < REVIEW_COUNT) {
    const bookId = pick(bookIds);
    const userId = pick(userIds);
    const key = `${bookId}:${userId}`;
    if (reviewPairs.has(key)) continue;
    reviewPairs.add(key);
    reviews.push({ id: randomUUID(), bookId, userId, rating: randInt(1, 5), createdAt: daysAgo(365) });
  }
  await prisma.review.createMany({ data: reviews });

  const orders: { id: string; userId: string; createdAt: Date }[] = [];
  const orderItems: {
    id: string;
    orderId: string;
    bookId: string;
    format: Format;
    quantity: number;
    unitPrice: number;
  }[] = [];
  for (let i = 0; i < ORDER_COUNT; i++) {
    const orderId = randomUUID();
    const userId = pick(userIds);
    const createdAt = daysAgo(365);
    orders.push({ id: orderId, userId, createdAt });

    const itemCount = randInt(1, 3);
    for (const bookIndex of sampleUniqueIndices(bookIds.length, itemCount)) {
      const bookId = bookIds[bookIndex]!;
      orderItems.push({
        id: randomUUID(),
        orderId,
        bookId,
        format: pick(FORMAT_VALUES),
        quantity: randInt(1, 3),
        unitPrice: bookPrices.get(bookId)!,
      });
    }
  }
  await prisma.order.createMany({ data: orders });
  for (const batch of chunk(orderItems, CHUNK_SIZE)) {
    await prisma.orderItem.createMany({ data: batch });
  }

  console.timeEnd("seed");
  console.log(
    `Seeded ${publishers.length} publishers, ${genres.length} genres, ${authors.length} authors, ` +
      `${books.length} books (${bookAuthorRows.length} author links, ${bookGenreRows.length} genre links), ` +
      `${users.length} users, ${reviews.length} reviews, ${orders.length} orders (${orderItems.length} items).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
