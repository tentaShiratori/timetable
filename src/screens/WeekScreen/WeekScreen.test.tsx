import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../../App";
import { renderApp } from "../../test/renderApp";
import { appFiles } from "../../test/mocks/tauri";

describe("WeekScreen", () => {
  it("曜日と時刻のグリッドを表示する", async () => {
    renderApp(<App />);
    expect(await screen.findByRole("columnheader", { name: "月" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "日" })).toBeInTheDocument();
    expect(screen.getByText("8:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "月曜 8:00 に追加" })).toBeInTheDocument();
  });

  it("空きマスをタップすると作成画面を開く", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await user.click(await screen.findByRole("button", { name: "火曜 9:00 に追加" }));
    expect(await screen.findByRole("heading", { name: "予定を追加" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "火" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("開始")).toHaveValue(String(9 * 60));
  });

  it("予定をタップすると詳細画面を開く", async () => {
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
        },
      ]),
    );
    renderApp(<App />);
    await user.click(await screen.findByRole("button", { name: "数学" }));
    expect(await screen.findByRole("heading", { name: "数学" })).toBeInTheDocument();
    expect(screen.getByText("月曜 9:00〜10:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "編集" })).toBeInTheDocument();
  });

  it("複数曜日の予定はそれぞれのコマに出て同じ詳細を開く", async () => {
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
        },
      ]),
    );
    renderApp(<App />);
    const blocks = await screen.findAllByRole("button", { name: "部活" });
    expect(blocks).toHaveLength(2);
    await user.click(blocks[0]!);
    expect(await screen.findByRole("heading", { name: "部活" })).toBeInTheDocument();
    expect(screen.getByText("月曜・火曜 18:00〜19:00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "戻る" }));
    await user.click((await screen.findAllByRole("button", { name: "部活" }))[1]!);
    expect(await screen.findByRole("heading", { name: "部活" })).toBeInTheDocument();
    expect(screen.getByText("月曜・火曜 18:00〜19:00")).toBeInTheDocument();
  });

  it("今日の曜日がハイライトされる", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date("2026-08-26") });
    renderApp(<App />);
    expect(await screen.findByText("月")).not.toHaveClass("week-day-header-today");
    expect(screen.getByText("火")).not.toHaveClass("week-day-header-today");
    expect(screen.getByText("水")).toHaveClass("week-day-header-today");
    expect(screen.getByText("木")).not.toHaveClass("week-day-header-today");
    expect(screen.getByText("金")).not.toHaveClass("week-day-header-today");
    expect(screen.getByText("土")).not.toHaveClass("week-day-header-today");
    expect(screen.getByText("日")).not.toHaveClass("week-day-header-today");
    vi.useRealTimers();
  });
});
