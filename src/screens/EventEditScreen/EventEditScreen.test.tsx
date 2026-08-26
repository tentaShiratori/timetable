import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../../App";
import { renderApp } from "../../test/renderApp";
import { appFiles } from "../../test/mocks/tauri";

describe("EventEditScreen", () => {
  it("予定を追加できる", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await user.click(await screen.findByRole("button", { name: "水曜 10:00 に追加" }));
    await user.type(screen.getByLabelText("タイトル"), "英語");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByRole("button", { name: "英語" })).toBeInTheDocument();
  });

  it("バリデーションエラーを表示する", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await user.click(await screen.findByRole("button", { name: "月曜 8:00 に追加" }));
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("タイトルを入力してください");
  });

  it("予定を更新できる", async () => {
    const user = userEvent.setup();
    appFiles.set(
      "events",
      JSON.stringify([{ id: "pe", title: "体育", dayOfWeek: 4, startMinutes: 13 * 60, endMinutes: 14 * 60 }]),
    );
    renderApp(<App />);
    await user.click(await screen.findByRole("button", { name: "体育" }));
    const title = screen.getByLabelText("タイトル");
    await user.clear(title);
    await user.type(title, "保健");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByRole("button", { name: "保健" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "体育" })).not.toBeInTheDocument();
  });

  it("予定を削除できる", async () => {
    const user = userEvent.setup();
    appFiles.set(
      "events",
      JSON.stringify([{ id: "art", title: "美術", dayOfWeek: 2, startMinutes: 11 * 60, endMinutes: 12 * 60 }]),
    );
    renderApp(<App />);
    await user.click(await screen.findByRole("button", { name: "美術" }));
    await user.click(screen.getByRole("button", { name: "削除" }));
    expect(await screen.findByRole("heading", { name: "時間割" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "美術" })).not.toBeInTheDocument();
  });
});
