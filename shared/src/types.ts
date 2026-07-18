// Hand-written mirror of shared/schema.graphql.
// Kept in sync manually (see README for why this isn't codegen-derived).

export type Format = "HARDCOVER" | "SOFTCOVER" | "AUDIOBOOK" | "EREADER";

export interface Author {
  id: string;
  name: string;
}

export interface Publisher {
  id: string;
  name: string;
}

export interface Genre {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
}

export interface Book {
  id: string;
  title: string;
  price: number;
  formats: Format[];
  publisher: Publisher;
  authors: Author[];
  genres: Genre[];
  averageRating: number | null;
  reviewCount: number;
  myRating: number | null;
}

export interface BookListPage {
  items: Book[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Review {
  id: string;
  book: Book;
  user: User;
  rating: number;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  book: Book;
  format: Format;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  createdAt: string;
  items: OrderItem[];
  total: number;
  user: User;
}

export interface OrderListPage {
  items: Order[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GenreReportRow {
  genre: Genre;
  totalBooksPurchased: number;
}

export interface Report {
  totalBooksPurchased: number;
  byGenre: GenreReportRow[];
}

export interface CheckoutItemInput {
  bookId: string;
  format: Format;
  quantity: number;
}

export interface BooksQueryArgs {
  search?: string;
  genreId?: string;
  page?: number;
  pageSize?: number;
  userId?: string;
}

export interface UsersQueryArgs {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface OrdersQueryArgs {
  userId: string;
}

export interface RecentOrdersQueryArgs {
  page?: number;
  pageSize?: number;
}

export interface SubmitReviewArgs {
  bookId: string;
  userId: string;
  rating: number;
}

export interface CheckoutArgs {
  userId: string;
  items: CheckoutItemInput[];
}

// Response shapes for each Query/Mutation root field, i.e. what a GraphQL
// operation's `data` looks like — paired with the *Args types above as
// (data, variables) generics for the frontend's Apollo hooks.
export interface BooksQueryData {
  books: BookListPage;
}

export interface GenresQueryData {
  genres: Genre[];
}

export interface UsersQueryData {
  users: User[];
}

export interface OrdersQueryData {
  orders: Order[];
}

export interface RecentOrdersQueryData {
  recentOrders: OrderListPage;
}

export interface ReportQueryData {
  report: Report;
}

export interface SubmitReviewData {
  submitReview: Review;
}

export interface CheckoutData {
  checkout: Order;
}
