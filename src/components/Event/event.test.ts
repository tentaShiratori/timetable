import { describe, expect, it } from "vitest";
import {
  clearTodoCompletions,
  formatDaysOfWeek,
  formatMinutes,
  resetExpiredTodos,
  toOccurrences,
  validateEvent,
} from "./event";
import { parseEvents } from "./parseEvents";

describe("validateEvent", () => {
  const valid = {
    title: "数学",
    daysOfWeek: [0],
    startMinutes: 9 * 60,
    endMinutes: 10 * 60,
  };

  it("正しい予定はエラーなし", () => {
    expect(validateEvent(valid)).toEqual([]);
  });

  it("タイトルが空ならエラー", () => {
    expect(validateEvent({ ...valid, title: "  " })).toContain("タイトルを入力してください");
  });

  it("曜日が空ならエラー", () => {
    expect(validateEvent({ ...valid, daysOfWeek: [] })).toContain("曜日を選んでください");
  });

  it("曜日が重複ならエラー", () => {
    expect(validateEvent({ ...valid, daysOfWeek: [1, 1] })).toContain("曜日が重複しています");
  });

  it("範囲外の曜日ならエラー", () => {
    expect(validateEvent({ ...valid, daysOfWeek: [7] })).toContain("曜日が不正です");
  });

  it("終了が開始以前ならエラー", () => {
    expect(validateEvent({ ...valid, endMinutes: 9 * 60 })).toContain("終了は開始より後にしてください");
  });

  it("0:00〜24:00を外れたらエラー", () => {
    expect(validateEvent({ ...valid, startMinutes: -30 })).toContain("0:00〜24:00の範囲にしてください");
    expect(validateEvent({ ...valid, endMinutes: 24 * 60 + 30 })).toContain("0:00〜24:00の範囲にしてください");
  });

  it("24:00終了は許可する", () => {
    expect(validateEvent({ ...valid, startMinutes: 23 * 60, endMinutes: 24 * 60 })).toEqual([]);
  });

  it("やることの名前が空ならエラー", () => {
    expect(
      validateEvent({
        ...valid,
        todos: [{ id: "1", title: "  " }],
      }),
    ).toContain("やることの名前を入力してください");
  });
});

describe("formatMinutes", () => {
  it("分を時刻文字列にする", () => {
    expect(formatMinutes(0)).toBe("0:00");
    expect(formatMinutes(8 * 60)).toBe("8:00");
    expect(formatMinutes(8 * 60 + 30)).toBe("8:30");
    expect(formatMinutes(24 * 60)).toBe("24:00");
  });
});

describe("formatDaysOfWeek", () => {
  it("曜日を小さい順に並べてつなぐ", () => {
    expect(formatDaysOfWeek([2, 1])).toBe("月曜・火曜");
  });
});

describe("toOccurrences", () => {
  it("予定を曜日ごとのコマに展開する", () => {
    expect(
      toOccurrences([
        {
          id: "club",
          title: "部活",
          daysOfWeek: [1, 2],
          startMinutes: 18 * 60,
          endMinutes: 19 * 60,
        },
      ]),
    ).toEqual([
      {
        eventId: "club",
        dayOfWeek: 1,
        startMinutes: 18 * 60,
        endMinutes: 19 * 60,
        title: "部活",
      },
      {
        eventId: "club",
        dayOfWeek: 2,
        startMinutes: 18 * 60,
        endMinutes: 19 * 60,
        title: "部活",
      },
    ]);
  });
});

