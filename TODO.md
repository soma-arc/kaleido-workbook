# TODO / Roadmap

目的: Poincaré 円板上の「三鏡 (p,q,r)」「ジオデシック」「角度スナップ」「群展開」「共役」を確認できる最小アプリ（Web, Canvas 2D）。

記法: 所要目安は開発者 1 名・集中作業ベース。AC=受け入れ条件。

---

## MILESTONE-0: プロジェクト雛形 / CI / Biome / Vitest
- 所要目安: 0.5–1.0 日
- タスク
  - Vite + React + TypeScript の雛形作成（`pnpm create vite` 相当）
  - pnpm セットアップ（`pnpm i`, `pnpm dev`）
  - Biome 設定（lint/format、インデント 4 スペース）+ TypeScript 厳格化
  - Vitest 導入（`test`）と coverage（provider: `v8`）設定（`coverage`）
  - `package.json` スクリプト整備：`dev` `build` `preview` `typecheck` `lint`（Biome）`format`（Biome）`test`（Vitest）`coverage`（Vitest v8）
  - tsconfig の厳格化（`strict: true` など）
  - CI（GitHub Actions）: `typecheck` + `lint`（Biome）+ `test`（coverage v8 レポート）
  - Git hooks の導入（Husky もしくはシンプルな `.git/hooks`）
    - pre-commit: `pnpm lint` → `pnpm format --check` → `pnpm test`
    - pre-push: `pnpm test`（必要に応じて coverage）
- AC
  - `pnpm i && pnpm dev` で 3 分以内にローカル起動
  - `pnpm typecheck` と `pnpm lint`（Biome）が成功
  - `pnpm test` が成功し、`pnpm coverage` で v8 カバレッジが出力
  - pre-commit でのチェック失敗時にコミットがブロックされる
  - コミットは小さく、README/AGENTS にポリシーが明示
  - README の手順通りに再現可能

## MILESTONE-1: 幾何コア（SU(1,1), 反射, ジオデシック）
- 所要目安: 2.0–3.0 日
- タスク
  - `src/geometry/complex.ts`: 複素数ユーティリティ（演算、正規化、近似比較 `≈`）
  - `src/geometry/su11.ts`: SU(1,1) 行列とモビウス/反モビウス変換、反射（円/直線）
  - `src/geometry/geodesic.ts`: 境界上 2 点→境界直交円弧（直径ケースは直線）
  - `src/geometry/snap.ts`: 角度スナップ（π/n, 90°, 接線）としきい値設計
  - 数値安定: ε/正規化方針、ピクセル距離によるスナップ閾値
- AC
  - 単体ロジックで、任意の境界 2 点からジオデシックが一意に得られる
  - 反射の合成が正しく SU(1,1) の範囲に正規化される
  - 角度計算: `cos α = (r1^2 + r2^2 − d^2) / (2 r1 r2)` による交差角が期待通り

## MILESTONE-2: UI（角度ピッカー, (p,q,r), 深さスライダ, 共役）
- 所要目安: 1.5–2.5 日
- タスク
  - `src/ui/controls.tsx`: (p,q,r) 入力・角度スナップトグル・深さスライダ
  - 共役ハンドル UI（z0 ドラッグ、θ 回転）/ HUD（角度・座標の簡易表示）
  - キャンバス入力: 境界上 2 点クリック（境界拘束のヒットテスト）
  - スナップ ON/OFF とラベル色変化
- AC
  - マウス操作で境界 2 点→ジオデシック生成が体感スムーズ
  - スナップ状態が明確（色/ラベル）
  - 共役パラメタ操作で描画が連続的に変化

## MILESTONE-3: 群展開（BFS, カリング, 描画最適化）
- 所要目安: 2.0–3.0 日
- タスク
  - `src/engine/group.ts`: 反射生成を BFS で深さ D まで展開（直前の鏡に戻る無益遷移を抑止）
  - `src/engine/render.ts`: Canvas 描画最適化（画面外/極小プリミティブのカリング、バッチ描画）
  - 基本域のモチーフ（単色三角）塗りつぶしと展開
- AC
  - 深さスライダに応じ展開要素数が増減
  - 目標 60fps（開発マシン相当）を大きく下回らない

## MILESTONE-4: プリセット＆スクショ保存
- 所要目安: 0.5–1.0 日
- タスク
  - (p,q,r) よく使う組（例: (2,3,7), (3,3,4), (2,4,5)）のプリセット
  - PNG スクリーンショット出力（Canvas からのエクスポート）
  - 任意: SVG エクスポート（時間が許せば）
- AC
  - プリセットの選択で再現性ある状態復元
  - PNG 保存がワンクリックで可能

---

## 提案ディレクトリ構成（例）

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

---

## 受け入れ条件（総括）
- 3 分以内でローカル起動可能
- 境界 2 点クリックからジオデシック生成
- 交点角度ラベルとスナップ ON で色変化
- (p,q,r) 設定→基本域モチーフを深さ D で展開
- 共役スライダで見え方が連続に変化
- PNG スクリーンショット保存
