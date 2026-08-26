import type { Event } from "../../components/Event/event";
import { GRID_END_MINUTES, GRID_START_MINUTES, MAX_OVERLAP_COLUMNS, SLOT_HEIGHT_PX, SLOT_MINUTES } from "./grid";

export type EventBlock = {
  event: Event;
  top: number;
  height: number;
  columnIndex: number;
  columnCount: number;
};

function minutesToTop(minutes: number): number {
  return ((minutes - GRID_START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT_PX;
}

function durationToHeight(startMinutes: number, endMinutes: number): number {
  return ((endMinutes - startMinutes) / SLOT_MINUTES) * SLOT_HEIGHT_PX;
}

function overlaps(a: Event, b: Event): boolean {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

export function layoutDayEvents(events: Event[]): EventBlock[] {
  const visible = events.filter(
    (event) => event.endMinutes > GRID_START_MINUTES && event.startMinutes < GRID_END_MINUTES,
  );
  const sorted = [...visible].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }
    if (a.endMinutes !== b.endMinutes) {
      return a.endMinutes - b.endMinutes;
    }
    return a.id.localeCompare(b.id);
  });

  const clusters: Event[][] = [];
  let current: Event[] | null = null;
  for (const event of sorted) {
    if (current !== null && current.some((item) => overlaps(item, event))) {
      current.push(event);
    } else {
      current = [event];
      clusters.push(current);
    }
  }

  return clusters.flatMap(layoutCluster);
}

function layoutCluster(cluster: Event[]): EventBlock[] {
  // 列ごとに「最後に置いた予定」だけ持てば、次の予定を入れられるか判定できる
  const columnTails: Event[] = [];
  const columnById = new Map<string, number>();

  for (const event of cluster) {
    let column = columnTails.findIndex((tail) => !overlaps(tail, event));
    if (column === -1) {
      column = columnTails.length;
    }
    columnTails[column] = event;
    columnById.set(event.id, column);
  }

  const columnCount = Math.min(Math.max(columnTails.length, 1), MAX_OVERLAP_COLUMNS);

  return cluster.map((event) => {
    const start = Math.max(event.startMinutes, GRID_START_MINUTES);
    const end = Math.min(event.endMinutes, GRID_END_MINUTES);
    const rawColumn = columnById.get(event.id) ?? 0;
    return {
      event,
      top: minutesToTop(start),
      height: durationToHeight(start, end),
      columnIndex: rawColumn % columnCount,
      columnCount,
    };
  });
}
