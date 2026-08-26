import { describe, it, expect } from "vitest";
import { eventColor } from "./grid";

describe("eventColor", () => {
  it("0時の色相は0度", () => {
    expect(eventColor(0)).toBe("hsl(180deg 50% 50%)");
  });
  it("6時の色相は90度", () => {
    expect(eventColor(6 * 60)).toBe("hsl(360deg 50% 50%)");
  });
  it("12時の色相は180度", () => {
    expect(eventColor(12 * 60)).toBe("hsl(540deg 50% 50%)");
  });
  it("24時の色相は360度", () => {
    expect(eventColor(24 * 60)).toBe("hsl(900deg 50% 50%)");
  });
});
