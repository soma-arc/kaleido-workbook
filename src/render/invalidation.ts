/**
 * Invalidation (Dirty Region) utilities
 *
 * Concept
 * - UIの変更で「どの画面領域を再描画すべきか」を矩形(Rect)で表現し、
 *   同一フレーム内の複数の invalidation をまとめて(=coalesce)処理します。
 * - 交差 or 辺で隣接する矩形だけを結合し、離れた領域は分割のまま保持することで、
 *   単一の巨大バウンディングボックスに潰すよりも再描画コストを抑えます。
 *
 * スケジューリング
 * - `invalidate(rect)` を呼ぶと次の `requestAnimationFrame` フレームで
 *   矩形群をマージして `onFlush(mergedRects)` に通知します。
 * - `dispose()` で保留キューを破棄します。
 *
 * マージ戦略・計算量
 * - 交差(`intersects`) or 辺で隣接(`adjacent`)なら `union` で結合し、
 *   これを変化がなくなるまで O(n^2) で繰り返す簡易実装です（WP 範囲）。
 * - 領域数が多くなったら sweep-line / R-Tree 等への置き換えが可能です。
 *
 * 想定される使い方
 * - 状態変更が起きたときに `invalidate({...})` を呼ぶ。
 * - `onFlush(rects)` では、各 rect と交差する描画プリミティブだけ再描画する。
 */
export type Rect = { x: number; y: number; w: number; h: number };

/**
 * 正規化: 右下座標から来ても (x,y,w,h) が常に正になるよう整えます。
 */
function normRect(r: Rect): Rect {
    const x2 = r.x + r.w;
    const y2 = r.y + r.h;
    const x = Math.min(r.x, x2);
    const y = Math.min(r.y, y2);
    const w = Math.abs(r.w);
    const h = Math.abs(r.h);
    return { x, y, w, h };
}

/**
 * 交差判定: 2矩形が重なっているか（辺や点の接触も交差扱い）
 */
export function intersects(a: Rect, b: Rect): boolean {
    a = normRect(a);
    b = normRect(b);
    return a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
}

/**
 * 隣接判定: 2矩形が水平または垂直の辺で接しており、反対軸で重なっているか
 */
export function adjacent(a: Rect, b: Rect): boolean {
    // share edge horizontally or vertically and overlapping on the other axis
    a = normRect(a);
    b = normRect(b);
    const horizTouch =
        a.y < b.y + b.h && b.y < a.y + a.h && (a.x + a.w === b.x || b.x + b.w === a.x);
    const vertTouch =
        a.x < b.x + b.w && b.x < a.x + a.w && (a.y + a.h === b.y || b.y + b.h === a.y);
    return horizTouch || vertTouch;
}

/**
 * 外接矩形を返す（最小の共通バウンディングボックス）
 */
export function union(a: Rect, b: Rect): Rect {
    a = normRect(a);
    b = normRect(b);
    const x1 = Math.min(a.x, b.x);
    const y1 = Math.min(a.y, b.y);
    const x2 = Math.max(a.x + a.w, b.x + b.w);
    const y2 = Math.max(a.y + a.h, b.y + b.h);
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/**
 * 交差/隣接する矩形を結合して、できるだけ少ない矩形集合に縮約します。
 * 厳密最小は保証しませんが、実装が単純で十分な削減効果が得られます。
 */
function mergeRects(rects: Rect[]): Rect[] {
    // naive O(n^2) merge of intersecting/adjacent rectangles
    const rs = rects.map(normRect);
    let changed = true;
    while (changed) {
        changed = false;
        for (let i = 0; i < rs.length && !changed; i++) {
            for (let j = i + 1; j < rs.length && !changed; j++) {
                const a = rs[i];
                const b = rs[j];
                if (intersects(a, b) || adjacent(a, b)) {
                    const u = union(a, b);
                    rs.splice(j, 1);
                    rs[i] = u;
                    changed = true;
                }
            }
        }
    }
    return rs;
}

/**
 * InvalidationScheduler
 * - `invalidate(rect)` を貯め、次フレームでマージして `onFlush` に渡します。
 * - 同フレーム中の複数呼び出しは 1 回の flush に coalesce されます。
 */
export class InvalidationScheduler {
    private pending: Rect[] = [];
    private rafId: number | null = null;

    /**
     * @param onFlush 結合後の dirty 矩形集合が確定したときに呼ばれます。
     */
    constructor(private onFlush: (rects: Rect[]) => void) {}

    /**
     * 次のフレームで再描画したい領域を追加します。
     * 複数回呼ばれても同フレーム内では 1 回の flush にまとまります。
     */
    invalidate(r: Rect): void {
        this.pending.push(normRect(r));
        if (this.rafId === null) {
            const raf = (
                globalThis.requestAnimationFrame ??
                ((cb: FrameRequestCallback) =>
                    setTimeout(() => cb(performance.now()), 16) as unknown as number)
            ).bind(globalThis);
            this.rafId = raf(() => this.flush());
        }
    }

    /**
     * 即時にマージと通知を行います（通常は RAF により内部から呼ばれます）。
     */
    flush(): void {
        if (this.rafId !== null) {
            const caf = globalThis.cancelAnimationFrame?.bind(globalThis);
            if (caf) caf(this.rafId);
            this.rafId = null;
        }
        if (this.pending.length === 0) return;
        const merged = mergeRects(this.pending);
        this.pending = [];
        this.onFlush(merged);
    }

    /**
     * 保留キューを破棄し、将来のフラッシュを止めます。
     */
    dispose(): void {
        if (this.rafId !== null) {
            const caf = globalThis.cancelAnimationFrame?.bind(globalThis);
            if (caf) caf(this.rafId);
        }
        this.rafId = null;
        this.pending = [];
    }
}
