import { describe, expect, it } from "vitest";
import { formatMinutes, parseEvents, validateEvent } from "./event";

describe("validateEvent", () => {
  const valid = {
    title: "数学",
    dayOfWeek: 0,
    startMinutes: 9 * 60,
    endMinutes: 10 * 60,
  };

  it("正しい予定はエラーなし", () => {
    expect(validateEvent(valid)).toEqual([]);
  });

  it("タイトルが空ならエラー", () => {
    expect(validateEvent({ ...valid, title: "  " })).toContain("タイトルを入力してください");
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
});

describe("formatMinutes", () => {
  it("分を時刻文字列にする", () => {
    expect(formatMinutes(0)).toBe("0:00");
    expect(formatMinutes(8 * 60)).toBe("8:00");
    expect(formatMinutes(8 * 60 + 30)).toBe("8:30");
    expect(formatMinutes(24 * 60)).toBe("24:00");
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
      { id: "1", title: "英語", dayOfWeek: 1, startMinutes: 540, endMinutes: 600 },
      { id: "2", title: "", dayOfWeek: 1, startMinutes: 540, endMinutes: 600 },
    ]);
    expect(parseEvents(raw)).toEqual([{ id: "1", title: "英語", dayOfWeek: 1, startMinutes: 540, endMinutes: 600 }]);
  });
});
