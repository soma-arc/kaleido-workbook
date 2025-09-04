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

## ディレクトリ構成（提案）
```
hyperbolic-poc/
├─ src/
│  ├─ app/App.tsx
│  ├─ geometry/
│  │  ├─ complex.ts
│  │  ├─ su11.ts        # モビウス・反射・共役
│  │  ├─ geodesic.ts    # 境界2点→円弧
│  │  └─ snap.ts        # 角度・共軛スナップ
│  ├─ engine/
│  │  ├─ group.ts       # 生成木BFS・深さ管理
│  │  └─ render.ts      # Canvas描画
│  ├─ ui/
│  │  ├─ controls.tsx   # p,q,r/角度/深さ/共役UI
│  │  └─ hud.tsx        # 角度・面積表示（任意）
│  └─ types.ts
├─ index.html
├─ package.json
├─ pnpm-lock.yaml
└─ vite.config.ts
```

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
