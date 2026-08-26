import { useEffect } from "react";
import type { Event } from "../Event/event";
import { syncReminders } from "./syncReminders";

/**
 * @public
 */
export function useReminders(events: Event[], ready: boolean): void {
  useEffect(() => {
    if (!ready) {
      return;
    }
    void syncReminders(events);
  }, [events, ready]);
}
