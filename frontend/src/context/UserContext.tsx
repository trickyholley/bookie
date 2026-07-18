import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useSearchParams } from "react-router";
import { useUsersQuery } from "@/graphql/queries";
import { setUrlParam } from "@/lib/url-params";

const STORAGE_KEY = "bookie:currentUserId";
const PARAM_KEY = "user";

interface CurrentUserContextValue {
  userId: string | null;
  setUserId: (userId: string | null) => void;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(
    () => searchParams.get(PARAM_KEY) ?? localStorage.getItem(STORAGE_KEY),
  );

  // A shared link, or the back/forward buttons, can change the `user` param
  // out from under us — adopt it. It only ever *sets* userId here, never
  // clears it, since a plain route change (no `user` param at all) shouldn't
  // be read as "deselect the user."
  useEffect(() => {
    const fromUrl = searchParams.get(PARAM_KEY);
    if (fromUrl && fromUrl !== userId) {
      setUserId(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Persist the selection, and mirror it into whichever route's URL is
  // currently active so links/bookmarks stay reproducible. Re-reading
  // `window.location.search` (rather than trusting the `prev` argument)
  // avoids a race with other components' own useSearchParams-based updates
  // (e.g. BrowsePage's filters) landing in the same render pass.
  useEffect(() => {
    if (userId) {
      localStorage.setItem(STORAGE_KEY, userId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setUrlParam(setSearchParams, PARAM_KEY, userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, location.pathname]);

  // Nobody selected yet (fresh browser: no URL param, no localStorage) — pick
  // the first user alphabetically so the rest of the app never has to sit in
  // a no-user limbo state.
  const { data } = useUsersQuery({ limit: 1 });
  useEffect(() => {
    if (!userId && data?.users[0]) {
      setUserId(data.users[0].id);
    }
  }, [userId, data]);

  const value = useMemo(() => ({ userId, setUserId }), [userId]);

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  }
  return ctx;
}
