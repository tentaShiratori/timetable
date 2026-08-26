import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import { renderApp } from "./test/renderApp";

describe("App", () => {
  it("起動時に週表示を出す", () => {
    renderApp(<App />);
    expect(screen.getByRole("heading", { name: "時間割" })).toBeInTheDocument();
  });
});
