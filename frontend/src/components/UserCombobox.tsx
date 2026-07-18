import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2, UserRound } from "lucide-react";
import type { User } from "@bookie/shared";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { USERS_QUERY, useUsersQuery } from "@/graphql/queries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCurrentUser } from "@/context/UserContext";
import { useApolloClient } from "@apollo/client/react";

const PAGE_SIZE = 20;

// Backend-filtered rather than client-filtered: with ~1,000 users, shipping
// the whole list to the browser and filtering in JS would be wasteful, so
// the search string is debounced and sent as the `users(search)` variable.
//
// Pagination fetches PAGE_SIZE + 1 rows so "is there another page" can be
// read off the response itself (no separate totalCount field needed just
// for a dropdown's "Load more" button) — the extra row is trimmed before
// display. Later pages are fetched imperatively via the Apollo client and
// appended to local state, rather than wired through Apollo's cache field
// policies, since this list only ever grows top-to-bottom and never needs
// to be re-merged from elsewhere in the app.
export function UserCombobox() {
  const { userId, setUserId } = useCurrentUser();
  const client = useApolloClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);

  const { data, loading } = useUsersQuery({
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE + 1,
  });

  const [extraUsers, setExtraUsers] = useState<User[]>([]);
  // Only reflects pages fetched via loadMore(); the first page's "is there
  // more" is derived fresh from `data` every render instead (see `hasMore`
  // below), so it's correct immediately once the initial query resolves.
  const [lastPageHasMore, setLastPageHasMore] = useState<boolean | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const firstPage = data?.users ?? [];
  const firstPageHasMore = firstPage.length > PAGE_SIZE;
  const firstPageUsers = firstPageHasMore ? firstPage.slice(0, PAGE_SIZE) : firstPage;
  const hasMore = extraUsers.length > 0 ? (lastPageHasMore ?? false) : firstPageHasMore;

  // Reset accumulated pages whenever the search term changes underneath us.
  useEffect(() => {
    setExtraUsers([]);
    setLastPageHasMore(null);
  }, [debouncedSearch]);

  const users = [...firstPageUsers, ...extraUsers];
  const selectedUser = users.find((user) => user.id === userId);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const { data: nextData } = await client.query({
        query: USERS_QUERY,
        variables: {
          search: debouncedSearch || undefined,
          limit: PAGE_SIZE + 1,
          offset: users.length,
        },
        fetchPolicy: "network-only",
      });
      const nextPage = nextData?.users ?? [];
      setLastPageHasMore(nextPage.length > PAGE_SIZE);
      setExtraUsers((prev) => [...prev, ...nextPage.slice(0, PAGE_SIZE)]);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={selectedUser ? `Selected user: ${selectedUser.name}` : "Select a user"}
            className="w-32 justify-between sm:w-56"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <UserRound className="size-4 shrink-0 opacity-60" />
          <span className="truncate">{selectedUser?.name ?? "Select a user…"}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search users…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{loading ? "Searching…" : "No users found."}</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id}
                  onSelect={() => {
                    setUserId(user.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4", userId === user.id ? "opacity-100" : "opacity-0")} />
                  {user.name}
                </CommandItem>
              ))}
            </CommandGroup>
            {hasMore && (
              <CommandItem
                value="__load_more__"
                keywords={[]}
                onSelect={() => {
                  if (!loadingMore) void loadMore();
                }}
                disabled={loadingMore}
                className="text-muted-foreground justify-center text-sm"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Loading…
                  </>
                ) : (
                  "Load more"
                )}
              </CommandItem>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
