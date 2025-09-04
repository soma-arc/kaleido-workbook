import { describe, it, expect } from 'vitest';
import { circleCircleIntersection } from '../../../src/geom/circle';
import type { Circle } from '../../../src/geom/types';

describe('circleCircleIntersection kind: none', () => {
    it('returns kind "none" for separated circles (d > r1 + r2)', () => {
        const A: Circle = { c: { x: 0, y: 0 }, r: 1 };
        const B: Circle = { c: { x: 3, y: 0 }, r: 1 };
        const out = circleCircleIntersection(A, B);
        expect(out.kind).toBe('none');
        if (out.points) expect(out.points.length).toBe(0);
    });
});

