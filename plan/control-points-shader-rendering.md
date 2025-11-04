# 制御点シェーダ描画計画

## 背景

現在、制御点（control points / handles）は Canvas 2D API で描画されており（`src/render/canvasLayers.ts` の `renderHandleOverlay`）、以下の課題があります：

- Canvas 2D レイヤと WebGL レイヤの合成が必要
- ズーム時に制御点のサイズが変化してしまう（viewport.scale に依存）
- WebGL で描画される他の要素（ジオデシック、テクスチャなど）と視覚的に統合されていない
- 高DPI環境での描画品質が Canvas 2D に依存

## 目標

制御点を **WebGL シェーダで Signed Distance Function (SDF)** を用いて描画し、以下を実現する：

1. **スケール不変の半径**: ズームやパンに関わらず、制御点は常に画面上で一定のピクセルサイズで表示される
2. **高品質な描画**: シェーダ内マルチサンプリングによる滑らかな輪郭（sphericalシーンと同じ方式）
3. **統一されたレンダリングパイプライン**: WebGL レイヤ内で完結
4. **パフォーマンス向上**: GPU による並列描画

## 設計方針

### 1. 既存パイプラインへの統合

**重要な設計変更**: 独立した制御点パイプラインではなく、**既存の `euclideanHalfPlanePipeline` に統合**する形で実装します。これにより：

- hingeScene など既存シーンとの統合が容易
- 単一のレンダーパスで半平面と制御点を同時描画
- パイプライン管理の複雑さを軽減
- テクスチャと制御点の正しい合成を保証

### 2. 制御点の種類

現在の `renderHandleOverlay` は2種類の制御点を描画：

- **自由点（Free Point）**: 円形、オレンジ色（`rgba(255, 165, 0, 0.85)`）
- **固定点（Fixed Point）**: 正方形、緑色（`#4caf50`）
- **アクティブ状態**: 選択中の点は赤色（`#ff5722`）

### 3. シェーダ内マルチサンプリングによるアンチエイリアシング

**sphericalシーンと同様のマルチサンプリング方式を採用**:

ハードウェアMSAAはプリミティブのエッジにしか効果がないため、フラグメントシェーダ内でのSDF判定には効きません。そのため、sphericalシーン（`src/render/spherical/shaders/spherical.frag`）と同じく、**シェーダ内で複数サンプル点を取って平均化**する方式を採用します。

利点：
- エッジの滑らかさを確実に保証
- サンプル数で品質とパフォーマンスを調整可能
- 既存のsphericalシーンと同じ実装パターン
- スケールに依存しない一定の品質

```glsl
// サンプルオフセット（sphericalシーンと同様）
const int MAX_AA_SAMPLES = 4;
const vec2 AA_SAMPLE_OFFSETS[MAX_AA_SAMPLES] = vec2[](
    vec2(0.0, 0.0),
    vec2(0.25, -0.25),
    vec2(-0.25, 0.25),
    vec2(0.5, 0.5)
);

// 円形制御点のSDF
float circleSDF(vec2 point, vec2 center, float radius) {
    return length(point - center) - radius;
}

// 正方形制御点のSDF
float squareSDF(vec2 point, vec2 center, float halfSize) {
    vec2 d = abs(point - center) - vec2(halfSize);
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// マルチサンプリングによる制御点描画
vec4 renderControlPoint(vec2 worldPoint, int index) {
    vec2 cpPosition = uControlPointPositions[index];
    float radiusPx = uControlPointRadiiPx[index];
    vec4 fillColor = uControlPointFillColors[index];
    vec4 strokeColor = uControlPointStrokeColors[index];
    float strokeWidthPx = uControlPointStrokeWidthsPx[index];
    int shape = uControlPointShapes[index];
    
    float worldRadius = radiusPx / uViewport.x;
    float worldStrokeRadius = (radiusPx + strokeWidthPx) / uViewport.x;
    
    // マルチサンプリング
    vec4 accumulated = vec4(0.0);
    for (int s = 0; s < MAX_AA_SAMPLES; s++) {
        vec2 offset = AA_SAMPLE_OFFSETS[s] / uViewport.x; // ワールド空間でのオフセット
        vec2 samplePoint = worldPoint + offset;
        
        float sdf = (shape == SHAPE_CIRCLE) 
            ? circleSDF(samplePoint, cpPosition, worldRadius)
            : squareSDF(samplePoint, cpPosition, worldRadius);
        
        if (sdf <= 0.0) {
            // Fill内部
            accumulated += fillColor;
        } else if (strokeWidthPx > 0.0) {
            // Stroke判定
            float strokeSDF = (shape == SHAPE_CIRCLE)
                ? circleSDF(samplePoint, cpPosition, worldStrokeRadius)
                : squareSDF(samplePoint, cpPosition, worldStrokeRadius);
            
            if (strokeSDF <= 0.0) {
                accumulated += strokeColor;
            }
        }
    }
    
    return accumulated / float(MAX_AA_SAMPLES);
}
```

