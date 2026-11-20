import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../../App";
import { renderApp } from "../../test/renderApp";
import { appFiles } from "../../test/mocks/tauri";

async function openEdit(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.click(await screen.findByRole("button", { name: title }));
  await user.click(await screen.findByRole("button", { name: "編集" }));
  expect(await screen.findByRole("heading", { name: "予定を編集" })).toBeInTheDocument();
}

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
      JSON.stringify([{ id: "pe", title: "体育", dayOfWeek: 5, startMinutes: 13 * 60, endMinutes: 14 * 60 }]),
    );
    renderApp(<App />);
    await openEdit(user, "体育");
    const title = screen.getByLabelText("タイトル");
    await user.clear(title);
    await user.type(title, "保健");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByRole("heading", { name: "保健" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "戻る" }));
    expect(await screen.findByRole("button", { name: "保健" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "体育" })).not.toBeInTheDocument();
  });

  it("予定を削除できる", async () => {
    const user = userEvent.setup();
    appFiles.set(
      "events",
      JSON.stringify([{ id: "art", title: "美術", dayOfWeek: 3, startMinutes: 11 * 60, endMinutes: 12 * 60 }]),
    );
    renderApp(<App />);
    await openEdit(user, "美術");
    await user.click(screen.getByRole("button", { name: "削除" }));
    expect(await screen.findByRole("heading", { name: "時間割" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "美術" })).not.toBeInTheDocument();
  });

  it("編集画面で todo を追加して保存すると詳細に反映される", async () => {
    const user = userEvent.setup();
    appFiles.set(
      "events",
      JSON.stringify([{ id: "math", title: "数学", dayOfWeek: 1, startMinutes: 9 * 60, endMinutes: 10 * 60 }]),
    );
    renderApp(<App />);
    await openEdit(user, "数学");
    await user.click(screen.getByRole("button", { name: "やることを追加" }));
    await user.type(screen.getByLabelText("項目 1"), "プリント");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByRole("checkbox", { name: "プリント" })).toBeInTheDocument();
  });

  it("編集画面で戻ると todo の変更は破棄される", async () => {
    const user = userEvent.setup();
    appFiles.set(
      "events",
      JSON.stringify([
        {
          id: "math",
          title: "数学",
          dayOfWeek: 1,
          startMinutes: 9 * 60,
          endMinutes: 10 * 60,
          todos: [{ id: "t1", title: "宿題" }],
        },
      ]),
    );
    renderApp(<App />);
    await openEdit(user, "数学");
    await user.click(screen.getByRole("button", { name: "やることを追加" }));
    await user.type(screen.getByLabelText("項目 2"), "復習");
    await user.click(screen.getByRole("button", { name: "戻る" }));
    expect(await screen.findByRole("checkbox", { name: "宿題" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "復習" })).not.toBeInTheDocument();
  });

  it("毎日で作ると7件それぞれに同じ todo が入る", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await user.click(await screen.findByRole("button", { name: "月曜 8:00 に追加" }));
    await user.type(screen.getByLabelText("タイトル"), "朝練");
    await user.click(screen.getByRole("button", { name: "やることを追加" }));
    await user.type(screen.getByLabelText("項目 1"), "準備体操");
    await user.click(screen.getByRole("button", { name: "保存（毎日）" }));
    await screen.findByRole("heading", { name: "時間割" });
    const saved = JSON.parse(appFiles.get("events") ?? "[]") as Array<{
      title: string;
      todos?: Array<{ id: string; title: string }>;
    }>;
    const daily = saved.filter((event) => event.title === "朝練");
    expect(daily).toHaveLength(7);
    expect(daily.every((event) => event.todos?.[0]?.title === "準備体操")).toBe(true);
    const todoIds = new Set(daily.map((event) => event.todos?.[0]?.id));
    expect(todoIds.size).toBe(7);
  });
});
