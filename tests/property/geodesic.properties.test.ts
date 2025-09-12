import { test, fc } from "@fast-check/vitest";
import { geodesicFromBoundary } from "../../src/geom/geodesic";
import type { Vec2 } from "../../src/geom/types";

const pt = (t: number): Vec2 => ({ x: Math.cos(t), y: Math.sin(t) });
const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
const norm = (v: Vec2): number => Math.hypot(v.x, v.y);
const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
const eps = (scale = 1) => 1e-12 * Math.max(1, scale);

const angleArb = fc.double({
    min: -5 * Math.PI,
    max: 5 * Math.PI,
    noNaN: true,
    noDefaultInfinity: true,
});

test.prop([angleArb, angleArb])("geodesic classification and invariants", (t1, t2) => {
    // Avoid near-equal endpoints: use sin((t2-t1)/2) which is stable for tiny differences
    fc.pre(Math.abs(Math.sin(0.5 * (t2 - t1))) > 1e-6);
    const a = pt(t1);
    const b = pt(t2);
    const opp = norm(add(a, b)) <= 1e-12; // a ≈ -b
    const g = geodesicFromBoundary(a, b);
    if (opp) {
        // diameter: dir is unit and parallel to a
        if (g.kind !== "diameter") return false;
        if (Math.abs(norm(g.dir) - 1) > 1e-12) return false;
        const cross = g.dir.x * a.y - g.dir.y * a.x;
        return Math.abs(cross) <= 1e-12;
    } else {
        if (g.kind !== "circle") return false;
        // invariants (with scale-aware tolerance for ill-conditioned cases)
        const da = Math.hypot(a.x - g.c.x, a.y - g.c.y);
        const db = Math.hypot(b.x - g.c.x, b.y - g.c.y);
        const eR = 1e-12 + 1e-4 * g.r; // absolute + relative (for tiny/huge radius)
        if (Math.abs(da - g.r) > eR) return false;
        if (Math.abs(db - g.r) > eR) return false;
        const c2 = g.c.x * g.c.x + g.c.y * g.c.y;
        if (Math.abs(c2 - (1 + g.r * g.r)) > eps(c2)) return false;
        if (Math.abs(dot(a, g.c) - 1) > eps(1)) return false;
        if (Math.abs(dot(b, g.c) - 1) > eps(1)) return false;
        return true;
    }
});
