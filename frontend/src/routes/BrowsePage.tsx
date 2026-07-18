import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { GenreFilter } from "@/components/GenreFilter";
import { PaginationControls } from "@/components/PaginationControls";
import { BookCard } from "@/components/BookCard";
import { useBooksQuery } from "@/graphql/queries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const PAGE_SIZE = 12;

export function BrowsePage() {
  const [search, setSearch] = useState("");
  const [genreId, setGenreId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, loading, error } = useBooksQuery({
    search: debouncedSearch || undefined,
    genreId,
    page,
    pageSize: PAGE_SIZE,
  });

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
        {data && (
          <span className="text-muted-foreground ml-auto text-sm">{data.books.totalCount} books</span>
        )}
      </div>

      {error && <p className="text-destructive text-sm">Failed to load books: {error.message}</p>}

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data?.books.items.map((book) => <BookCard key={book.id} book={book} />)}
        </div>
      )}

      {data && data.books.items.length === 0 && !loading && (
        <p className="text-muted-foreground text-center text-sm">No books match your search.</p>
      )}

      {data && (
        <PaginationControls page={data.books.page} totalPages={data.books.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
