export const GRID_START_MINUTES = 6 * 60;
export const GRID_END_MINUTES = 24 * 60;
export const SLOT_MINUTES = 30;
export const SLOT_HEIGHT_PX = 40;
export const MAX_OVERLAP_COLUMNS = 3;
export const SLOT_COUNT = (GRID_END_MINUTES - GRID_START_MINUTES) / SLOT_MINUTES;

export function slotStartMinutes(index: number): number {
  return GRID_START_MINUTES + index * SLOT_MINUTES;
}

export function eventColor(startMinutes: number): string {
  const colorIndex = Math.floor((startMinutes / GRID_END_MINUTES) * 720) + 180;
  return `hsl(${colorIndex}deg 50% 50%)`;
}
