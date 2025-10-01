import { clamp } from "@/geom/core/math";
import type { Vec2 } from "@/geom/core/types";

export type ThirdMirrorSolution = {
    c: Vec2;
    r: number;
    parameter: number;
};

type CircleParameters = {
    cx: number;
    cy: number;
    dx: number;
    r: number;
};

const DEFAULT_INTERVAL: readonly [number, number] = [0.1, 0.9];
const SECANT_CLAMP: readonly [number, number] = [0.05, 0.95];
const MAX_BISECTION_ITER = 60;
const BISECTION_EPS = 5e-4;
const INTERVAL_EPS = 1e-6;

export function unitDirection(alpha: number): Vec2 {
    return { x: Math.cos(alpha), y: Math.sin(alpha) };
}

export function circleFromParameter(t: number, beta: number): CircleParameters {
    const cx = (1 + t * t) / (2 * t);
    const dx = t - cx;
    const cy = Math.abs(dx) / Math.tan(beta);
    const r = Math.hypot(dx, cy);
    return { cx, cy, dx, r };
}

function angleAtSecondMirror(t: number, alpha: number, beta: number): number {
    const { cx, cy, r } = circleFromParameter(t, beta);
    const u = unitDirection(alpha);
    const cdotu = cx * u.x + cy * u.y;
    const disc = Math.max(0, cdotu * cdotu - 1);
    const s = cdotu - Math.sqrt(disc);
    const qx = s * u.x;
    const qy = s * u.y;
    const nx = (qx - cx) / r;
    const ny = (qy - cy) / r;
    const dot = Math.abs(nx * u.x + ny * u.y);
    return Math.asin(clamp(dot, 0, 1));
}

function findSignChange(
    fn: (t: number) => number,
    start: readonly [number, number] = DEFAULT_INTERVAL,
): [number, number, number, number] | null {
    const [a, b] = start;
    const fa = fn(a);
    const fb = fn(b);
    if (fa * fb <= 0) {
        return [a, b, fa, fb];
    }

    const steps = 20;
    let prevT = a;
    let prevF = fa;
    for (let i = 1; i <= steps; i++) {
        const t = a + ((b - a) * i) / steps;
        const f = fn(t);
        if (prevF * f <= 0) {
            return [prevT, t, prevF, f];
        }
        prevT = t;
        prevF = f;
    }
    return null;
}

function secantRefine(
    fn: (t: number) => number,
    initial: readonly [number, number] = [0.5, 0.6],
    iterations = 12,
): number {
    let [t0, t1] = initial;
    let f0 = fn(t0);
    let f1 = fn(t1);
    for (let i = 0; i < iterations; i++) {
        const denom = Math.max(Math.abs(f1 - f0), 1e-6);
        const dt = (t1 - t0) / denom;
        const candidate = clamp(t1 - f1 * dt, SECANT_CLAMP[0], SECANT_CLAMP[1]);
        t0 = t1;
        f0 = f1;
        t1 = candidate;
        f1 = fn(t1);
    }
    return t1;
}

function bisection(fn: (t: number) => number, bracket: [number, number, number, number]): number {
    let [a, b, fa, fb] = bracket;
    for (let i = 0; i < MAX_BISECTION_ITER; i++) {
        const m = 0.5 * (a + b);
        const fm = fn(m);
        if (Math.abs(fm) < BISECTION_EPS || Math.abs(b - a) < INTERVAL_EPS) {
            return m;
        }
        const leftSign = fa * fm;
        const rightSign = fb * fm;
        if (rightSign <= 0 && leftSign > 0) {
            a = m;
            fa = fm;
        } else {
            b = m;
            fb = fm;
        }
    }
    return 0.5 * (a + b);
}

export function solveThirdMirror(alpha: number, beta: number, gamma: number): ThirdMirrorSolution {
    const fn = (t: number) => angleAtSecondMirror(t, alpha, beta) - gamma;
    const bracket = findSignChange(fn);
    let parameter: number;
    if (bracket) {
        parameter = bisection(fn, bracket);
    } else {
        parameter = secantRefine(fn);
    }
    const { cx, cy, r } = circleFromParameter(parameter, beta);
    return { c: { x: cx, y: cy }, r, parameter };
}