describe("parseEvents", () => {
  it("空や不正な JSON は空配列にする", () => {
    expect(parseEvents(null)).toEqual([]);
    expect(parseEvents("")).toEqual([]);
    expect(parseEvents("{")).toEqual([]);
    expect(parseEvents("{}")).toEqual([]);
  });

  it("妥当な予定だけ残す", () => {
    const raw = JSON.stringify([
      { id: "1", title: "英語", daysOfWeek: [1], startMinutes: 540, endMinutes: 600 },
      { id: "2", title: "", daysOfWeek: [1], startMinutes: 540, endMinutes: 600 },
    ]);
    expect(parseEvents(raw)).toEqual([
      { id: "1", title: "英語", daysOfWeek: [1], startMinutes: 540, endMinutes: 600 },
    ]);
  });

  it("古い dayOfWeek 形式を daysOfWeek に直す", () => {
    const raw = JSON.stringify([{ id: "1", title: "英語", dayOfWeek: 1, startMinutes: 540, endMinutes: 600 }]);
    expect(parseEvents(raw)).toEqual([
      { id: "1", title: "英語", daysOfWeek: [1], startMinutes: 540, endMinutes: 600 },
    ]);
  });

  it("daysOfWeek は小さい順に並べる", () => {
    const raw = JSON.stringify([
      { id: "1", title: "英語", daysOfWeek: [3, 1], startMinutes: 540, endMinutes: 600 },
    ]);
    expect(parseEvents(raw)[0]?.daysOfWeek).toEqual([1, 3]);
  });

  it("空・重複・範囲外の曜日は捨てる", () => {
    const raw = JSON.stringify([
      { id: "empty", title: "空", daysOfWeek: [], startMinutes: 540, endMinutes: 600 },
      { id: "dup", title: "重複", daysOfWeek: [1, 1], startMinutes: 540, endMinutes: 600 },
      { id: "bad", title: "範囲外", daysOfWeek: [9], startMinutes: 540, endMinutes: 600 },
      { id: "ok", title: "英語", daysOfWeek: [1], startMinutes: 540, endMinutes: 600 },
    ]);
    expect(parseEvents(raw).map((event) => event.id)).toEqual(["ok"]);
  });

  it("todos がない既存データも読める", () => {
    const raw = JSON.stringify([{ id: "1", title: "英語", dayOfWeek: 1, startMinutes: 540, endMinutes: 600 }]);
    expect(parseEvents(raw)[0]?.todos).toBeUndefined();
  });

  it("todos を含めて読む", () => {
    const raw = JSON.stringify([
      {
        id: "1",
        title: "英語",
        daysOfWeek: [1],
        startMinutes: 540,
        endMinutes: 600,
        todos: [
          { id: "t1", title: "単語", completedAt: 1000 },
          { id: "t2", title: "" },
          { id: "t3", title: "音読" },
        ],
      },
    ]);
    expect(parseEvents(raw)[0]?.todos).toEqual([
      { id: "t1", title: "単語", completedAt: 1000 },
      { id: "t3", title: "音読" },
    ]);
  });
});

describe("resetExpiredTodos", () => {
  const hour = 60 * 60 * 1000;
  const now = 1_000_000_000_000;

  it("ちょうど24時間たった項目は未完了に戻す", () => {
    expect(resetExpiredTodos([{ id: "1", title: "課題", completedAt: now - 24 * hour }], now)).toEqual([
      { id: "1", title: "課題" },
    ]);
  });

  it("24時間未満の項目はそのまま残す", () => {
    expect(resetExpiredTodos([{ id: "1", title: "課題", completedAt: now - 24 * hour + 1 }], now)).toEqual([
      { id: "1", title: "課題", completedAt: now - 24 * hour + 1 },
    ]);
  });

  it("未チェックの項目はそのまま残す", () => {
    expect(resetExpiredTodos([{ id: "1", title: "課題" }], now)).toEqual([{ id: "1", title: "課題" }]);
  });

  it("期限切れと期限内が混在しても項目ごとに判定する", () => {
    expect(
      resetExpiredTodos(
        [
          { id: "1", title: "古い", completedAt: now - 25 * hour },
          { id: "2", title: "新しい", completedAt: now - hour },
          { id: "3", title: "未完了" },
        ],
        now,
      ),
    ).toEqual([
      { id: "1", title: "古い" },
      { id: "2", title: "新しい", completedAt: now - hour },
      { id: "3", title: "未完了" },
    ]);
  });
});

describe("clearTodoCompletions", () => {
  it("チェック済みと未チェックが混在しても全部から completedAt を消す", () => {
    expect(
      clearTodoCompletions([
        { id: "1", title: "単語", completedAt: 1000 },
        { id: "2", title: "音読" },
        { id: "3", title: "宿題", completedAt: 2000 },
      ]),
    ).toEqual([
      { id: "1", title: "単語" },
      { id: "2", title: "音読" },
      { id: "3", title: "宿題" },
    ]);
  });

  it("空リストはそのまま返す", () => {
    expect(clearTodoCompletions([])).toEqual([]);
  });

  it("id と title は保つ", () => {
    const result = clearTodoCompletions([{ id: "keep", title: "残す", completedAt: 42 }]);
    expect(result).toEqual([{ id: "keep", title: "残す" }]);
  });
});
