# Hyperbolic Triple Family Overlay — Implementation Plan v0.3

## 背景と目的
- 既存 `hyperbolic-tiling-333` シーンは (3,3,3) 固定で反射回数スライダを提供する。
- 新しい PoC では **(3,3,r) / (2,4,r) / (2,3,r)** を embed モードで切り替え、`r` を単純に調整できるようにする。
- 反射回数は検証用に固定値 100 を適用し、UI からは操作させない。

## 参考リソース
- `src/scenes/hyperbolic/tiling-333/**`
- `src/ui/scenes/HyperbolicSceneHost.tsx`
- `ops/ai/playbooks/scene_add.md`
- `ops/ai/playbooks/dev_flow.md`

## 要件整理
- 新シーン ID を登録し、SceneRegistry と embed モードで選択可能にする。
- ファミリー切り替え UI（3 パターン）と `r` スライダをオーバーレイに配置。  
  - `r` の最小値は常に 3。上限は固定せずユーザーの入力に任せる。  
  - ハイパーボリック条件 \(1/p + 1/q + 1/r < 1\) は考慮しない。
- `triangle.applyDirectTriple({ p, q, r })` を直接呼び出し、追加の状態管理やキャッシュは不要。
- 反射回数 uniform を常に 100 に設定する（UI 露出なし）。
- テスト・Storybook Play は今回スキップ（TODO 化）。

## スコープ
- In: シーン定義追加、オーバーレイ UI 作成、`HyperbolicSceneHost` への最小改修、ドキュメント/Plan 更新。
- Out: 反射回数 UI 拡張、WebGL シェーダ変更、追加テスト実装、既存シーン挙動の変更。

## 設計方針
1. **シーン構成**  
   - `src/scenes/hyperbolic/tiling-triple-family/` を新設。  
   - `HYPERBOLIC_TRIPLE_REFLECTION_PIPELINE_ID` を流用し、`variant: "tiling-triple-family"` で登録。  
   - `showTriangleControls: false`、`embedOverlayDefaultVisible: true` を指定。
2. **UI 構成**  
   - `TripleFamilyOverlay`（仮称）を作成し、ファミリー選択と `r` スライダを `EmbedOverlayPanel` 上に配置。  
   - ファミリー選択は `button` + `role="radiogroup"` でキーボード入力に対応。  
   - `r` スライダは HTML `input[type="range"]` をそのまま利用。
3. **ホスト側連携**  
   - `HyperbolicSceneHost` に新シーン ID 分岐を追加。  
   - `sceneControlsExtras` / `overlayExtras` に `tripleFamilyControls` を注入し、embed オーバーレイのみ置き換える。  
   - 新シーンでは既存の反射回数コントロールを無効化し、pipeline へ `uMaxReflections = 100` を送る。
4. **描画フロー**  
   - シーン切替時およびファミリー変更時に `triangle.applyDirectTriple` を呼び即座に描画。  
   - 追加 state を保持しないため、`useEffect` で `triangle` を初期化するだけで十分。
5. **ドキュメント**  
   - `plan/` の本ファイルで概要と TODO を管理。  
   - 実装完了後に README / docs 更新の要否を確認。

## 実装タスク
1. 新シーン定義/インデックス/定数を作成し、`sceneDefinitions.tsx` に登録。
2. `TripleFamilyOverlay` コンポーネントを実装（ファミリー切替ボタン + `r` スライダ）。
3. `HyperbolicSceneHost` に新シーン向けの extras 注入と uniform 固定処理を追加。
4. Storybook へデモストーリーを追加（Play/Docs は未実装で良いと注記）。
5. TODO コメントとしてテスト/Play 対応を残す。

## テスト方針（Deferred）
- 今回はテスト実装を行わず、必要な観点（UI ハンドラ、WebGL uniform、embed 操作）を TODO にまとめる。
- 実装後に Vitest と Storybook Play で自動化する計画を再検討する。

## リスクとメモ
- 反射回数 100 固定により既存シーンと UX が異なるため、ドキュメント上で差異を明記する。  
- `triangle.applyDirectTriple` 連続呼び出し時に描画が追従しない場合、手動で再描画をトリガする必要がある。  
- embed 以外のレイアウトで利用しない前提のため、UI レスポンシブ対応は最小限に留める。

## マイルストーン目安
1. Scene 定義とホスト改修（0.5d）
2. オーバーレイ UI 実装（0.5d）
3. Storybook とドキュメント整理（0.25d）

## 追加計画 v0.3: r = ∞（理想頂点）対応

### 背景
- `HyperbolicTripleFamilyOverlay` のスライダは `HYPERBOLIC_TILING_TRIPLE_FAMILY_MAX_R = 30` へハードクランプしており、`maxRepresentsInfinity` / `onInfinityToggle` を渡していないため、理想頂点を選択できない。
- `hyperbolic-tiling-333` シーンでは `createTriangleSliderProps` が `triangle.idealVertexEnabled` と `triangle.setIdealVertex` を用い、最大値を ∞ として扱っている。Triple Family でも同じ設計パターンを流用できる。

### ゴール
- ファミリー各種で `r = Infinity` を UI から選択でき、`triangle.applyDirectTriple` および `HyperbolicParamsOverride` に ∞ が反映される。
- 無限選択時はスライダラベルに `∞` を表示し、解除すると最後の有限 `r` に戻る。

