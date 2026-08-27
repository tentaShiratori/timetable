# 実装 TODO

仕様は [spec.md](./spec.md)、週グリッドの描画方針は [tech-decisions/calendar-display.md](./tech-decisions/calendar-display.md)、ウィジェットは [tech-decisions/android-widget.md](./tech-decisions/android-widget.md)。

完了したら `- [ ]` を `- [x]` にする。ここに無い機能（週送り、履歴、ドラッグ作成など）は明示依頼があるまでやらない。

## 1. 予定データ

- [x] `Event` 型（id, title, dayOfWeek, startMinutes, endMinutes, note?）
- [x] バリデーション（タイトル必須、終了 > 開始、0:00〜24:00、日またぎ禁止）
- [x] 同一曜日の重なりレイアウト（横分割。細くなりすぎたら重ねる）
- [x] 分 → グリッド上の `top` / `height` 変換（グリッド開始時刻 起点、30 分スロット）

## 2. 週グリッド

- [x] 時刻列 + 月〜日の CSS Grid（6:00〜24:00、30 分刻み）
- [x] スロット高さは固定（目安 40px）。時刻方向のみスクロール
- [x] 曜日ヘッダーを縦スクロール中も上部固定
- [x] 予定を各曜日カラムへ絶対配置（色 + 1 行省略タイトル）
- [x] 空きマスのタップ → その曜日・開始時刻で作成画面
- [x] 予定のタップ → 編集画面

## 3. 作成・編集

- [x] 作成 / 編集画面（タイトル、曜日、開始、終了、メモ）
- [x] 新規保存・更新
- [x] 削除（編集画面から）
- [x] バリデーションエラーの表示

## 4. 永続化

- [x] Tauri コマンドで予定一覧の読み書き（ローカルファイル）
- [x] 起動時に復元、変更時に保存
- [x] フロントのテスト用に `invoke` モックを予定データ向けに直す

## 5. Android

- [x] `pnpm tauri android init`（未実施なら）
- [x] 縦画面・セーフエリアを前提にしたレイアウト調整
- [ ] エミュレータまたは実機で週表示・作成・編集・再起動後の復元を確認する（手順は [android-release.md](./android-release.md)）

## 6. テスト

個別実行（`pnpm test run {ファイル名}`）。全テスト一括はしない。

- [x] バリデーション・分座標・重なりレイアウトのユニットテスト
- [x] 週グリッド: 表示、空きマスタップ、予定タップ
- [x] 作成・編集・削除のコンポーネントテスト
- [x] 保存・復元（モック I/O）

## 7. ホーム画面ウィジェット

Kotlin は `src-tauri/gen/android/app/src/main/java/com/tenta/timetable/widget/`。

- [x] Glance を使えるようにする（Kotlin 2.0.21 + Compose Compiler プラグイン）
- [x] `events.json` の読み込みとバリデーション（フロントの `parseEvents` と同じ捨て方）
- [x] 週グリッドの描画（曜日ヘッダー、時刻軸、6:00〜24:00 の 30 分スロット、重なりの横分割）
- [x] タップでアプリを開く
- [x] アプリを離れたとき（`onStop`）に更新する
- [x] `AndroidManifest.xml` へのレシーバ登録と `appwidget-provider` の定義
- [x] エミュレータで配置・描画・タップ・更新を確認

## やらない（ウィジェット）

- ウィジェット上での予定の作成・編集・削除
- 定期更新（`updatePeriodMillis`）
- 30 分に乗らない予定の正確な高さ表示
- 表示する時間帯を予定に合わせて自動で縮める
- ロック画面ウィジェット、Wear OS タイル

## 8. リマインド通知

仕様は [spec.md](./spec.md)、実装方針は [tech-decisions/notification.md](./tech-decisions/notification.md)。

- [x] Tauri 公式の notification プラグインを入れる
- [x] 通知許可を確認・未許可ならリクエストする
- [x] Android 12+ の exact alarm を確認・未許可なら設定画面を開く
- [x] Android の通知チャンネルを作る
- [x] 予定の開始 10 分前に毎週通知する（`Schedule.interval`）
- [x] 予定の追加・更新・削除・起動時に pending を組み直す
- [x] 開始が 0:00 近い予定は前日 23:50 台に回す
- [x] ユニットテスト（10 分前の時刻・曜日、プラグイン呼び出し）

## やらない（アプリ本体）

- ドラッグで範囲指定して作成
- 週送り・今日へジャンプ・現在時刻ライン
- 月表示・日表示
- Google カレンダー連携、クラウド同期
- 予定ごとのリマインド ON/OFF や「何分前か」の変更
- 過去の時間割履歴
- デスクトップ / iOS 向けの配布