### 4. スケール不変性の実現

制御点の半径をピクセル単位で指定し、ワールド座標に変換：

```glsl
uniform vec3 uViewport; // (scale, tx, ty)

vec2 screenToWorld(vec2 screenPos) {
    return (screenPos - uViewport.yz) / uViewport.x;
}

// ワールド座標での半径（ピクセル単位の半径をワールドスケールに変換）
float worldRadius = pixelRadius / uViewport.x;
```

### 5. Uniform データ構造

```glsl
// 最大制御点数（Hingeシーンは4点なので余裕を持って）
#define MAX_CONTROL_POINTS 16

// フラット配列として送信（struct配列はuniform配列の上限に注意）
uniform int uControlPointCount;
uniform vec2 uControlPointPositions[MAX_CONTROL_POINTS];  // ワールド座標
uniform float uControlPointRadiiPx[MAX_CONTROL_POINTS];   // ピクセル単位の半径
uniform vec4 uControlPointFillColors[MAX_CONTROL_POINTS];
uniform vec4 uControlPointStrokeColors[MAX_CONTROL_POINTS];
uniform float uControlPointStrokeWidthsPx[MAX_CONTROL_POINTS];
uniform int uControlPointShapes[MAX_CONTROL_POINTS];      // 0: circle, 1: square
uniform int uControlPointActives[MAX_CONTROL_POINTS];     // 0: inactive, 1: active
```

## 実装計画

### Phase 1: euclideanReflection.frag への制御点描画追加（Days 1-3）

1. **シェーダの拡張**
   - `src/render/webgl/shaders/euclideanReflection.frag` に制御点描画ロジックを追加
   - 既存の半平面描画の**後**に制御点をオーバーレイ
   - SDF関数の追加（circle, square）
   - sphericalシーン方式のシェーダ内マルチサンプリング実装

2. **Uniform の追加**
   - 制御点用のUniform配列を定義
   - `uControlPointCount` で有効な制御点数を制御
   - デフォルト値: `count=0` で制御点なし（後方互換性）

3. **シェーダテンプレートの更新**
   - `MAX_CONTROL_POINTS` のプリプロセッサ置換
   - 既存の `__MAX_GEODESICS__` と同様の仕組み

### Phase 2: euclideanHalfPlanePipeline の拡張（Days 4-6）

4. **Uniform 管理の追加**
   - `src/render/webgl/pipelines/euclideanHalfPlanePipeline.ts` に制御点Uniformロケーションを追加
   - `UniformLocations` 型の拡張

5. **Uniform 変換ロジック**
   - `src/render/webgl/controlPointsUniforms.ts`（新規）
   - `HalfPlaneHandleOverlay` → Uniform配列への変換
   - 色の正規化（CSS → RGBA float）

6. **render メソッドの拡張**
   - `handleOverlay` が存在する場合のみ制御点をセット
   - 存在しない場合は `uControlPointCount = 0`

### Phase 3: EuclideanSceneHost との統合（Days 7-9）

7. **handleOverlay の伝播**
   - `src/render/engine.ts` で `handleOverlay` を受け取る
   - パイプラインの `render` メソッドに渡す
   - 既存の Canvas 2D 描画との切り替えフラグ

8. **Canvas 2D レイヤからの移行**
   - `renderHandleOverlay` の条件分岐追加
   - 機能フラグ `useShaderControlPoints` の導入
   - デフォルトは `false`（Canvas 2D）、段階的に `true` へ

9. **シーンホストの更新**
   - `EuclideanSceneHost.tsx` で `handleOverlay` を engine に渡す
   - 既存のレンダリングフローを維持

### Phase 4: テストとポリッシュ（Days 10-14）

10. **ユニットテスト**
    - `controlPointsUniforms.test.ts`
    - Uniform 変換の正確性
    - 色の変換（CSS → RGBA float）
    - Fixed/Free, Active/Inactive の組み合わせ

