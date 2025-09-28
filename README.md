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
pnpm ci             # biome ci + typecheck + test
```

主なスクリプト（`package.json`）
- dev/build/preview
- typecheck
- lint/format（Biome・4スペース）
- test/coverage（Vitest v8 coverage）

### UI Controls
- `(p,q,r)` preset buttons anchor `p` と `q` を固定（Custom でアンカー解除）。
- `Snap π/n` トグルで `π/n` グリッドへ吸着（on: 分母が自動調整, off: 生の入力値）。
- `Snap π/n` が有効な場合、双曲条件 `1/p + 1/q + 1/r < 1` を満たすよう未固定の分母を自動調整します。
- `R` スライダは分母の範囲 `[2, 100]` で安全に操作可能（p,q 固定）。
- 既存の数値入力はアンカー状態に応じて自動的に無効化/有効化されます。

### Embed Mode

| Parameter | 値の例 | 説明 |
|-----------|--------|------|
| `scene`   | `euclidean-hinge` | 起動時に選択するシーン ID。`SCENE_IDS`（`hyperbolic-tiling`, `euclidean-half-planes`, `euclidean-hinge`, `euclidean-regular-square`, `euclidean-regular-pentagon`）のいずれか。無効値の場合は既定シーンにフォールバックします。 |
| `embed`   | `1` / `true` | 埋め込みモードを有効化。16:9 レイアウトに切り替わり、コントロール UI を非表示にします。その他の値、未指定の場合は通常モードで表示します。 |

- URL 例: `https://<host>/?scene=euclidean-hinge&embed=1`
- `scene` / `embed` は UI 操作と同期し、履歴操作（戻る/進む）でも状態が復元されます。
- Storybook の `Scenes/Embedded Preview` ストーリーで iframe 埋め込み時の見た目を検証できます。
- iframe で埋め込む場合は `<iframe src="https://<host>/?scene=<SceneId>&embed=1" />` のようにクエリを付与してください。

#### 埋め込みスタイル例

Marp `theme: default` + `class: invert` などダーク系スライドに調和させるには、下記のようにラッパー要素へ背景色と枠線を与えると境界が自然に見えるようになります。アプリ本体の `embed-mode` と同じ配色（背景 `#111827`、枠 `rgba(148, 163, 184, 0.35)`）を使用しています。

```html
<div
  style="
    background:#111827;
    border:1px solid rgba(148,163,184,0.35);
    border-radius:12px;
    box-shadow:0 12px 32px rgba(15,23,42,0.45);
    overflow:hidden;
    max-width:960px;
    margin:0 auto;
  "
>
  <iframe
    src="https://example.com/?scene=euclidean-hinge&embed=1"
    style="width:100%;aspect-ratio:16/9;border:none;"
    title="Euclidean hinge scene"
    allow="fullscreen"
  ></iframe>
</div>
```

シーンが増えた場合でも、`scene=<SceneId>` の値を差し替えるだけで同じスタイルを再利用できます。

### Git Hooks（husky + lint-staged）
- pre-commit: 変更ファイルに対して `biome check --write` を実行し、自動整形と静的検査を行います。その後、プロジェクト全体に対して `biome ci` を実行します。
- pre-push: `pnpm typecheck` と `pnpm test` を実行します。失敗すると push はブロックされます。
- 一時的に回避したい場合は `--no-verify` を付けて `git commit`/`git push` を実行してください（常用は非推奨）。

## 最低限の方針
- TDD で進める。受け入れテスト（`tests/acceptance/**`）は人間が作成しロック。エージェントは変更不可。
- 幾何の最初の対象は circle×circle。返却規約（kind/points）と「2点は x→y 昇順」を厳守。
- 1 タスク = 1 コミット。（実装ステップごとに小さくコミット）pre-commit で lint/format/test を通す。

### 用語/型の統一
- ベクトル型は `Vec2` を公開名として採用（旧 `Vec` は廃止）。
- 主な幾何モジュール: `geom/primitives/circle.ts`（円×円交点）, `geom/primitives/geodesic.ts`（境界2点→直交円/直径）, `geom/transforms/inversion.ts`（円反転）, `geom/primitives/unitDisk.ts`（単位円ユーティリティ）。

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

### Geometry Modes
- 左ペインの「Geometry Mode」で Hyperbolic / Euclidean を切替えられます。
- Euclidean モードでは (3,3,3) / (2,4,4) / (2,3,6) など `1/p + 1/q + 1/r = 1` を満たす三角群を対象に、三本の半平面鏡（オフセット＋単位法線）を SDF に渡して描画します。
- 条件から外れた値を入力した場合は警告を表示し、必要に応じて自動的に `(3,3,3)` プリセットへ戻ります。

### Rendering Modes
- 既定では Canvas モードで描画します。
- ハイブリッド・モード（Canvas UI + WebGL タイル土台）を試す場合は、起動前に `VITE_RENDER_MODE=hybrid pnpm dev` のように環境変数を指定するか、`window.__HP_RENDER_MODE__ = "hybrid"` を設定してからアプリを初期化してください。
- ハイブリッド・モードでは WebGL 初期化を試み、未対応ブラウザではエラーログを出して Canvas 描画のみを継続します（GLSL 実装は今後追加予定）。

## リンク
- docs/ROADMAP.md（中長期の方向性メモ）
- GitHub Project（スプリントの Now/Next/Later のSSOT）
- Milestones（リリース/期日管理）
- AGENTS.md（作業範囲・禁止・DoD・TDD ルール）

ライセンス: LICENSE
