#!/usr/bin/env bash

set -euo pipefail

# save_ui_epic_ndjson.sh — Write UI Epic + tasks NDJSON to ops/out/issues-ui.ndjson
# Usage: ops/scripts/issues/save_ui_epic_ndjson.sh [OUTPUT_PATH]
# Default OUTPUT_PATH: ops/out/issues-ui.ndjson

OUT_PATH="${1:-ops/out/issues-ui.ndjson}"
mkdir -p "$(dirname "$OUT_PATH")"

cat >"$OUT_PATH" <<'NDJSON'
{"title":"[v0.1][Epic] UI: Controls & Storybook","body":"### 目的\nHyperbolic PoC を操作可能にする最小UI一式（角度・(p,q,r)・深さ・共役）と Storybook を整備し、A11y/Docs/Playテストまでを一貫提供する。\n\n### In / Out\nIn: 角度ピッカー,(p,q,r)セレクタ,深さD,共役ハンドル(2D),Storybook,基本A11y\nOut: 描画最適化,状態永続化,外観デザイン刷新\n\n### 完了条件(DoD)\n- [ ] Sequenceの子タスクが全てClose\n- [ ] Storybookで4コンポーネントがDocs/Controls/Play動作\n- [ ] キーボード操作とラベルが機能しa11yアドオンで重大違反なし\n\n### テスト観点\n- Storybookの操作確認/Playテスト\n- A11yアドオンの自動検査\n\nSequence: 1) React導入 2) Storybook基盤 3) AnglePicker 4) (p,q,r) 5) Depth 6) Conjugation(2D) 7) SB Docs/Play/A11y 8) A11y仕上げ","labels":["type:epic","area:ui"],"milestone":"v0.1 Hyperbolic PoC","parent":""}
{"title":"[v0.1][UI] React導入とAppシェル（Canvasホスト）","body":"### 目的\nUI実装の土台として React を導入し、Canvas をホストする最小のAppシェルを作る。\n\n### In / Out\nIn: react/react-dom, @vitejs/plugin-react, <App>に<canvas id=\"stage\">を配置\nOut: Storybook設定、幾何ロジック連携\n\n### 完了条件(DoD)\n- [ ] `pnpm dev` でCanvasが描画領域として表示\n- [ ] `pnpm typecheck`/`pnpm lint`/`pnpm test` が緑\n- [ ] 単体テストで <App> に `#stage` が存在\n\n### テスト観点\n- DOMスナップショット（最小）\n- 画面表示の目視確認","labels":["type:task","area:ui"],"milestone":"v0.1 Hyperbolic PoC","parent":"Epic: UI: Controls & Storybook"}
{"title":"[v0.1][UI] Storybookセットアップ（React/Vite/Docs/A11y）","body":"### 目的\nコンポーネントのDocs/Controls/Play/A11y検証を行う基盤として Storybook を導入する。\n\n### In / Out\nIn: React+Vite構成, addon-essentials, a11y, interactions, 初期ストーリー1件\nOut: ビジュアル回帰, CI組込み\n\n### 完了条件(DoD)\n- [ ] `pnpm storybook` で起動し初期ストーリーが表示\n- [ ] DocsタブとA11yアドオンが機能\n- [ ] Play関数が動作するサンプルを1件追加\n\n### テスト観点\n- ローカル起動確認\n- Play関数の動作ログ","labels":["type:task","area:ui"],"milestone":"v0.1 Hyperbolic PoC","parent":"Epic: UI: Controls & Storybook"}
{"title":"[v0.1][UI] 角度ピッカー: π/n・90°・接スナップ","body":"### 目的\n角度入力をπ/n・90°・接（tangent）にスナップ可能なAnglePickerを提供し操作性を確保する。\n\n### In / Out\nIn: value/onChange, n指定, 90°/接トグル, キーボード操作\nOut: 描画反映\n\n### 完了条件(DoD)\n- [ ] CSF3 StoryでControlsから値変更可能\n- [ ] キー操作で増減/トグルが機能\n- [ ] Playテストでπ/nステップが期待通り\n\n### テスト観点\n- ステップ丸めの単体テスト\n- Storybook Playでの相互作用","labels":["type:task","area:ui"],"milestone":"v0.1 Hyperbolic PoC","parent":"Epic: UI: Controls & Storybook"}
{"title":"[v0.1][UI] (p,q,r) セレクタ（入力+検証）","body":"### 目的\n三鏡型パラメータ (p,q,r) を入力・検証できるコントロールを提供する（プリセットは後続）。\n\n### In / Out\nIn: 整数入力, 1/p+1/q+1/r<1 の検証, エラーメッセージ\nOut: プリセット選択, 群展開ロジック\n\n### 完了条件(DoD)\n- [ ] 不正入力でエラー表示、正入力で消える\n- [ ] StoryでControls/Docsが機能\n- [ ] 検証関数が単体テストで緑\n\n### テスト観点\n- 検証関数の単体テスト\n- Storyの操作確認","labels":["type:task","area:ui"],"milestone":"v0.1 Hyperbolic PoC","parent":"Epic: UI: Controls & Storybook"}
{"title":"[v0.1][UI] 展開深さ D スライダ（最大10）","body":"### 目的\n群展開の深さDを指定するスライダを提供する（整数、既定3、最大10）。\n\n### In / Out\nIn: 範囲0–10, step=1, キーボード操作, 直接入力\nOut: 描画連携\n\n### 完了条件(DoD)\n- [ ] Storyで値変更が反映\n- [ ] キーボードで±1変更\n- [ ] Playテストで境界値(0/10)動作\n\n### テスト観点\n- Playテスト\n- a11yアドオン検査","labels":["type:task","area:ui"],"milestone":"v0.1 Hyperbolic PoC","parent":"Epic: UI: Controls & Storybook"}
{"title":"[v0.1][UI] 共役ハンドル（2D: 円板内ドラッグ）","body":"### 目的\n共役操作用の2Dハンドルを提供し、単位円板内のドラッグで連続パラメータを操作できるようにする。\n\n### In / Out\nIn: Canvas/DOM上のドラッグ, 値の正規化(単位円内), キーボード微調整\nOut: 実描画反映, 数式確定\n\n### 完了条件(DoD)\n- [ ] Storyでドラッグにより2D値が更新\n- [ ] 値は単位円内に常に正規化\n- [ ] キーボード操作で微調整が機能\n\n### テスト観点\n- 正規化関数の単体テスト\n- Storybook Playでのドラッグ操作","labels":["type:task","area:ui"],"milestone":"v0.1 Hyperbolic PoC","parent":"Epic: UI: Controls & Storybook"}
{"title":"[v0.1][UI] Storybook: CSF3/Controls/Docs/Play/A11y（4コンポーネント）","body":"### 目的\nAnglePicker,(p,q,r),Depth,Conjugation(2D) の4コンポーネントにCSF3 Stories/Docs/Controls/Play/A11yを揃える。\n\n### In / Out\nIn: 各story, Docs(MDX可), 基本Play, a11yアドオン適用\nOut: Visual回帰, CI\n\n### 完了条件(DoD)\n- [ ] 4コンポーネントのDocs/Controls/Playが動作\n- [ ] a11yの重大違反なし\n- [ ] Storybook起動手順をREADME追記\n\n### テスト観点\n- Playテストの通過\n- a11y目視確認","labels":["type:task","area:ui"],"milestone":"v0.1 Hyperbolic PoC","parent":"Epic: UI: Controls & Storybook"}
{"title":"[v0.1][UI] A11y仕上げ（ラベル/フォーカス/キーボード）","body":"### 目的\n基本アクセシビリティ（ラベル、フォーカス可視、キーボード操作）を満たすよう微修正を行う。\n\n### In / Out\nIn: aria-label/-describedby, フォーカスリング, タブ移動, SR文言\nOut: 視覚デザイン刷新\n\n### 完了条件(DoD)\n- [ ] タブ移動で全要素に到達\n- [ ] SR読み上げが意味的に通る\n- [ ] a11yアドオンで重大違反なし\n\n### テスト観点\n- キーボード操作の手動確認\n- a11yアドオン検査","labels":["type:task","area:ui"],"milestone":"v0.1 Hyperbolic PoC","parent":"Epic: UI: Controls & Storybook"}
NDJSON

echo "[ok] wrote ${OUT_PATH} (lines: $(wc -l <"${OUT_PATH}"))"

