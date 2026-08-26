import { describe, expect, it } from "vitest";
import type { Event } from "../../components/Event/event";
import { GRID_START_MINUTES, SLOT_HEIGHT_PX, SLOT_MINUTES } from "./grid";
import { layoutDayEvents } from "./layout";

function event(partial: Partial<Event> & Pick<Event, "id">): Event {
  return {
    title: partial.title ?? partial.id,
    dayOfWeek: 0,
    startMinutes: 9 * 60,
    endMinutes: 10 * 60,
    ...partial,
  };
}

describe("layoutDayEvents", () => {
  it("グリッド開始時刻を起点に top / height を計算する", () => {
    const [block] = layoutDayEvents([
      event({ id: "a", startMinutes: GRID_START_MINUTES, endMinutes: GRID_START_MINUTES + SLOT_MINUTES }),
    ]);
    expect(block?.top).toBe(0);
    expect(block?.height).toBe(SLOT_HEIGHT_PX);
  });

  it("30 分に乗らない時刻も同じ式で置く", () => {
    const start = GRID_START_MINUTES + 70;
    const end = GRID_START_MINUTES + 145;
    const [block] = layoutDayEvents([event({ id: "a", startMinutes: start, endMinutes: end })]);
    expect(block?.top).toBeCloseTo((70 / SLOT_MINUTES) * SLOT_HEIGHT_PX);
    expect(block?.height).toBe(((end - start) / SLOT_MINUTES) * SLOT_HEIGHT_PX);
  });

  it("重ならない予定は幅を分割しない", () => {
    const blocks = layoutDayEvents([
      event({ id: "a", startMinutes: 8 * 60, endMinutes: 9 * 60 }),
      event({ id: "b", startMinutes: 9 * 60, endMinutes: 10 * 60 }),
    ]);
    expect(blocks.every((block) => block.columnCount === 1)).toBe(true);
  });

  it("重なりは横に分割する", () => {
    const blocks = layoutDayEvents([
      event({ id: "a", startMinutes: 9 * 60, endMinutes: 11 * 60 }),
      event({ id: "b", startMinutes: 10 * 60, endMinutes: 12 * 60 }),
    ]);
    expect(blocks).toHaveLength(2);
    expect(blocks.every((block) => block.columnCount === 2)).toBe(true);
    expect(new Set(blocks.map((block) => block.columnIndex))).toEqual(new Set([0, 1]));
  });

  it("4 件以上重なったら 3 列までにし、余りは重ねる", () => {
    const blocks = layoutDayEvents([event({ id: "a" }), event({ id: "b" }), event({ id: "c" }), event({ id: "d" })]);
    expect(blocks.every((block) => block.columnCount === 3)).toBe(true);
    expect(new Set(blocks.map((block) => block.columnIndex)).size).toBeLessThanOrEqual(3);
  });

  it("表示範囲外の予定は置かない", () => {
    const events = [event({ id: "a", startMinutes: GRID_START_MINUTES - 120, endMinutes: GRID_START_MINUTES - 60 })];
    expect(layoutDayEvents(events)).toEqual([]);
  });
});
