import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { GenreFilter } from "@/components/GenreFilter";
import { PaginationControls } from "@/components/PaginationControls";
import { BookCard } from "@/components/BookCard";
import { useBooksQuery } from "@/graphql/queries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCurrentUser } from "@/context/UserContext";
import { setUrlParams } from "@/lib/url-params";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

export function BrowsePage() {
  const { userId } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [genreId, setGenreId] = useState<string | undefined>(() => searchParams.get("genre") ?? undefined);
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1);
  const debouncedSearch = useDebouncedValue(search, 300);

  // Mirror the active filters into the URL (once the search box settles)
  // so the current view is bookmarkable/shareable and survives a reload.
  useEffect(() => {
    setUrlParams(setSearchParams, {
      q: debouncedSearch || null,
      genre: genreId ?? null,
      page: page > 1 ? String(page) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, genreId, page]);

  const { data, previousData, loading, error } = useBooksQuery({
    search: debouncedSearch || undefined,
    genreId,
    page,
    pageSize: PAGE_SIZE,
    userId: userId ?? undefined,
  });

  // Fall back to the previous page's data while a new search/genre/page
  // fetch is in flight, so the grid stays populated (dimmed, not blanked)
  // instead of flashing empty and re-mounting with skeletons every time a
  // filter changes.
  const books = data?.books ?? previousData?.books;
  const isInitialLoad = loading && !books;
  const isRefetching = loading && !!books;

  function resetToFirstPage() {
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by title or author…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetToFirstPage();
            }}
          />
        </div>
        <GenreFilter
          genreId={genreId}
          onChange={(value) => {
            setGenreId(value);
            resetToFirstPage();
          }}
        />
        {books && (
          <span className="text-muted-foreground ml-auto flex items-center gap-2 text-sm">
            {isRefetching && <Loader2 className="size-3.5 animate-spin" />}
            {books.totalCount} books
          </span>
        )}
      </div>

      {error && <p className="text-destructive text-sm">Failed to load books: {error.message}</p>}

      {isInitialLoad ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "grid grid-cols-1 gap-4 transition-opacity duration-150 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
            isRefetching && "pointer-events-none opacity-50",
          )}
        >
          {books?.items.map((book) => <BookCard key={book.id} book={book} />)}
        </div>
      )}

      {books && books.items.length === 0 && !loading && (
        <p className="text-muted-foreground text-center text-sm">No books match your search.</p>
      )}

      {books && (
        <PaginationControls page={books.page} totalPages={books.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
