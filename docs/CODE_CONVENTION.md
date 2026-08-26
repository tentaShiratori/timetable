# コード規約

このリポジトリの TypeScript / React の書き方。仕様（何を作るか）は [spec.md](./spec.md)、実装順は [todo.md](./todo.md)。ここでは「どう書くか」だけを扱う。

フォーマッタ・リンタが機械的に守ることは、ここに重複して書かない。`oxfmt` / `oxlint` / `import-lint` / `knip` の設定を正とする。

## ディレクトリ

```
src/
  App.tsx                 # ルート。画面を Route でつなぐ
  screens/{Name}/         # 1 画面 = 1 ディレクトリ
    {Name}.tsx
  components/{Name}/      # 再利用 UI。フックや補助も同ディレクトリ
    {Name}.tsx
    useXxx.ts
    {Name}.test.tsx
  test/                   # テスト専用ヘルパー・モック（アプリ本体からは import しない）
```

- 画面は `screens/`、画面をまたいで使う UI は `components/`。ロジックだけ先に `src/lib` などへ切り出さない。使う画面の隣に置く
- ファイル名はコンポーネント・画面が PascalCase、フックが camelCase（`useRouter.ts`）
- テストは対象の隣に `{Name}.test.tsx`。ヘルパーと Tauri モックだけ `src/test/`

## パッケージ境界

`.importlintrc.jsonc` により、**ディレクトリ 1 つがカプセル化境界**である。

- デフォルトの export はパッケージプライベート。同じディレクトリ内では自由に import できる
- **ディレクトリをまたいで使うものだけ** `/** @public */` を付ける
- 利用側は公開ファイルを直接 import する。都合のための `index.ts` バレルは作らない
- `src/test/` と `*.test.tsx` は import-lint 対象外

```tsx
/** @public */
export function WeekScreen() {
  return <section className="week-screen">...</section>;
}
```

同じディレクトリの内部関数・atom・型に `@public` を付けない。外から必要になったときだけ付ける。

## コンポーネントと状態

- 関数コンポーネントのみ。クラスコンポーネントは使わない
- **named export の関数宣言**にする。`App` だけ Vite 都合の default export
- 共有状態は jotai。atom はそれを使うフックと同じファイルに置き、export しない。外へ出すのはフックだけ
- ルーティングは `Route` / `useRouter` を使う。react-router などは足さない
- スタイルはグローバル CSS（`App.css`）。クラス名は kebab-case で、画面・部品名をプレフィックスにする（`.week-screen`）。CSS Modules / CSS-in-JS は使わない
- 色・フォントは `:root` の CSS 変数を使う。新規のハードコード色を増やさない

```tsx
/** @public */
export function WeekScreen() { ... }

// App 以外で default export しない
```

## TypeScript

- `strict`。`any` を書かない。未使用の変数・引数を残さない
- props と公開フックの戻りは型を明示する
- 相対パスで import する（パスエイリアスは使わない）
- 型だけの import は `import type` またはインライン `type`

## ファイルサイズ

`oxlint` の `max-lines`（上限 300）を超えない。近づいたら **同じディレクトリ** にファイルを分ける。境界をまたぐ必要がなければ `@public` は付けない。

## テスト

- Vitest + Testing Library。アプリの描画は必ず `renderApp`（jotai の `Provider` 付き）を使う。素の `render` は使わない
- `describe` / `it` は日本語。ユーザーに見える文言も日本語
- 操作は `userEvent`。クリック対象は可能な限り `getByRole`
- Tauri の I/O は `src/test/mocks/tauri.ts` のモックを使う。テストから実ネイティブを叩かない
- 実行は `pnpm test run {ファイル名}` のみ。全テスト一括はしない

```tsx
describe("Route", () => {
  it("現在のパスに一致する子だけを表示する", async () => {
    const user = userEvent.setup();
    renderApp(<RouteHarness />);
    await user.click(screen.getByRole("button", { name: "go-a" }));
    expect(screen.getByText("Page A")).toBeInTheDocument();
  });
});
```

## フロントと Tauri

- ファイルの読み書きは Tauri コマンド経由だけ。フロントから直接ファイルシステムに触れない
- コマンドを足したら `src/test/mocks/tauri.ts` も同じ契約で更新する

## やらないこと

- 仕様・TODO に無いライブラリの追加（入れるなら先に `docs/tech-decisions/`）
- デスクトップ / iOS 向けの分岐
- 週送り・月表示など、v0.1 対象外の画面
