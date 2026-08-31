# 予定のリマインド通知

- 日付: 2026-08-26
- 状態: 採用（実装済み）
- 対象: [spec.md](../spec.md) のリマインド

## 結論

予定の **10 分前** に OS 通知を出す。実装は自前の AlarmManager / WorkManager ではなく、Tauri 2 公式の [`tauri-plugin-notification`](https://v2.tauri.app/plugin/notification/) に合わせる。

時間割は日付を持たず毎週同じ枠なので、一度きりの `Schedule.at(Date)` ではなく **`Schedule.interval({ weekday, hour, minute }, allowWhileIdle)`** を使う。プラグインが Android の `AlarmManager` に載せ、再起動後は `LocalNotificationRestoreReceiver` が復元する。

## 前提

- 対象は Android のみ。スケジュール付き通知は公式プラグインでもモバイル限定
- 予定の追加・編集・削除はアプリ内だけ。変更のたびに pending を組み直せば足りる
- 予定ごとの ON/OFF や「何分前か」の設定は持たない。全件 10 分前で固定

## 採用: 公式プラグイン + 週次 interval

フロントから次の手順で送る（[公式の使い方](https://v2.tauri.app/plugin/notification/) と同じ）。

1. `isPermissionGranted` / 未許可なら `requestPermission`（Android 13+ の `POST_NOTIFICATIONS`）
2. `isAlarmPermissionGranted` / 未許可なら `requestAlarmPermission`（Android 12+ の exact alarm。ダイアログは出せないので設定画面を開く）
3. `createChannel`（Android 8+。チャンネルが無いと出ない）
4. 消えた予定の通知だけ `cancel(ids)` し、現行の予定ごとに `sendNotification({ schedule })`

`cancelAll` は Android で引数なし `cancel` になり、Kotlin の `lateinit var notifications` が初期化されず落ちる（[調査](../invest/notification.md)）。通知 id は予定の UUID から決め、一度使った id は再利用できる。消した予定の id は `cancel` が成功するまで `reminder_ids.json` に残す。

`sendNotification` は注入された `window.Notification` 経由で `plugin:notification|notify` を呼ぶ。`schedule` もそのペイロードに載る。

### 曜日の対応

アプリは `0 = 日曜 … 6 = 土曜`（`Date#getDay` と同じ）。プラグインの `weekday` は Java `Calendar.DAY_OF_WEEK` と同じで `1 = 日曜 … 7 = 土曜`。変換は `weekday = dayOfWeek + 1`。

開始の 10 分前が 0:00 を跨ぐときは、曜日を 1 日戻して 23:50 台にする。

### `allowWhileIdle`

Doze 中でも 10 分前に近づけたいので `allowWhileIdle: true` にする。プラグインは exact alarm が使える端末では `setExactAndAllowWhileIdle` を使う。

プラグインの AndroidManifest には `POST_NOTIFICATIONS` と起動時復元用の `RECEIVE_BOOT_COMPLETED` はあるが、`SCHEDULE_EXACT_ALARM` は無い。Android 12+ で exact にするにはアプリ側 Manifest に足す。

`SCHEDULE_EXACT_ALARM` はランタイム権限ではない。アプリ内に許可ダイアログは出せず、未許可なら `Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM` で設定画面を開く。実装は Kotlin の `AlarmPermissionPlugin`（`isPermissionGranted` / `requestPermission`）を、Rust の `is_alarm_permission_granted` / `request_alarm_permission` から呼ぶ。フロントは通知と同じく、確認してから未許可のときだけリクエストする。同一プロセスでは設定画面を一度だけ開く。許可が取れなくても通知自体は組む（inexact に落ちる）。

### 通知の identifer

プラグインは 32-bit 整数の `id` しか受けない。予定の UUID を安定なハッシュにして、同じ予定の再登録で上書きされるようにする。消した予定の id は `cancel(ids)` が通るまで `reminder_ids.json` に残す。

## 棄却したもの

**Kotlin で AlarmManager を直書き**

ウィジェットと同様に `gen/android` へ足せるが、Tauri の通知プラグインがすでに同じ経路（`TimedNotificationPublisher` + 再起動復元）を持っている。二重実装になる。

**アプリ起動中だけ `setTimeout` / ポーリング**

バックグラウンドや再起動のあとに届かない。時間割のリマインドとしては足りない。

**`Schedule.at(次の発生時刻)` を毎回計算**

毎週同じなので interval の方が、アプリを開かない週でもプラグイン側の再スケジュールに乗せる。

## 権限・capabilities

- JS: `@tauri-apps/plugin-notification`
- Rust: `tauri-plugin-notification` を `lib.rs` で `init`
- ACL: `notification:default`（`notify` / 許可確認 / チャンネル / `cancel`）、`allow-is-alarm-permission-granted` / `allow-request-alarm-permission`
- Android: プラグイン側の `POST_NOTIFICATIONS` に加え、アプリ Manifest に `SCHEDULE_EXACT_ALARM`

## release ビルドと R8

`notify` は Rust → Kotlin の `NotificationPlugin.show` に JSON が渡り、Jackson が `Notification` / `NotificationSchedule`（`Interval` の `DateMatch` など）に変換してから `AlarmManager` に登録する。

release は `isMinifyEnabled = true` のため R8 がプラグイン側クラスを難読化・削除しうる。`tauri-plugin-notification` の `consumer-rules.pro` は空に近く、アプリ側で keep しないと **schedule 付き notify が黙って失敗**する（即時通知だけなら通る場合もある）。症状は通知許可 ON でも pending alarm 0 件、logcat に Tauri/Notification の debug が出ない（release では Logger 自体が無効）。

`src-tauri/gen/android/app/proguard-rules.pro` で `app.tauri.notification.**` を keep する。実機で keep あり/なしの release を比較し、keep なしではリマインドが届かないことを確認済み。
