# AGENTS.md

このリポジトリで作業するエージェント向けの指針。

## ドキュメント

- 仕様は `docs/` にまとめる。機能追加・変更時は該当ドキュメントを更新する
- 実装の進め方は `docs/todo.md` を正とする
- コードの書き方は `docs/CODE_CONVENTION.md` を正とする
- 技術選定の比較・判断は `docs/tech-decisions/` に書く
- ユーザー向けの概要・起動方法は `README.md` に書く

## 現状スコープ

- **時間割**（週グリッドでの予定の追加・編集・削除・ローカル保存）と **Android ホーム画面ウィジェット**（閲覧のみ）を実装対象とする
- UI は **週表示 / 予定の作成・編集** を中心にする
- 週送り・月表示・通知・クラウド同期などは、明示的な依頼があるまで追加しない
- 詳細は `docs/spec.md` を正とする

## Android ネイティブ

- ウィジェットは Kotlin（Jetpack Glance）で `src-tauri/gen/android/app/src/main/java/com/tenta/timetable/widget/` に置く
- `src-tauri/gen/android` は Tauri の生成物だが手書きコードを含む。`pnpm tauri android init` を再実行してはならない
- Glance の制約（1 コンテナ子要素 10 個まで、lazy の入れ子不可）と更新の仕組みは `docs/tech-decisions/android-widget.md` を正とする

## コード規約（要点）

詳細は `docs/CODE_CONVENTION.md`。実装時は従う。

- 画面は `src/screens/{Name}/`、再利用 UI は `src/components/{Name}/`。テストは対象の隣
- ディレクトリをまたぐ export には `/** @public */` が必要（import-lint）
- コンポーネントは named export の関数宣言。`App` のみ default export
- 共有状態は jotai（atom は export せずフックだけ出す）。ルーティングは既存の `Route` / `useRouter`
- テストは `renderApp` と日本語の `it`。実行は `pnpm test run {ファイル名}` のみ
- ファイルは 300 行以内。スタイルは `App.css` の CSS 変数と kebab-case クラス

## 技術・運用

- スタック: Tauri 2 + React + TypeScript + Vite、パッケージマネージャは pnpm
- 対象は Android のみ（デスクトップ / iOS は扱わない）
- テストは `pnpm test run {ファイル名}` で個別実行する。全テスト一括実行はしない
- コミット・プッシュ・PR 作成はユーザーから明示的に依頼されたときのみ行う
- シェルで `sed` / `wc` / `python` は使わない
- ユーザーへの返答は日本語で行う
