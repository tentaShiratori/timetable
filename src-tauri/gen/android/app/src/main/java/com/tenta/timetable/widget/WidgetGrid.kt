package com.tenta.timetable.widget

internal const val SLOT_MINUTES = 30
internal const val MAX_OVERLAP_COLUMNS = 3

/** アプリの週グリッドと同じく 6:00〜24:00 を常に表示する。 */
internal const val GRID_START_MINUTES = 6 * 60
internal const val GRID_END_MINUTES = 24 * 60
internal const val GRID_SLOT_COUNT = (GRID_END_MINUTES - GRID_START_MINUTES) / SLOT_MINUTES

internal val DAY_LABELS = listOf("月", "火", "水", "木", "金", "土", "日")

/** 計装テストからノードを特定するための目印。 */
internal const val DAY_LABEL_TAG = "widget-day-label"
internal const val TIME_LABEL_TAG = "widget-time-label"
internal const val EVENT_TAG = "widget-event"

/**
 * そのスロットに重なる予定。同時に並べられる本数はアプリと同じく上限を設ける。
 */
internal fun eventsAt(dayEvents: List<WidgetEvent>, slotStartMinutes: Int): List<WidgetEvent> {
  val slotEndMinutes = slotStartMinutes + SLOT_MINUTES
  return dayEvents
    .filter { it.startMinutes < slotEndMinutes && slotStartMinutes < it.endMinutes }
    .sortedWith(compareBy({ it.startMinutes }, { it.endMinutes }, { it.id }))
    .take(MAX_OVERLAP_COLUMNS)
}

/** タイトルは予定が始まるスロットにだけ出す。以降のスロットは色だけで続きを表す。 */
internal fun startsInSlot(event: WidgetEvent, slotStartMinutes: Int): Boolean {
  val visibleStart = maxOf(event.startMinutes, GRID_START_MINUTES)
  return visibleStart >= slotStartMinutes && visibleStart < slotStartMinutes + SLOT_MINUTES
}

internal fun formatMinutes(minutes: Int): String {
  if (minutes >= DAY_MINUTES) {
    return "24:00"
  }
  return "${minutes / 60}:${(minutes % 60).toString().padStart(2, '0')}"
}
