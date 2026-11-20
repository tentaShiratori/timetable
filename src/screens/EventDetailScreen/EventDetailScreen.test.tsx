import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../../App";
import { renderApp } from "../../test/renderApp";
import { appFiles } from "../../test/mocks/tauri";

describe("EventDetailScreen", () => {
  it("予定をタップすると詳細画面が開き todo を切り替えられる", async () => {
    const user = userEvent.setup();
    appFiles.set(
      "events",
      JSON.stringify([
        {
          id: "math",
          title: "数学",
          daysOfWeek: [1],
          startMinutes: 9 * 60,
          endMinutes: 10 * 60,
          todos: [{ id: "t1", title: "宿題" }],
        },
      ]),
    );
    renderApp(<App />);
    await user.click(await screen.findByRole("button", { name: "数学" }));
    expect(await screen.findByRole("heading", { name: "数学" })).toBeInTheDocument();
    expect(screen.getByText("月曜 9:00〜10:00")).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox", { name: "宿題" });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    await waitFor(() => {
      const saved = JSON.parse(appFiles.get("events") ?? "[]") as Array<{
        todos?: Array<{ completedAt?: number }>;
      }>;
      expect(saved[0]?.todos?.[0]?.completedAt).toEqual(expect.any(Number));
    });
  });

  it("チェックを外すと completedAt が消える", async () => {
    const user = userEvent.setup();
    appFiles.set(
      "events",
      JSON.stringify([
        {
          id: "math",
          title: "数学",
          daysOfWeek: [1],
          startMinutes: 9 * 60,
          endMinutes: 10 * 60,
          todos: [{ id: "t1", title: "宿題", completedAt: Date.now() - 60_000 }],
        },
      ]),
    );
    renderApp(<App />);
    await user.click(await screen.findByRole("button", { name: "数学" }));
    const checkbox = await screen.findByRole("checkbox", { name: "宿題" });
    expect(checkbox).toBeChecked();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    await waitFor(() => {
      const saved = JSON.parse(appFiles.get("events") ?? "[]") as Array<{
        todos?: Array<{ completedAt?: number }>;
      }>;
      expect(saved[0]?.todos?.[0]?.completedAt).toBeUndefined();
    });
  });

  it("複数曜日のコマから開いても todo は共有される", async () => {
    const user = userEvent.setup();
    appFiles.set(
      "events",
      JSON.stringify([
        {
          id: "club",
          title: "部活",
          daysOfWeek: [1, 2],
          startMinutes: 18 * 60,
          endMinutes: 19 * 60,
          todos: [{ id: "t1", title: "シューズ" }],
        },
      ]),
    );
    renderApp(<App />);
    const blocks = await screen.findAllByRole("button", { name: "部活" });
    await user.click(blocks[0]!);
    await user.click(await screen.findByRole("checkbox", { name: "シューズ" }));
    await user.click(screen.getByRole("button", { name: "戻る" }));
    await user.click((await screen.findAllByRole("button", { name: "部活" }))[1]!);
    expect(await screen.findByRole("checkbox", { name: "シューズ" })).toBeChecked();
  });
});
