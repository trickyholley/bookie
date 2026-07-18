import { NavLink, Route, Routes } from "react-router";
import { BrowsePage } from "@/routes/BrowsePage";
import { OrdersPage } from "@/routes/OrdersPage";
import { ReportPage } from "@/routes/ReportPage";
import { UserCombobox } from "@/components/UserCombobox";
import { CartDrawer } from "@/components/CartDrawer";
import { MobileNav } from "@/components/MobileNav";
import { cn } from "@/lib/utils";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-full px-3 py-1 text-sm font-medium transition-colors",
    isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
  );

function App() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-2 border-b px-4 py-4 sm:gap-4 sm:px-6">
        <NavLink
          to="/"
          end
          className="border-accent-foreground/40 flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xl"
        >
          <span aria-hidden="true">📖</span>
          <span className="font-logo text-accent-foreground font-semibold tracking-tight">Bookie</span>
        </NavLink>
        <nav className="ml-4 hidden gap-1 md:ml-8 md:flex">
          <NavLink to="/" end className={navLinkClass}>
            Browse
          </NavLink>
          <NavLink to="/orders" className={navLinkClass}>
            Orders
          </NavLink>
          <NavLink to="/report" className={navLinkClass}>
            Report
          </NavLink>
        </nav>
        <div className="md:hidden">
          <MobileNav />
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <UserCombobox />
          <CartDrawer />
        </div>
      </header>

      <Routes>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </div>
  );
}

export default App;
