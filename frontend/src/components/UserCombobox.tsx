import { useState } from "react";
import { Check, ChevronsUpDown, UserRound } from "lucide-react";
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
import { useUsersQuery } from "@/graphql/queries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCurrentUser } from "@/context/UserContext";

// Backend-filtered rather than client-filtered: with ~1,000 users, shipping
// the whole list to the browser and filtering in JS would be wasteful, so
// the search string is debounced and sent as the `users(search)` variable.
export function UserCombobox() {
  const { userId, setUserId } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);

  const { data, loading } = useUsersQuery({ search: debouncedSearch || undefined, limit: 20 });
  const users = data?.users ?? [];
  const selectedUser = users.find((user) => user.id === userId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={selectedUser ? `Selected user: ${selectedUser.name}` : "Select a user"}
            className="w-56 justify-between"
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