11. **ビジュアルテスト（Storybook）**
    - hingeScene での制御点表示確認
    - スケール変更時の不変性確認
    - 高DPI ディスプレイでの表示確認

12. **統合テスト**
    - 既存シーンでの動作確認
    - ドラッグ操作との連携テスト
    - パフォーマンス測定（FPS）

13. **機能フラグの有効化**
    - `useShaderControlPoints` を `true` にデフォルト変更
    - 既存のテストが全てパス確認
    - Canvas 2D フォールバックの削除（オプション）

14. **ドキュメント整備**
    - コード内コメントの追加
    - Storybook Docs の更新
    - 本計画書の完了報告

## 技術仕様

### シェーダの詳細設計

#### euclideanReflection.frag への追加コード

既存の `euclideanReflection.frag` の末尾（`void main()` 内）に制御点描画ロジックを追加：

```glsl
// ===============================================
// Control Points Overlay (追加部分)
// ===============================================

#define MAX_CONTROL_POINTS __MAX_CONTROL_POINTS__
#define SHAPE_CIRCLE 0
#define SHAPE_SQUARE 1

uniform int uControlPointCount;
uniform vec2 uControlPointPositions[MAX_CONTROL_POINTS];
uniform float uControlPointRadiiPx[MAX_CONTROL_POINTS];
uniform vec4 uControlPointFillColors[MAX_CONTROL_POINTS];
uniform vec4 uControlPointStrokeColors[MAX_CONTROL_POINTS];
uniform float uControlPointStrokeWidthsPx[MAX_CONTROL_POINTS];
uniform int uControlPointShapes[MAX_CONTROL_POINTS];

// マルチサンプリング用オフセット（sphericalシーンと同様）
const int MAX_AA_SAMPLES = 4;
const vec2 AA_SAMPLE_OFFSETS[MAX_AA_SAMPLES] = vec2[](
    vec2(0.0, 0.0),
    vec2(0.25, -0.25),
    vec2(-0.25, 0.25),
    vec2(0.5, 0.5)
);

float controlPointCircleSDF(vec2 point, vec2 center, float radius) {
    return length(point - center) - radius;
}

float controlPointSquareSDF(vec2 point, vec2 center, float halfSize) {
    vec2 d = abs(point - center) - vec2(halfSize);
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

vec4 renderControlPoint(vec2 worldPoint, int index) {
    vec2 cpPosition = uControlPointPositions[index];
    float radiusPx = uControlPointRadiiPx[index];
    vec4 fillColor = uControlPointFillColors[index];
    vec4 strokeColor = uControlPointStrokeColors[index];
    float strokeWidthPx = uControlPointStrokeWidthsPx[index];
    int shape = uControlPointShapes[index];
    
    // ワールド座標での半径
    float worldRadius = radiusPx / uViewport.x;
    float worldStrokeRadius = (radiusPx + strokeWidthPx) / uViewport.x;
    
    // マルチサンプリングによるアンチエイリアシング
    vec4 accumulated = vec4(0.0);
    for (int s = 0; s < MAX_AA_SAMPLES; s++) {
        vec2 offset = AA_SAMPLE_OFFSETS[s] / uViewport.x;
        vec2 samplePoint = worldPoint + offset;
        
        // SDF計算
        float sdf = (shape == SHAPE_CIRCLE) 
            ? controlPointCircleSDF(samplePoint, cpPosition, worldRadius)
            : controlPointSquareSDF(samplePoint, cpPosition, worldRadius);
        
        if (sdf <= 0.0) {
            // Fill内部
            accumulated += fillColor;
        } else if (strokeWidthPx > 0.0) {
            // Stroke判定
            float strokeSDF = (shape == SHAPE_CIRCLE)
                ? controlPointCircleSDF(samplePoint, cpPosition, worldStrokeRadius)
                : controlPointSquareSDF(samplePoint, cpPosition, worldStrokeRadius);
            
            if (strokeSDF <= 0.0) {
                accumulated += strokeColor;
            }
        }
    }
    
    return accumulated / float(MAX_AA_SAMPLES);
}

void main() {
    // ... 既存の半平面描画コード ...
    
    // テクスチャ描画の後に制御点をオーバーレイ
    vec2 worldPoint = screenToWorld(vFragCoord);
    
    for (int i = 0; i < MAX_CONTROL_POINTS; ++i) {
        if (i >= uControlPointCount) {
            break;
        }
        
        vec4 cpColor = renderControlPoint(worldPoint, i);
        
        if (cpColor.a > 0.0) {
            // Alpha blending
            outColor.rgb = outColor.rgb * (1.0 - cpColor.a) + cpColor.rgb * cpColor.a;
            outColor.a = max(outColor.a, cpColor.a);
        }
    }
}
```

