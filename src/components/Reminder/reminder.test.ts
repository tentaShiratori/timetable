import { describe, expect, it } from "vitest";
import type { Event } from "../Event/event";
import { reminderBody, reminderFireAt, reminderNotificationId } from "./reminder";

function event(overrides: Partial<Event> = {}): Event {
  return {
    id: "math",
    title: "数学",
    dayOfWeek: 0,
    startMinutes: 9 * 60,
    endMinutes: 10 * 60,
    ...overrides,
  };
}

describe("reminderFireAt", () => {
  it("開始の10分前をプラグインの weekday・時・分にする", () => {
    expect(reminderFireAt(event())).toEqual({ weekday: 2, hour: 8, minute: 50 });
  });

  it("日曜はプラグインの weekday 1 にする", () => {
    expect(reminderFireAt(event({ dayOfWeek: 6, startMinutes: 9 * 60 }))).toEqual({
      weekday: 1,
      hour: 8,
      minute: 50,
    });
  });

  it("0:00を跨ぐときは前日の23:50台にする", () => {
    expect(reminderFireAt(event({ dayOfWeek: 0, startMinutes: 5 }))).toEqual({
      weekday: 1,
      hour: 23,
      minute: 55,
    });
    expect(reminderFireAt(event({ dayOfWeek: 6, startMinutes: 5 }))).toEqual({
      weekday: 7,
      hour: 23,
      minute: 55,
    });
  });

  it("ちょうど10分の開始は同じ日の0:00にする", () => {
    expect(reminderFireAt(event({ startMinutes: 10 }))).toEqual({ weekday: 2, hour: 0, minute: 0 });
  });
});

describe("reminderBody", () => {
  it("開始と終了を本文に入れる", () => {
    expect(reminderBody(event())).toBe("10分後に開始（9:00〜10:00）");
  });
});

describe("reminderNotificationId", () => {
  it("同じ予定 id は同じ 32bit 整数にする", () => {
    expect(reminderNotificationId("math")).toBe(reminderNotificationId("math"));
    expect(reminderNotificationId("")).toBe(1);
  });
});
