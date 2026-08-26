import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../../App";
import { renderApp } from "../../test/renderApp";
import { appFiles } from "../../test/mocks/tauri";

describe("useEvents", () => {
  it("起動時に保存済みの予定を復元する", async () => {
    appFiles.set(
      "events",
      JSON.stringify([{ id: "1", title: "国語", dayOfWeek: 1, startMinutes: 8 * 60, endMinutes: 9 * 60 }]),
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
    const saved = JSON.parse(appFiles.get("events") ?? "[]") as Array<{ title: string }>;
    expect(saved.some((event) => event.title === "帰宅")).toBe(true);
  });
});
