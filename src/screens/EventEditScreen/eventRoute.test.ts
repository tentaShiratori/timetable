import { describe, expect, it } from "vitest";
import { detailEventPath, editEventPath, newEventPath, parseDetailEventRoute, parseEventRoute } from "./eventRoute";

describe("eventRoute", () => {
  it("新規作成パスを組み立てて解析する", () => {
    expect(newEventPath(1, 540)).toBe("/event/new/1/540");
    expect(parseEventRoute("/event/new/1/540")).toEqual({
      mode: "create",
      dayOfWeek: 1,
      startMinutes: 540,
    });
  });

  it("詳細パスを組み立てて解析する", () => {
    expect(detailEventPath("pe")).toBe("/event/pe");
    expect(parseDetailEventRoute("/event/pe")).toEqual({ id: "pe" });
    expect(parseDetailEventRoute("/event/pe/edit")).toBeNull();
    expect(parseEventRoute("/event/pe")).toBeNull();
  });

  it("編集パスを組み立てて解析する", () => {
    expect(editEventPath("pe")).toBe("/event/pe/edit");
    expect(parseEventRoute("/event/pe/edit")).toEqual({ mode: "edit", id: "pe" });
    expect(parseDetailEventRoute("/event/new")).toBeNull();
  });

  it("エンコードされた id を扱う", () => {
    expect(editEventPath("a/b")).toBe("/event/a%2Fb/edit");
    expect(parseEventRoute("/event/a%2Fb/edit")).toEqual({ mode: "edit", id: "a/b" });
    expect(parseDetailEventRoute("/event/a%2Fb")).toEqual({ id: "a/b" });
  });
});
