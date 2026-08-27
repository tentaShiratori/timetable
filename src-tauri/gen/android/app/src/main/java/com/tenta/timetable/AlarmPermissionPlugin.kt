package com.tenta.timetable

import android.app.Activity
import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@TauriPlugin
class AlarmPermissionPlugin(private val activity: Activity) : Plugin(activity) {
  @Command
  fun isPermissionGranted(invoke: Invoke) {
    val ret = JSObject()
    ret.put("granted", canScheduleExactAlarms())
    invoke.resolve(ret)
  }

  @Command
  fun requestPermission(invoke: Invoke) {
    if (!canScheduleExactAlarms() && !requestedThisProcess) {
      requestedThisProcess = true
      val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
        data = Uri.parse("package:${activity.packageName}")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      activity.runOnUiThread {
        activity.startActivity(intent)
      }
    }
    invoke.resolve()
  }

  private fun canScheduleExactAlarms(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      return true
    }
    val alarmManager = activity.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return alarmManager.canScheduleExactAlarms()
  }

  companion object {
    @Volatile
    private var requestedThisProcess = false
  }
}