### TypeScript 統合

#### Uniform 変換（`controlPointsUniforms.ts`）

```typescript
import type { HalfPlaneHandleOverlay } from "@/render/canvasLayers";

export const MAX_CONTROL_POINTS = 16;

export type ControlPointArrays = {
    count: number;
    positions: Float32Array;      // [x0, y0, x1, y1, ...]
    radiiPx: Float32Array;         // [r0, r1, ...]
    fillColors: Float32Array;      // [r0, g0, b0, a0, r1, g1, b1, a1, ...]
    strokeColors: Float32Array;    // [r0, g0, b0, a0, r1, g1, b1, a1, ...]
    strokeWidthsPx: Float32Array;  // [w0, w1, ...]
    shapes: Int32Array;            // [s0, s1, ...] 0=circle, 1=square
};

/**
 * Convert HalfPlaneHandleOverlay to flat arrays for WebGL uniforms
 */
export function buildControlPointUniforms(
    overlay: HalfPlaneHandleOverlay | null
): ControlPointArrays {
    const positions = new Float32Array(MAX_CONTROL_POINTS * 2);
    const radiiPx = new Float32Array(MAX_CONTROL_POINTS);
    const fillColors = new Float32Array(MAX_CONTROL_POINTS * 4);
    const strokeColors = new Float32Array(MAX_CONTROL_POINTS * 4);
    const strokeWidthsPx = new Float32Array(MAX_CONTROL_POINTS);
    const shapes = new Int32Array(MAX_CONTROL_POINTS);
    
    if (!overlay) {
        return { count: 0, positions, radiiPx, fillColors, strokeColors, strokeWidthsPx, shapes };
    }
    
    const radius = overlay.radius ?? 6;
    const active = overlay.active;
    let count = 0;
    
    for (const handle of overlay.handles) {
        for (let pointIndex = 0; pointIndex < handle.points.length; pointIndex++) {
            if (count >= MAX_CONTROL_POINTS) break;
            
            const point = handle.points[pointIndex];
            const isActive = 
                Boolean(active) &&
                active?.planeIndex === handle.planeIndex &&
                active?.pointIndex === pointIndex;
            
            // Position
            positions[count * 2] = point.x;
            positions[count * 2 + 1] = point.y;
            
            // Radius
            radiiPx[count] = point.fixed ? (overlay.fixedSize ?? radius * 2) / 2 : radius;
            
            // Fill color
            const fillColor = point.fixed
                ? (isActive ? [1, 0.34, 0.13, 1] : [0.3, 0.69, 0.31, 1])
                : (isActive ? [1, 0.34, 0.13, 1] : [1, 0.65, 0, 0.85]);
            fillColors[count * 4] = fillColor[0];
            fillColors[count * 4 + 1] = fillColor[1];
            fillColors[count * 4 + 2] = fillColor[2];
            fillColors[count * 4 + 3] = fillColor[3];
            
            // Stroke color
            const strokeColor = point.fixed
                ? [0.11, 0.37, 0.13, 1]
                : [0.13, 0.13, 0.13, 1];
            strokeColors[count * 4] = strokeColor[0];
            strokeColors[count * 4 + 1] = strokeColor[1];
            strokeColors[count * 4 + 2] = strokeColor[2];
            strokeColors[count * 4 + 3] = strokeColor[3];
            
            // Stroke width
            strokeWidthsPx[count] = 1;
            
            // Shape: 0=circle, 1=square
            shapes[count] = point.fixed ? 1 : 0;
            
            count++;
        }
        if (count >= MAX_CONTROL_POINTS) break;
    }
    
    return { count, positions, radiiPx, fillColors, strokeColors, strokeWidthsPx, shapes };
}
```

#### euclideanHalfPlanePipeline.ts への統合

