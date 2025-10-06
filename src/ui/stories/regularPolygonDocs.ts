export const REGULAR_POLYGON_COMPONENT_DOC = `
正多角形シーン（Regular Square / Regular Pentagon / Regular Hexagon）は共通の操作モデルを持ちます。

- 全ての頂点は共有制御点として扱われ、同じ ID の頂点をドラッグすると隣接 2 枚の半平面のみが更新されます。
- 半平面そのものをドラッグする操作（plane drag）は無効化されており、各シーンは頂点ハンドルのみで編集します。
- ハンドルは統一した色とサイズで描画され、固定扱いの頂点（例: ヒンジ）が存在しない限り全てドラッグ可能です。
- 交差多角形の内部は Euclidean WebGL パイプラインによって半透明フィル＋反射テクスチャで描画されます。
- Storybook Play ではハンドル座標を JSON テレメトリとして公開し、自動化シナリオで座標変化を検証できます。
`;

export const REGULAR_POLYGON_PLAY_DOC =
    "Play テストでは複数の頂点をドラッグして戻す操作を自動化し、共有制御点の整合性を検証します。";
