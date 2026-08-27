@file:OptIn(ExperimentalGraphicsApi::class)

package com.tenta.timetable.widget

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ExperimentalGraphicsApi
import androidx.test.ext.junit.runners.AndroidJUnit4
import java.util.Calendar
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/** 壊れた要素を捨てることを確かめるので、正しい行と壊れた行を混ぜてある。 */
private const val RAW_EVENTS = """
[
  {"id":"a","title":"数学","dayOfWeek":0,"startMinutes":540,"endMinutes":600},
  {"id":"b","title":"","dayOfWeek":1,"startMinutes":540,"endMinutes":600},
  {"id":"c","title":"英語","dayOfWeek":9,"startMinutes":540,"endMinutes":600},
  {"id":"d","title":"国語","dayOfWeek":2,"startMinutes":600,"endMinutes":540},
  "こわれた行"
]
"""

private fun event(id: String, startMinutes: Int, endMinutes: Int) =
  WidgetEvent(id = id, title = id, dayOfWeek = 0, startMinutes = startMinutes, endMinutes = endMinutes)

@RunWith(AndroidJUnit4::class)
class WidgetGridTest {
  @Test
  fun グリッドは6時から24時までの30分スロットになる() {
    assertEquals(6 * 60, GRID_START_MINUTES)
    assertEquals(36, GRID_SLOT_COUNT)
    assertEquals(24 * 60, GRID_START_MINUTES + GRID_SLOT_COUNT * SLOT_MINUTES)
  }

  @Test
  fun eventsAtはスロットに重なる予定だけを返す() {
    val overlapping = event("重なる", 9 * 60, 10 * 60)
    val before = event("前", 8 * 60, 9 * 60)
    val after = event("後", 10 * 60, 11 * 60)

    val found = eventsAt(listOf(before, overlapping, after), 9 * 60 + 30)

    assertEquals(listOf("重なる"), found.map { it.id })
  }

  @Test
  fun eventsAtは同時に並べる本数に上限を設ける() {
    val events = (1..5).map { event("予定$it", 9 * 60, 10 * 60) }

    assertEquals(MAX_OVERLAP_COLUMNS, eventsAt(events, 9 * 60).size)
  }

  @Test
  fun グリッド開始より前に始まる予定は先頭スロットで始まる扱いになる() {
    val early = event("早朝", 5 * 60, 7 * 60)

    assertTrue(startsInSlot(early, GRID_START_MINUTES))
    assertFalse(startsInSlot(early, GRID_START_MINUTES + SLOT_MINUTES))
  }

  @Test
  fun 日付をまたぐ手前の時刻は24時と表示する() {
    assertEquals("24:00", formatMinutes(24 * 60))
    assertEquals("9:30", formatMinutes(9 * 60 + 30))
  }

  @Test
  fun parseEventsは壊れた要素を捨てる() {
    val events = parseEvents(RAW_EVENTS)

    assertEquals(listOf("a"), events.map { it.id })
  }

  @Test
  fun parseEventsはJSONでない文字列を空として扱う() {
    assertEquals(emptyList<WidgetEvent>(), parseEvents("これはJSONではない"))
  }

  @Test
  fun eventColorは開始時刻から色相を決める() {
    assertEquals(Color.hsl(180f, 0.5f, 0.5f), eventColor(0))
    assertEquals(Color.hsl(0f, 0.5f, 0.5f), eventColor(6 * 60))
    assertEquals(Color.hsl(180f, 0.5f, 0.5f), eventColor(12 * 60))
    assertEquals(Color.hsl(180f, 0.5f, 0.5f), eventColor(24 * 60))
  }

  @Test
  fun DAY_LABEL_ORDERは月曜始まりでラベルはdayOfWeekに対応する() {
    assertEquals(listOf("月", "火", "水", "木", "金", "土", "日"), DAY_LABEL_ORDER.map { DAY_LABELS[it] })
  }

  @Test
  fun toDayOfWeekはCalendarの日曜始まりをアプリの0から6にする() {
    assertEquals(DayOfWeek.SUNDAY, toDayOfWeek(Calendar.SUNDAY))
    assertEquals(DayOfWeek.MONDAY, toDayOfWeek(Calendar.MONDAY))
    assertEquals(DayOfWeek.SATURDAY, toDayOfWeek(Calendar.SATURDAY))
  }
}