```typescript
// Uniform locations に追加
type UniformLocations = {
    // ... 既存のuniform ...
    controlPointCount: WebGLUniformLocation;
    controlPointPositions: WebGLUniformLocation;
    controlPointRadiiPx: WebGLUniformLocation;
    controlPointFillColors: WebGLUniformLocation;
    controlPointStrokeColors: WebGLUniformLocation;
    controlPointStrokeWidthsPx: WebGLUniformLocation;
    controlPointShapes: WebGLUniformLocation;
};

// render メソッド内で
render({ renderScene, viewport, textures, canvas, sceneDefinition, handleOverlay }: WebGLPipelineRenderContext): void {
    // ... 既存の描画コード ...
    
    // 制御点の描画
    const controlPoints = buildControlPointUniforms(handleOverlay ?? null);
    gl.uniform1i(this.uniforms.controlPointCount, controlPoints.count);
    
    if (controlPoints.count > 0) {
        gl.uniform2fv(this.uniforms.controlPointPositions, controlPoints.positions);
        gl.uniform1fv(this.uniforms.controlPointRadiiPx, controlPoints.radiiPx);
        gl.uniform4fv(this.uniforms.controlPointFillColors, controlPoints.fillColors);
        gl.uniform4fv(this.uniforms.controlPointStrokeColors, controlPoints.strokeColors);
        gl.uniform1fv(this.uniforms.controlPointStrokeWidthsPx, controlPoints.strokeWidthsPx);
        gl.uniform1iv(this.uniforms.controlPointShapes, controlPoints.shapes);
    }
    
    // ... drawArrays ...
}
```

## 既存コードへの影響

### 変更が必要なファイル

1. **`src/render/engine.ts`**
   - 制御点パイプラインの呼び出しを追加
   - Canvas 2D レイヤの制御点描画を削除/フラグで切り替え

2. **`src/render/canvasLayers.ts`**
   - `renderHandleOverlay` を非推奨マークまたは削除

3. **`src/ui/scenes/EuclideanSceneHost.tsx`**
   - 制御点データをシェーダ形式で渡す

4. **`src/ui/scenes/HyperbolicSceneHost.tsx`**
   - （将来的に制御点をサポートする場合）

### 後方互換性

- 初期実装時は機能フラグ（`useShaderControlPoints`）で切り替え可能にする
- Canvas 2D 版と WebGL 版を並行動作させ、段階的に移行
- 既存のテストが全てパスすることを確認

## テスト計画

### ビジュアルテスト（Storybook）

既存のStorybookストーリーを活用して視覚的に検証：

- 単一制御点（円形/正方形）の描画確認
- 複数制御点の配置と重なり
- アクティブ/非アクティブ状態の切り替え
- ズーム・パン操作時のスケール不変性
- 高DPI ディスプレイでの表示品質
- Canvas 2D版との視覚的な比較

### 統合テスト

- 既存の制御点ドラッグ機能との連携確認
- hingeScene での実際の編集操作
- パフォーマンス測定（FPS、GPU 使用率）

**注**: プロパティテストは時間がかかるため、初期実装では省略します。基本的な動作確認は既存のStorybookで十分カバーできます。

## パフォーマンス考慮事項

### 最適化戦略

1. **Early Discard**: 制御点から遠いピクセルを早期に破棄
   ```glsl
   float minDist = 1e6;
   for (int i = 0; i < uControlPointCount; i++) {
       float dist = length(worldPoint - uControlPoints[i].position);
       minDist = min(minDist, dist);
   }
   if (minDist * uViewport.x > maxRadiusPx + uFeatherPx) {
       discard;
   }
   ```

2. **Uniform バッファの最小化**: 実際に使用する制御点のみを送信

3. **インスタンス描画の検討**: 制御点が多い場合（>16個）は、インスタンス描画に切り替え

4. **描画領域の最適化**: 制御点の bounding box のみをレンダリング

### ベンチマーク目標

- 制御点数 8個以下: 60 FPS 維持
- 制御点数 32個: 30 FPS 以上
- GPU メモリ: 追加 < 1MB

## リスクと対応

### リスク 1: Uniform 配列のサイズ制限

WebGL ES 3.0 では Uniform 配列に上限がある（環境依存）。

**対応**: 
- MAX_CONTROL_POINTS を保守的に設定（16-32）
- 超える場合はテクスチャベースの実装に切り替え

### リスク 2: 複雑なシェーダによるパフォーマンス低下

**対応**:
- プロファイリングで測定
- 必要に応じて LOD（Level of Detail）を導入
- 遠い制御点は簡易描画

### リスク 3: 既存の Canvas 2D 描画との視覚的な差異

**対応**:
- ピクセルパーフェクトな再現を目指す
- A/B 比較テストで検証
- 必要に応じてパラメータ調整

