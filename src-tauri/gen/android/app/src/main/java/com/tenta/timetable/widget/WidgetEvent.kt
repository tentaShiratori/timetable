package com.tenta.timetable.widget

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

internal const val DAY_MINUTES = 24 * 60

internal data class WidgetEvent(
  val id: String,
  val title: String,
  val dayOfWeek: Int,
  val startMinutes: Int,
  val endMinutes: Int,
)

/**
 * アプリ本体が Tauri コマンド経由で書き出したファイルを読む。
 * Tauri の app_data_dir は Android では Context.getDataDir() を指す。
 */
internal fun readEventsRaw(context: Context): String {
  return runCatching { eventsFile(context).readText() }.getOrDefault("")
}

/** 内容が変わったかどうかだけ分かればよいので更新時刻を使う。 */
internal fun eventsVersion(context: Context): Long {
  return runCatching { eventsFile(context).lastModified() }.getOrDefault(0L)
}

private fun eventsFile(context: Context): File = File(context.dataDir, "events.json")

/**
 * フロントの parseEvents / toOccurrences と同じく、壊れた行は捨てて曜日ごとに展開する。
 * 古い dayOfWeek 形式も読む。
 */
internal fun parseEvents(raw: String): List<WidgetEvent> {
  val array = runCatching { JSONArray(raw) }.getOrNull() ?: return emptyList()
  val events = mutableListOf<WidgetEvent>()
  for (index in 0 until array.length()) {
    val json = array.optJSONObject(index) ?: continue
    events += toEvents(json)
  }
  return events
}

private fun toEvents(json: JSONObject): List<WidgetEvent> {
  val id = json.optString("id")
  val title = json.optString("title").trim()
  if (id.isEmpty() || title.isEmpty()) {
    return emptyList()
  }
  val startMinutes = json.optInt("startMinutes", -1)
  val endMinutes = json.optInt("endMinutes", -1)
  if (startMinutes < 0 || endMinutes > DAY_MINUTES || endMinutes <= startMinutes) {
    return emptyList()
  }
  val days = parseDaysOfWeek(json) ?: return emptyList()
  return days.map { dayOfWeek -> WidgetEvent(id, title, dayOfWeek, startMinutes, endMinutes) }
}

private fun parseDaysOfWeek(json: JSONObject): List<Int>? {
  if (json.has("daysOfWeek")) {
    val array = json.optJSONArray("daysOfWeek") ?: return null
    if (array.length() == 0) {
      return null
    }
    val days = mutableListOf<Int>()
    val seen = mutableSetOf<Int>()
    for (index in 0 until array.length()) {
      val value = array.opt(index)
      if (value !is Number) {
        return null
      }
      val day = value.toInt()
      if (day < 0 || day > 6 || !seen.add(day)) {
        return null
      }
      days += day
    }
    return days.sorted()
  }
  if (!json.has("dayOfWeek")) {
    return null
  }
  val dayOfWeek = json.optInt("dayOfWeek", -1)
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    return null
  }
  return listOf(dayOfWeek)
}
