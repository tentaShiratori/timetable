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
2. `createChannel`（Android 8+。チャンネルが無いと出ない）
3. `cancelAll` のあと、現行の予定ごとに `sendNotification({ schedule })`

`sendNotification` は注入された `window.Notification` 経由で `plugin:notification|notify` を呼ぶ。`schedule` もそのペイロードに載る。

### 曜日の対応

アプリは `0 = 月曜 … 6 = 日曜`。プラグインの `weekday` は Java `Calendar.DAY_OF_WEEK` と同じで `1 = 日曜 … 7 = 土曜`。

開始の 10 分前が 0:00 を跨ぐときは、曜日を 1 日戻して 23:50 台にする。

### `allowWhileIdle`

Doze 中でも 10 分前に近づけたいので `allowWhileIdle: true` にする。プラグインは exact alarm が使える端末では `setExactAndAllowWhileIdle` を使う。

プラグインの AndroidManifest には `POST_NOTIFICATIONS` と起動時復元用の `RECEIVE_BOOT_COMPLETED` はあるが、`SCHEDULE_EXACT_ALARM` は無い。Android 12+ で exact にするにはアプリ側 Manifest に足す。

### 通知の identifer

プラグインは 32-bit 整数の `id` しか受けない。予定の UUID を安定なハッシュにして、同じ予定の再登録で上書きされるようにする。

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
- ACL: `notification:default`（`notify` / 許可確認 / チャンネル / `cancel`）
- Android: プラグイン側の `POST_NOTIFICATIONS` に加え、アプリ Manifest に `SCHEDULE_EXACT_ALARM`
