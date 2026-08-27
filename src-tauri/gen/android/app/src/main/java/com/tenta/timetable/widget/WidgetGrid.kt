@file:OptIn(ExperimentalGraphicsApi::class)

package com.tenta.timetable.widget

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ExperimentalGraphicsApi
import java.util.Calendar

internal const val SLOT_MINUTES = 30
internal const val MAX_OVERLAP_COLUMNS = 3

/** アプリの週グリッドと同じく 6:00〜24:00 を常に表示する。 */
internal const val GRID_START_MINUTES = 6 * 60
internal const val GRID_END_MINUTES = 24 * 60
internal const val GRID_SLOT_COUNT = (GRID_END_MINUTES - GRID_START_MINUTES) / SLOT_MINUTES

/** アプリの `DayOfWeek` と同じ。0 = 日曜 … 6 = 土曜。 */
internal object DayOfWeek {
  const val SUNDAY = 0
  const val MONDAY = 1
  const val TUESDAY = 2
  const val WEDNESDAY = 3
  const val THURSDAY = 4
  const val FRIDAY = 5
  const val SATURDAY = 6
}

/** index は dayOfWeek（0 = 日曜 … 6 = 土曜）。 */
internal val DAY_LABELS = listOf("日", "月", "火", "水", "木", "金", "土")

/** 表示順はアプリと同じく月曜始まり。 */
internal val DAY_LABEL_ORDER = listOf(
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
)

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

/**
 * アプリの `eventColor` と同じ。開始時刻から色相を決める。
 * Compose の HSL は 0..360 なので、CSS が受け付ける 360 超は剰余する。
 */
internal fun eventColor(startMinutes: Int): Color {
  val hue = ((startMinutes.toFloat() / GRID_END_MINUTES) * 720).toInt() + 180
  return Color.hsl(Math.floorMod(hue, 360).toFloat(), 0.5f, 0.5f)
}

/** Calendar.DAY_OF_WEEK（1 = 日曜）をアプリの dayOfWeek（0 = 日曜）にする。 */
internal fun toDayOfWeek(calendarDayOfWeek: Int): Int {
  return calendarDayOfWeek - Calendar.SUNDAY
}
