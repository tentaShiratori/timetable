const EVENT_COLORS = ["var(--accent)", "var(--event-coral)", "var(--event-gold)", "var(--accent-bright)"] as const;

export function eventColor(id: string): string {
  let hash = 0;
  for (const char of id) {
    hash = (hash + char.charCodeAt(0)) % EVENT_COLORS.length;
  }
  return EVENT_COLORS[hash] ?? EVENT_COLORS[0];
}
