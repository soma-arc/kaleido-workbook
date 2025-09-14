# Hyperbolic Plane PoC

Poincaré 円板で三鏡 (p,q,r)・ジオデシック・角度スナップ・群展開・共役操作を最小構成で検証する PoC（Web/Canvas 2D）。

## クイックスタート
前提: Node.js 22, pnpm

```bash
pnpm i
pnpm dev            # http://localhost:5173

# Quality gates
pnpm typecheck
pnpm lint && pnpm format
pnpm test           # coverage provider: v8
pnpm ci             # biome ci + typecheck + test:sandbox
```

主なスクリプト（`package.json`）
- dev/build/preview
- typecheck
- lint/format（Biome・4スペース）
- test/test:sandbox/coverage（Vitest v8 coverage）

### Git Hooks（husky + lint-staged）
- pre-commit: 変更ファイルに対して `biome check --write` を実行し、自動整形と静的検査を行います。その後、プロジェクト全体に対して `biome ci` を実行します。
- pre-push: `pnpm typecheck` と `pnpm test:sandbox` を実行します。失敗すると push はブロックされます。
- 一時的に回避したい場合は `--no-verify` を付けて `git commit`/`git push` を実行してください（常用は非推奨）。

## 最低限の方針
- TDD で進める。受け入れテスト（`tests/acceptance/**`）は人間が作成しロック。エージェントは変更不可。
- 幾何の最初の対象は circle×circle。返却規約（kind/points）と「2点は x→y 昇順」を厳守。
- 1 タスク = 1 コミット。（実装ステップごとに小さくコミット）pre-commit で lint/format/test を通す。

### 用語/型の統一
- ベクトル型は `Vec2` を公開名として採用（旧 `Vec` は廃止）。
- 主な幾何モジュール: `geom/circle.ts`（円×円交点）, `geom/geodesic.ts`（境界2点→直交円/直径）, `geom/inversion.ts`（円反転）, `geom/unit-disk.ts`（単位円ユーティリティ）。

## Render Backend Portability（Canvas 2D / SVG / WebGL/GLSL）

本PoCは描画バックエンドを差し替え可能にするため、以下の層に分離します。

- レイヤ構成
  - 幾何（world空間）: ジオメトリ/数学（geodesic 等）。
  - ビューポート（world→screen）: 等方スケール+平行移動の純粋変換。
  - プリミティブSpec（screen空間）: 描画に必要な最小の数値仕様（API非依存）。
    - 例: CircleSpec `{ cx, cy, r }`、LineSpec `{ x1, y1, x2, y2 }`（拡張可能）。
  - バックエンドアダプタ: Specを消費してCanvas/SVG/WebGLへ描画する層。

- 不変条件/指針
  - Core/SpecはCanvas/WebGLの直接呼び出しを含めない（数値契約のみ）。
  - SpecはDPR/ビューポート適用後のscreen座標を返し、スタイル（色/線幅/AA）は含めない。
  - 各SpecからAABBを導出してカリング/Invalidationに利用（GPU Readbackに依存しない）。
  - 描画順は安定ソートで管理し、バックエンド差異でも結果の一貫性を確保。
  - DPRは事前に解決（`src/render/canvas.ts`）。

- WebGL/GLSL（将来）
  - Viewportはuniformで渡す。Specを頂点/インスタンスに展開し、ライン/三角形で表現。
  - ジオデシックは距離場シェーダやストロークのどちらでも実現可能（性能/品質で選択）。
  - scissor/clipやAABBで部分描画を行い、フレームバッファのReadbackを避ける。
  - ドローコールをプログラム/状態でバッチしつつ、必要な順序を保持。

この構造により、GLSL への移行は「Specを解釈するWebGLアダプタの追加」で完結し、幾何やビューポートのコードは不変のまま差し替え可能です。

## リンク
- docs/ROADMAP.md（中長期の方向性メモ）
- GitHub Project（スプリントの Now/Next/Later のSSOT）
- Milestones（リリース/期日管理）
- AGENTS.md（作業範囲・禁止・DoD・TDD ルール）

ライセンス: LICENSE
