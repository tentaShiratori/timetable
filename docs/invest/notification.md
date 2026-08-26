## 通知機能(tauri-apps/plugin-notification)に関する調査

- cancelAllはバグっている、なので必ずidを割り振ったうえでcancel(id)しないと通知が残ってしまう
- 一度使ったidは再利用できる
- 同一idでタイトルや本文を変えても同じ通知として扱われ、上書きされる

### Schedule.at

- 秒で指定しても丸められて1分単位での通知になる

### Schedule.interval

- CRON形式 (https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/notification/android/src/main/java/TauriNotificationManager.kt#L345)

### Schedule.every

TBD