## マイルストーン

- **Days 1-3**: Phase 1 完了、euclideanReflection.frag に制御点描画追加
- **Days 4-6**: Phase 2 完了、euclideanHalfPlanePipeline 拡張とUniform統合
- **Days 7-9**: Phase 3 完了、EuclideanSceneHost 統合、Canvas 2D との切り替え実装
- **Days 10-11**: Phase 4 完了、Storybookでの視覚確認、ドキュメント整備

**合計**: 11日間（プロパティテスト省略により短縮）

## アンチエイリアシング方式の選択理由

### シェーダ内マルチサンプリングを採用（spherical方式）

**選択理由**:

ハードウェアMSAA（`antialias: true`）はプリミティブ（三角形）のエッジにしか効果がなく、フラグメントシェーダ内のSDF判定による条件分岐には効きません。そのため、sphericalシーン（`src/render/spherical/shaders/spherical.frag`）と同様に、**シェーダ内で複数サンプル点を取って平均化**する方式を採用します。

**各方式の比較**:

| 項目 | シェーダ内マルチサンプリング | ハードウェアMSAA | SDF + smoothstep |
|------|----------------------------|-----------------|------------------|
| エッジ品質 | ◎ (確実に滑らか) | × (SDF判定には効かない) | ○ (フェザー幅に依存) |
| パフォーマンス | ○ (サンプル数で調整可) | ◎ (最速) | △ (追加計算) |
| 実装複雑度 | ○ (sphericalと同じ) | ◎ (最もシンプル) | △ (フェザー調整) |
| スケール依存 | × (無し) | × (無し) | ○ (要調整) |
| 確実性 | ◎ (完全制御) | △ (環境依存) | ○ (実装依存) |

**実装詳細**:
- サンプル数: 4点（品質とパフォーマンスのバランス）
- オフセットパターン: sphericalシーンと同じ `SAMPLE_OFFSETS` を使用
- 計算コスト: 制御点1つあたり 4回のSDF計算

**利点**:
- エッジの滑らかさを確実に保証
- 既存のsphericalシーンと同じパターンで実装が容易
- サンプル数を調整してパフォーマンス調整可能
- モバイルを含む全環境で動作保証

**結論**: sphericalシーンで実績のある方式を採用することで、確実に高品質なエッジを実現します。

## 参照

- **統合先パイプライン**: `src/render/webgl/pipelines/euclideanHalfPlanePipeline.ts`
- **統合先シェーダ**: `src/render/webgl/shaders/euclideanReflection.frag`
- **対象シーン**: hingeScene (`src/scenes/euclidean/hinge/definition.tsx`)
- **既存実装**: `src/render/canvasLayers.ts` (`renderHandleOverlay`)
- **SDF 参考**: `src/render/webgl/shaders/euclideanCircleInversion.frag` (`rectangleSDF`)
- **マルチサンプリング参考**: `src/render/spherical/shaders/spherical.frag` (`SAMPLE_OFFSETS`, `MAX_SAMPLES`)

## 依存関係

- **既存パイプライン**: `EUCLIDEAN_HALF_PLANE_PIPELINE_ID` が正常動作していること
- **WebGL ES 3.0**: Array Uniform のサポート
- **sphericalシーン**: マルチサンプリングパターンの参考実装

## 成功基準（Definition of Done）

- [ ] 制御点がシェーダで描画され、Canvas 2D レイヤが不要
- [ ] ズーム・パン時に制御点のサイズが画面上で一定
- [ ] 円形・正方形の両方をサポート
- [ ] アクティブ/非アクティブ状態の視覚化
- [ ] Storybook での視覚確認完了（既存ストーリーで動作確認）
- [ ] パフォーマンス目標達成（60 FPS @ 8 points）
- [ ] 既存のドラッグ操作が全て正常動作
- [ ] Canvas 2D版との視覚的一致確認

---

**更新履歴**:
- 2025-11-04: 初版作成（制御点のシェーダSDF描画計画）
- 2025-11-05: マルチサンプリング方式に変更、euclideanHalfPlanePipeline統合方式に設計変更
- 2025-11-05: テスト計画を簡略化（プロパティテスト除外、Storybookベースのビジュアルテスト中心に変更）、マイルストーンを11日間に短縮
- 2025-11-05: アンチエイリアシング方式をハードウェアMSAAからspherical方式のシェーダ内マルチサンプリングに変更（SDF判定にはハードウェアMSAAが効かないため）
