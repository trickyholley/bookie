import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MockedProvider } from "@apollo/client/testing/react";
import { MemoryRouter } from "react-router";
import App from "../App";

describe("App shell", () => {
  it("renders navigation to all three required views", () => {
    render(
      <MockedProvider>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </MockedProvider>,
    );

    expect(screen.getByRole("link", { name: "Browse" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Orders" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Report" })).toBeInTheDocument();
  });
});
