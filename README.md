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
```

主なスクリプト（`package.json`）
- dev/build/preview
- typecheck
- lint/format（Biome・4スペース）
- test/test:sandbox/coverage（Vitest v8 coverage）

## 最低限の方針
- TDD で進める。受け入れテスト（`tests/acceptance/**`）は人間が作成しロック。エージェントは変更不可。
- 幾何の最初の対象は circle×circle。返却規約（kind/points）と「2点は x→y 昇順」を厳守。
- 1 タスク = 1 コミット。pre-commit で lint/format/test を通す。

## リンク
- docs/ROADMAP.md（中長期）
- TODO.md（スプリントの Now/Next/Later）
- AGENTS.md（作業範囲・禁止・DoD・TDD ルール）

ライセンス: LICENSE
