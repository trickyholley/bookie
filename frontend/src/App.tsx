import { NavLink, Route, Routes } from "react-router";
import { BrowsePage } from "@/routes/BrowsePage";
import { OrdersPage } from "@/routes/OrdersPage";
import { ReportPage } from "@/routes/ReportPage";
import { UserCombobox } from "@/components/UserCombobox";
import { CartDrawer } from "@/components/CartDrawer";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "font-semibold" : "text-muted-foreground";

function App() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
        <nav className="flex gap-4">
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
        <div className="flex items-center gap-2">
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
