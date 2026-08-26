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
    expect(screen.getByLabelText("曜日")).toHaveValue("1");
    expect(screen.getByLabelText("開始")).toHaveValue(String(9 * 60));
  });

  it("予定をタップすると編集画面を開く", async () => {
    const user = userEvent.setup();
    appFiles.set(
      "events",
      JSON.stringify([
        {
          id: "math",
          title: "数学",
          dayOfWeek: 0,
          startMinutes: 9 * 60,
          endMinutes: 10 * 60,
        },
      ]),
    );
    renderApp(<App />);
    await user.click(await screen.findByRole("button", { name: "数学" }));
    expect(await screen.findByRole("heading", { name: "予定を編集" })).toBeInTheDocument();
    expect(screen.getByLabelText("タイトル")).toHaveValue("数学");
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
