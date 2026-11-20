import type { Occurrence } from "../../components/Event/event";
import { GRID_END_MINUTES, GRID_START_MINUTES, MAX_OVERLAP_COLUMNS, SLOT_HEIGHT_PX, SLOT_MINUTES } from "./grid";

export type EventBlock = {
  occurrence: Occurrence;
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

function overlaps(a: Occurrence, b: Occurrence): boolean {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

export function layoutDayEvents(occurrences: Occurrence[]): EventBlock[] {
  const visible = occurrences.filter(
    (occurrence) => occurrence.endMinutes > GRID_START_MINUTES && occurrence.startMinutes < GRID_END_MINUTES,
  );
  const sorted = [...visible].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }
    if (a.endMinutes !== b.endMinutes) {
      return a.endMinutes - b.endMinutes;
    }
    return a.eventId.localeCompare(b.eventId);
  });

  const clusters: Occurrence[][] = [];
  let current: Occurrence[] | null = null;
  for (const occurrence of sorted) {
    if (current !== null && current.some((item) => overlaps(item, occurrence))) {
      current.push(occurrence);
    } else {
      current = [occurrence];
      clusters.push(current);
    }
  }

  return clusters.flatMap(layoutCluster);
}

function layoutCluster(cluster: Occurrence[]): EventBlock[] {
  // 列ごとに「最後に置いた予定」だけ持てば、次の予定を入れられるか判定できる
  const columnTails: Occurrence[] = [];
  const columnById = new Map<string, number>();

  for (const occurrence of cluster) {
    let column = columnTails.findIndex((tail) => !overlaps(tail, occurrence));
    if (column === -1) {
      column = columnTails.length;
    }
    columnTails[column] = occurrence;
    columnById.set(occurrence.eventId, column);
  }

  const columnCount = Math.min(Math.max(columnTails.length, 1), MAX_OVERLAP_COLUMNS);

  return cluster.map((occurrence) => {
    const start = Math.max(occurrence.startMinutes, GRID_START_MINUTES);
    const end = Math.min(occurrence.endMinutes, GRID_END_MINUTES);
    const rawColumn = columnById.get(occurrence.eventId) ?? 0;
    return {
      occurrence,
      top: minutesToTop(start),
      height: durationToHeight(start, end),
      columnIndex: rawColumn % columnCount,
      columnCount,
    };
  });
}
