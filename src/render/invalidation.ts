export type Rect = { x: number; y: number; w: number; h: number };

function normRect(r: Rect): Rect {
  const x2 = r.x + r.w;
  const y2 = r.y + r.h;
  const x = Math.min(r.x, x2);
  const y = Math.min(r.y, y2);
  const w = Math.abs(r.w);
  const h = Math.abs(r.h);
  return { x, y, w, h };
}

export function intersects(a: Rect, b: Rect): boolean {
  a = normRect(a);
  b = normRect(b);
  return a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
}

export function adjacent(a: Rect, b: Rect): boolean {
  // share edge horizontally or vertically and overlapping on the other axis
  a = normRect(a);
  b = normRect(b);
  const horizTouch = a.y < b.y + b.h && b.y < a.y + a.h && (a.x + a.w === b.x || b.x + b.w === a.x);
  const vertTouch = a.x < b.x + b.w && b.x < a.x + a.w && (a.y + a.h === b.y || b.y + b.h === a.y);
  return horizTouch || vertTouch;
}

export function union(a: Rect, b: Rect): Rect {
  a = normRect(a);
  b = normRect(b);
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

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

export class InvalidationScheduler {
  private pending: Rect[] = [];
  private rafId: number | null = null;

  constructor(private onFlush: (rects: Rect[]) => void) {}

  invalidate(r: Rect): void {
    this.pending.push(normRect(r));
    if (this.rafId === null) {
      const raf = (globalThis.requestAnimationFrame ?? ((cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number)).bind(
        globalThis,
      );
      this.rafId = raf(() => this.flush());
    }
  }

  flush(): void {
    if (this.rafId !== null && globalThis.cancelAnimationFrame) {
      // not strictly necessary; frame just fired
      this.rafId = null;
    }
    if (this.pending.length === 0) return;
    const merged = mergeRects(this.pending);
    this.pending = [];
    this.onFlush(merged);
  }

  dispose(): void {
    if (this.rafId !== null && globalThis.cancelAnimationFrame) {
      globalThis.cancelAnimationFrame(this.rafId);
    }
    this.rafId = null;
    this.pending = [];
  }
}

