import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { renderApp } from "../../test/renderApp";
import { appFiles } from "../../test/mocks/tauri";

describe("useEvents", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("起動時に保存済みの予定を復元する", async () => {
    appFiles.set(
      "events",
      JSON.stringify([{ id: "1", title: "国語", daysOfWeek: [1], startMinutes: 8 * 60, endMinutes: 9 * 60 }]),
    );
    renderApp(<App />);
    expect(await screen.findByRole("button", { name: "国語" })).toBeInTheDocument();
  });

  it("追加した予定をファイルへ保存する", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await user.click(await screen.findByRole("button", { name: "金曜 15:00 に追加" }));
    await user.type(screen.getByLabelText("タイトル"), "帰宅");
    await user.click(screen.getByRole("button", { name: "保存" }));
    await screen.findByRole("button", { name: "帰宅" });
    const saved = JSON.parse(appFiles.get("events") ?? "[]") as Array<{ title: string; daysOfWeek: number[] }>;
    expect(saved.some((event) => event.title === "帰宅" && event.daysOfWeek.includes(5))).toBe(true);
  });

  it("古い dayOfWeek 形式を読んで保存時に daysOfWeek にする", async () => {
    const user = userEvent.setup();
    appFiles.set(
      "events",
      JSON.stringify([{ id: "1", title: "国語", dayOfWeek: 1, startMinutes: 8 * 60, endMinutes: 9 * 60 }]),
    );
    renderApp(<App />);
    await user.click(await screen.findByRole("button", { name: "国語" }));
    await user.click(await screen.findByRole("button", { name: "編集" }));
    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => {
      const saved = JSON.parse(appFiles.get("events") ?? "[]") as Array<{
        daysOfWeek?: number[];
        dayOfWeek?: number;
      }>;
      expect(saved[0]?.daysOfWeek).toEqual([1]);
      expect(saved[0]?.dayOfWeek).toBeUndefined();
    });
  });

  it("起動時に24時間以上たった todo を未完了に戻して保存する", async () => {
    const now = Date.now();
    appFiles.set(
      "events",
      JSON.stringify([
        {
          id: "1",
          title: "国語",
          daysOfWeek: [1],
          startMinutes: 8 * 60,
          endMinutes: 9 * 60,
          todos: [
            { id: "old", title: "古い", completedAt: now - 25 * 60 * 60 * 1000 },
            { id: "fresh", title: "新しい", completedAt: now - 60 * 60 * 1000 },
          ],
        },
      ]),
    );
    const user = userEvent.setup();
    renderApp(<App />);
    await user.click(await screen.findByRole("button", { name: "国語" }));
    expect(await screen.findByRole("checkbox", { name: "古い" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "新しい" })).toBeChecked();
    await waitFor(() => {
      const saved = JSON.parse(appFiles.get("events") ?? "[]") as Array<{
        todos?: Array<{ id: string; completedAt?: number }>;
      }>;
      expect(saved[0]?.todos?.find((todo) => todo.id === "old")?.completedAt).toBeUndefined();
      expect(saved[0]?.todos?.find((todo) => todo.id === "fresh")?.completedAt).toEqual(expect.any(Number));
    });
  });

  it("バックグラウンドから戻ったときに期限切れ todo を戻す", async () => {
    const start = 1_700_000_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(start);
    appFiles.set(
      "events",
      JSON.stringify([
        {
          id: "1",
          title: "国語",
          daysOfWeek: [1],
          startMinutes: 8 * 60,
          endMinutes: 9 * 60,
          todos: [{ id: "t1", title: "課題", completedAt: start }],
        },
      ]),
    );
    const user = userEvent.setup();
    renderApp(<App />);
    await user.click(await screen.findByRole("button", { name: "国語" }));
    expect(await screen.findByRole("checkbox", { name: "課題" })).toBeChecked();

    nowSpy.mockReturnValue(start + 25 * 60 * 60 * 1000);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "課題" })).not.toBeChecked();
    });
    nowSpy.mockRestore();
  });
});
