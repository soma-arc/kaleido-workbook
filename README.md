# Hyperbolic Plane PoC

Poincaré 円板上で「三鏡 (p,q,r)」「ジオデシック」「角度スナップ」「群展開」「共役操作」を確認できる最小アプリ（Web, Canvas 2D）を目指す PoC です。

- タイムゾーン: Asia/Tokyo
- 方針: シンプルな実装・3 分以内でローカル起動
- 技術: TypeScript + React + Vite + pnpm、Canvas 2D（Three 等は不使用）
- Linter/Formatter: Biome（インデント 4 スペース）
- テスト: Vitest（coverage provider: v8）
- CI: GitHub Actions

## 目的（MVP）
- Poincaré 円板の描画（境界円固定）
- ジオデシック: 境界上 2 点クリック → 境界直交円弧生成（直径なら直線）
- 角度スナップ: 交点で π/n（n∈{2,3,4,5,6,8,10,12}）, 90°, 接(0°) をトグル吸着
- 三鏡 (p,q,r) ロック: 3 交角を (π/p, π/q, π/r) に固定
- 群で複製: 反射生成を BFS で深さ D まで適用しモチーフ展開
- 共役操作: ディスク自己同型 φ_{z0,θ} による位置/回転バリエーション
- 出力: PNG スクリーンショット（SVG は任意）

## セットアップ（草案）
前提: Node.js v22、pnpm を使用

```bash
# 依存関係のインストール
pnpm i

# 開発サーバ起動（http://localhost:5173 など）
pnpm dev

# 型チェック
pnpm typecheck

# Lint（Biome）
pnpm lint

# フォーマット（Biome）
pnpm format

# テスト（Vitest）
pnpm test

# カバレッジ（Vitest, provider=v8）
pnpm coverage

# ビルド/プレビュー
pnpm build
pnpm preview
```

スクリプトは `package.json` に定義予定（MILESTONE-0）。`lint/format` は Biome を、`test/coverage` は Vitest（provider: v8）を想定します。

## ディレクトリ構成（仕様）
実装は未着手のため、まずは「場所」と「責務」の取り決めのみを定義します。`tests/` は `src/` と同じ階層（リポジトリ直下）に置きます。

```
hyperbolic-poc/
├─ src/                       # アプリ本体（React + TS + Vite）
│  ├─ app/                    # ルート/レイアウト/エントリ（App.tsx 等）
│  ├─ geometry/               # Poincaré円盤, SU(1,1), 反射/共役, ジオデシック
│  ├─ engine/                 # 群展開、描画ループ、カリング
│  ├─ ui/                     # コントロール類（(p,q,r), 角度ピッカー, 深さ, 共役）
│  ├─ state/                  # 最小のアプリ状態（Zustand 等は任意）
│  ├─ hooks/                  # React hooks（座標変換/DPI/入力）
│  ├─ styles/                 # スタイル（CSS/変数）
│  ├─ assets/                 # 画像/アイコン（必要なら）
│  └─ types.ts                # 共有型
│
├─ tests/                     # テスト一式（TDD ポリシー）
│  ├─ acceptance/             # 受け入れテスト（人間が作成・ロック）
│  ├─ unit/                   # 単体: src 配下にミラー構成で配置
│  │  ├─ geometry/            # 例: geometry の純関数検証
│  │  ├─ engine/
│  │  └─ ui/
│  ├─ property/               # プロパティテスト（fast-check 等）
│  ├─ integration/            # 連携/境界条件テスト（必要に応じて）
│  └─ fixtures/               # サンプル入力/期待値
│
├─ public/                    # 静的ファイル（Vite）
│  └─ favicon.svg（任意）
│
├─ .github/
│  └─ workflows/ci.yml        # CI: typecheck / biome(lint/format-check) / test(coverage v8)
│
├─ scripts/                   # 開発用スクリプト（hook 設定等）
│  └─ setup-hooks.*           # pre-commit / pre-push の登録（任意）
│
├─ index.html                 # Vite エントリ（root）
├─ package.json               # pnpm scripts, 依存
├─ pnpm-lock.yaml
├─ tsconfig.json              # TS 設定（strict）
├─ vite.config.ts             # Vite 設定
├─ vitest.config.ts           # Vitest + coverage provider v8
├─ biome.json                 # Lint/Format（インデント4）
└─ README.md / TODO.md / LICENSE
```

