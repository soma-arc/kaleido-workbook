# Euclidean Hinge Angle Overlay — Implementation Plan v0.2

## 背景と目的
- Euclidean "Hinge Mirrors" シーンでは 2 本の鏡半平面が共通ヒンジを共有するが、現在は自由制御点の角度が UI から把握できない。
- 操作中に各鏡の向きと 2 本の開き角を即時確認できるよう、数値リードアウトのみをオーバーレイに表示する。
- 今回は **Storyboard/Docs などの実装は不要**、アクセシビリティ拡張やハンドルトグル等の追加 UI も明示的に除外する。

## 現状整理
- シーン定義: `src/scenes/euclidean/hinge/definition.tsx`。`variant: "hinge"`、`controlsFactory` のみでオーバーレイ未実装。
- ハンドル状態: `EuclideanSceneHost` (`src/ui/scenes/EuclideanSceneHost.tsx`) が `handleControls?.points` に `HalfPlaneControlPoints[]` を保持。ヒンジ ID は `controlAssignments` で `"hinge"` 固定。
- オーバーレイ: `embedOverlayDefaultVisible: false` かつ既定 UI のみ表示され、角度情報は取得不可。

## 要件整理（更新）
1. **角度算出**
   - 各半平面の固定ヒンジ点と自由制御点を結ぶベクトルから `Math.atan2` で向きを算出し、0–360° に正規化。
   - 2 本の鏡の向き差分（最小角、0–180°）を "Hinge angle" として表示。
   - 小数 1 桁（0.1°）で丸め、`number | null` を返す。値欠損時は `--` 表示。
2. **UI 表示**
   - Embed オーバーレイに角度リードアウトのみを表示するシンプルな `EmbedOverlayPanel` を用意。
   - ハンドル表示トグルやボタン類は追加しない。
   - アクセシビリティ属性（aria-live 等）は今回は不要。
3. **対象範囲**
   - Storybook / Play / Doc 更新は行わない。
   - 角度計算と表示に必要な範囲で `SceneContextExtras` 型と Euclidean シーン定義を最小限拡張。

## 設計方針
### 1. 角度算出ユーティリティ
- 新モジュール例: `src/scenes/euclidean/hinge/math.ts` に `computeHingeAngles(points: HalfPlaneControlPoints[]): { planeAngles: [number|null, number|null]; hingeAngle: number | null }` を実装。
- ステップ:
  1. 各 pair から固定点 (`fixed === true` または `id === "hinge"`) と自由点を取得。いずれか欠損なら `null`。
  2. `vector = free - hinge`、`angleRad = Math.atan2(vector.y, vector.x)`、`degrees = ((rad * 180/PI) + 360) % 360`。
  3. 差分角 `minAngle = Math.abs(((degA - degB + 540) % 360) - 180)`。
  4. 0.1° 単位で `Math.round(value * 10) / 10`。
- 将来再利用できるよう副作用レスで実装。
- Vitest で代表ケース（直交/同方向/欠損）をカバー。

### 2. EuclideanSceneHost 連携
- `handleControls?.points` と `scene.variant` に依存する `useMemo` で `hingeOverlayData` を算出。
- `SceneContextExtras` に `hingeOverlay?: { planeAngles: number[]; hingeAngle: number | null }` を追加。
- `overlayExtras` に該当データを入れ、`scene.variant !== "hinge"` の場合は `undefined`。

### 3. オーバーレイ UI
- 新規 `src/scenes/euclidean/hinge/ui/Overlay.tsx` を作成し、`HingeAnglesOverlay` コンポーネントを提供。
- 内容はタイトル＋3 ラインの角度ラベルのみ。例:
  - `Plane A: 123.4°`
  - `Plane B: 278.9°`
  - `Hinge angle: 45.5°`
- 値が `null` の場合は `--` を表示する簡素実装。

### 4. シーン定義更新
- `euclideanHingeScene` に `embedOverlayDefaultVisible: true` を設定し、`embedOverlayFactory` で `HingeAnglesOverlay` を返す。
- `extras.hingeOverlay` が無い場合は `null` を返して既定オーバーレイを維持。

## 実装タスク（改訂版）
1. `computeHingeAngles` を実装し、Vitest で単体テスト追加。
2. `EuclideanSceneHost` に角度計算 `useMemo` を導入、`SceneContextExtras` 型を拡張、`overlayExtras.hingeOverlay` を提供。
3. `HingeAnglesOverlay` コンポーネントと関連スタイルを実装（最小 UI）。
4. `euclideanHingeScene` 定義を更新し、オーバーレイを組み込み。
5. Plan ドキュメント（本ファイル）以外の Storybook/Docs 追記は行わない。

## テストと検証
- `pnpm test --filter hinge` 等で新規ユーティリティの単体テストを実行。
- 手動でハンドルを回転し、角度リードアウトが変化することを確認（必要最小限の手動チェック）。

## リスクとフォローアップ
- ハンドル初期化が遅れるフレームでは角度が `--` になるが、要件上許容。
- 片方の制御点が固定化された場合の扱いなど追加要件が出たら別 Issue で検討。
- 国際化/アクセシビリティ/追加 UI 要素は将来要望が出た際に再評価する。

## 参考リソース
- `src/scenes/euclidean/hinge/definition.tsx`
- `src/ui/scenes/EuclideanSceneHost.tsx`
- `src/ui/components/EmbedOverlayPanel.tsx`
- `ops/ai/prompts/v1/implement_issue.md`
- `ops/ai/playbooks/dev_flow.md`
