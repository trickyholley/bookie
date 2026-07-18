import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MockedProvider } from "@apollo/client/testing/react";
import { MemoryRouter } from "react-router";
import App from "../App";
import { CurrentUserProvider } from "@/context/UserContext";
import { CartProvider } from "@/context/CartContext";

describe("App shell", () => {
  it("renders navigation to all three required views", () => {
    render(
      <MockedProvider>
        <CurrentUserProvider>
          <CartProvider>
            <MemoryRouter>
              <App />
            </MemoryRouter>
          </CartProvider>
        </CurrentUserProvider>
      </MockedProvider>,
    );

    expect(screen.getByRole("link", { name: "Browse" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Orders" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Report" })).toBeInTheDocument();
  });
});