テスト検出規約（予定）
- パターン: `tests/{acceptance,unit,property,integration}/**/*.{test,spec}.{ts,tsx}` および `src/**/*.{test,spec}.{ts,tsx}`
- 受け入れテストは `tests/acceptance/` に配置（人間が作成・ロック。エージェントは変更不可）
- 単体テストは `tests/unit/<srcのミラー>/...` に配置（例: `src/geometry/su11.ts` → `tests/unit/geometry/su11.test.ts`）
- プロパティテストは `tests/property/` に配置（fast-check などを使用）
- 連携テストは `tests/integration/` に配置（必要に応じて）
- カバレッジ: Vitest（provider: v8）を使用

## 実装上の要点（抜粋）
- ジオデシック: 境界上の 2 点 P,Q から境界直交円を求める（反対径なら直線）
- 交差角: 円1/円2 の中心距離 d, 半径 r1,r2 で
  `cos α = (r1^2 + r2^2 − d^2) / (2 r1 r2)`
- 反射生成: 鏡変換 M を配列管理、語長 ≤ D で BFS、隣接の裏返し抑止
- 共役: 変換 T を φ T φ^{-1} に置換し描画/UIへ即反映
- パフォーマンス: 画面外/極小プリミティブのカリング、DPI 対応

## コーディング規約（最小）
- TypeScript `strict: true`
- Biome による lint/format（インデント 4 スペース、セミコロン有）
- 命名は lowerCamelCase（関数/変数）、UpperCamelCase（型/コンポーネント）
- 幾何ユーティリティは副作用なしの純関数を優先

## CI（最小）
- GitHub Actions を利用
- PR 時に `pnpm i`, `pnpm typecheck`, `pnpm lint`（Biome）, `pnpm test`（coverage v8） を実行

## コミットポリシー / ワークフロー
- 小さなコミットを心がける（1 コミット = 1 目的）
- コミット前チェック（手動 or 自動）
  - `pnpm lint`（Biome）
  - `pnpm format`（Biome；`--check` 運用可）
  - `pnpm test`（Vitest；必要に応じ `pnpm coverage`）
- Git hooks（pre-commit / pre-push）で自動実行し、失敗時はブロック
- CI でも同等チェックを実施し、失敗時はマージ不可

## ロードマップ
- 詳細は `TODO.md` を参照

## ライセンス
- `LICENSE` を参照

## 開発方針：TDDで幾何ライブラリを構築する
- 受け入れテストは人間が作成しロックします（AI は変更しません）。
- エージェント（AI）は、ユニットテスト／プロパティテストの追加と実装を小刻みに進めます（Red → Green → Refactor）。

### 最初の対象（Circle × Circle）
- API: `circleCircleIntersection(a: Circle, b: Circle): IntersectResult`
- 返却規約:
  - `kind`: `'none'|'tangent'|'two'|'concentric'|'coincident'`
  - `points`: 交点（0/1/2 点）。2 点の場合は x→y の昇順で返す（安定ソート）。

### 過去の暫定方針（非推奨）
- 以前は「既存 JS を一次オラクルとして adapter で包む」「シャドー比較で差分収集」「開発時のみ残差チェックと JSONL 追記」といった戦術を採用していましたが、TDD 方針に統一したため現在は非推奨です。

## テスト実行
```bash
pnpm test
pnpm test -- --watch
```

## TDD の進め方（推奨）
- 人間が `tests/acceptance/**` に代表 6 ケース（分離/外接/内接/二交点/同心/同一）を作成
- エージェントが `tests/unit/**` に最小の Red を追加 → 実装 → Green
- エージェントが `tests/property/**` にプロパティテストを追加（交点の方程式残差、変換不変、対称性）
- リファクタ（数式コメント、補助関数の抽出）

## 注意
- 受け入れテストは変更禁止（仕様ロック）
- 近接数値は `toBeCloseTo(value, 12)` を基準
- 返却順序と分類ルールを必ず守る
