import { describe, it, expect } from 'vitest';
import { circleCircleIntersection } from '../../../src/geom/circle';
import type { Circle } from '../../../src/geom/types';

describe('circleCircleIntersection kind: tangent (external)', () => {
    it('returns kind "tangent" and one point for external tangency', () => {
        const A: Circle = { c: { x: 0, y: 0 }, r: 5 };
        const B: Circle = { c: { x: 10, y: 0 }, r: 5 }; // tangent at (5,0)
        const out = circleCircleIntersection(A, B);
        expect(out.kind).toBe('tangent');
        expect(out.points && out.points.length).toBe(1);
        const p = out.points![0];
        expect(p.x).toBeCloseTo(5, 12);
        expect(p.y).toBeCloseTo(0, 12);
    });
});

