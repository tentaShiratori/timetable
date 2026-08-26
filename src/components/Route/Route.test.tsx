import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "../../test/renderApp";
import { useRouter } from "./useRouter";
import { Route } from "./Route";

function RouteHarness() {
  const router = useRouter();
  return (
    <div>
      <button type="button" onClick={() => router.push("/a")}>
        go-a
      </button>
      <button type="button" onClick={() => router.push("/b")}>
        go-b
      </button>
      <button type="button" onClick={() => router.back()}>
        back
      </button>
      <Route path="/a">
        <p>Page A</p>
      </Route>
      <Route path="/b">
        <p>Page B</p>
      </Route>
    </div>
  );
}

describe("Route", () => {
  it("現在のパスに一致する子だけを表示する", async () => {
    const user = userEvent.setup();
    renderApp(<RouteHarness />);

    expect(screen.queryByText("Page A")).not.toBeInTheDocument();
    expect(screen.queryByText("Page B")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "go-a" }));
    expect(screen.getByText("Page A")).toBeInTheDocument();
    expect(screen.queryByText("Page B")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "go-b" }));
    expect(screen.getByText("Page B")).toBeInTheDocument();
    expect(screen.queryByText("Page A")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "back" }));
    expect(screen.getByText("Page A")).toBeInTheDocument();
  });
});