### 実装ステップ
1. **状態管理の拡張（`src/ui/scenes/hyperbolicBindings.ts`）**  
   - `useHyperbolicTripleFamilyBinding` に `const [idealVertex, setIdealVertex] = useState(false);` を追加。`handleSliderChange` では最大値近傍を選んだ際に `setIdealVertex(true)` を呼び、その他の値に動いたら `false` へ戻す。  
   - `triangle.applyDirectTriple` 呼び出し前に `idealVertex` を見て `r = Number.POSITIVE_INFINITY` を渡す。有限モードへ戻る際は現在の `clampFamilyR` 値を使用。
2. **スライダ props 更新**  
   - `overlayControls.rSlider` に `maxRepresentsInfinity: true`, `infinitySelected: idealVertex`, `onInfinityToggle: setIdealVertex` を渡す。  
   - `value` は `idealVertex` のときも直前の有限値を保持し、実際の表示はコンポーネント側で `∞` になる（`HyperbolicTiling333TriangleSlider` のロジックをそのまま利用）。
3. **制約関数の調整**  
   - `clampFamilyR` は有限値にのみ適用し、∞ 選択時はスキップできるよう `handleSliderChange` 内で切り替え。`HYPERBOLIC_TILING_TRIPLE_FAMILY_MAX_R` は UI 最大値として維持しつつ、「最大値を選ぶ = 理想頂点」の仕様を明記するコメントを追加。
4. **派生値の同期**  
   - `paramsOverride`・`uniforms` は現状通りで良いが、`paramsOverride.params.r` に `idealVertex ? Number.POSITIVE_INFINITY : clampFamilyR(rValue)` をセット。  
   - `useEffect` で `triangle.applyDirectTriple` を呼ぶ際も同じ分岐を適用し、ホストとシーンの両方が常に一致するようにする。
5. **検証**  
   - `hyperbolic-tiling-333` と同じ操作感になっているか手動確認（最大値までドラッグ → ラベルが `Triangle r: ∞`、再度下げると有限値へ戻る）。  
   - 可能であれば Storybook の Triple Family ストーリーを追加し、`play` 関数で最大値ドラッグ → 理想頂点トグルが反映されることを確認（将来タスクとして TODO 化可）。

### ドキュメント/タスクメモ
- `plan/hyperbolic-triple-family-overlay.md`（本書）に本計画を記載済み。実装 Issue では `hyperbolic-tiling-333` シーンのスライダ設定を参照する旨を明記する。  
- 完了時に README へ「Triple Family でも理想頂点を選択できる」旨を追記するか、もしくは Storybook Docs の KNOWN LIMITS を更新する。

---

## 付録: HyperbolicSceneHost 肥大化抑制のためのリファクタリング方向（調査メモ）

- **課題**  
  - `HyperbolicSceneHost` がシーン固有状態（反射回数、トリプルファミリーの `p,q,r` など）を直接抱え、今後のシーン追加で分岐が増えるリスクがある。`scene.id === ...` で分岐する構造は Euclidean ホスト同様に肥大化を招く。
- **方向性**  
  1. `SceneDefinition` に新ファクトリ（仮称 `hostBindingFactory`）を追加し、ホストから提供する共通コンテキスト（レンダリング API、ハイパーボリック三角状態、uniform setter 等）を受け取って、シーン側で必要な state / handler を生成する。  
  2. シーンが生成した state やコールバックは既存の `controlsFactory` / `embedOverlayFactory` に `extras` として渡し、ホストは具体的な分岐を持たずに済むようにする。  
  3. レンダリング共通処理はホストが担当し、シーン固有の uniform / UI 状態は Scene モジュール内のカスタムフックに閉じ込める。
- **次アクション（別タスク）**  
  - `hostBindingFactory` の API 設計（受け渡すコンテキストと返り値の型を定義）。  
  - `hyperbolic-tiling-333` を対象に PoC を行い、ホスト側からシーン固有分岐を削減できるか検証。  
  - 実験結果を踏まえて他シーンへ段階的に展開し、`SceneContextExtras` と既存分岐の整理を進める。

### 付録A: Host Binding API 案（2025-11-06）

```ts
type HyperbolicSceneHostContext = {
  scene: SceneDefinition;
  triangle: HyperbolicTriangleState;
  renderMode: RenderMode;
  embed: boolean;
  createId: (suffix: string) => string;
  requestRender: () => void;
};

type HyperbolicSceneBinding = {
  uniforms?: HyperbolicTripleReflectionUniforms;
  controlsExtras?: SceneContextExtras;
  overlayExtras?: SceneContextExtras;
};

type HyperbolicSceneBindingFactory = (context: HyperbolicSceneHostContext) => HyperbolicSceneBinding;
```

- `SceneDefinition` に `hyperbolicBindingFactory?: HyperbolicSceneBindingFactory` を追加。  
- `HyperbolicSceneHost` はレンダー毎に `scene.hyperbolicBindingFactory?.(hostContext)` を呼び、戻り値から `sceneUniforms` と `extras` を組み立てる。  
- 既存の `controlsFactory` / `embedOverlayFactory` は `extras` を通じてシーン固有 UI を得る（現在の構造を温存）。  
- バインディング内で React Hooks を利用し、`maxReflections` や `(p,q,r)` の状態管理、`triangle.applyDirectTriple` の呼び出しをシーン側へ移譲する。  
- これにより `HyperbolicSceneHost` での `scene.id === ...` 分岐が不要になり、Uniform 渡し漏れ（今回の `uMaxReflections` 問題）が発生しにくくなる。
