import { useState } from "react";
import { Menu } from "lucide-react";
import { NavLink } from "react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Browse", end: true },
  { to: "/orders", label: "Orders", end: false },
  { to: "/report", label: "Report", end: false },
];

// Below md, the inline nav links are hidden (see App.tsx) in favor of this
// sheet-based menu, so the user combobox and cart button stay reachable
// instead of being squeezed out by three nav links on a narrow viewport.
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open menu" />}>
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Bookie</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
