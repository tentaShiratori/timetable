import { describe, expect, it } from "vitest";
import { appFiles } from "../../test/mocks/tauri";
import { loadScheduledIds, saveScheduledIds } from "./scheduledIds";

describe("scheduledIds", () => {
  it("空や不正な JSON は空配列にする", async () => {
    expect(await loadScheduledIds()).toEqual([]);
    appFiles.set("reminder_ids", "{");
    expect(await loadScheduledIds()).toEqual([]);
    appFiles.set("reminder_ids", "1");
    expect(await loadScheduledIds()).toEqual([]);
  });

  it("整数だけ残して読み書きする", async () => {
    appFiles.set("reminder_ids", '[1, 2.5, "3", 4]');
    expect(await loadScheduledIds()).toEqual([1, 4]);
    await saveScheduledIds([7, 7, 8]);
    expect(await loadScheduledIds()).toEqual([7, 8]);
  });
});
