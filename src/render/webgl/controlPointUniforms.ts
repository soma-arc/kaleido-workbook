import type { HalfPlaneControlPoints } from "@/geom/primitives/halfPlaneControls";

/**
 * Control point uniform data structures and utilities.
 */

/**
 * Shape types for control points.
 */
export const SHAPE_CIRCLE = 0;
export const SHAPE_SQUARE = 1;

/**
 * A single control point's visual properties.
 */
export interface ControlPoint {
    /** World-space position */
    position: { x: number; y: number };
    /** Radius in pixels */
    radiusPx: number;
    /** Fill color (RGBA, 0-1 range) */
    fillColor: { r: number; g: number; b: number; a: number };
    /** Stroke color (RGBA, 0-1 range) */
    strokeColor: { r: number; g: number; b: number; a: number };
    /** Stroke width in pixels */
    strokeWidthPx: number;
    /** Shape type (SHAPE_CIRCLE or SHAPE_SQUARE) */
    shape: number;
}

/**
 * Packed uniform arrays for control points, ready for WebGL upload.
 */
export interface ControlPointUniforms {
    count: number;
    positions: Float32Array;
    radiiPx: Float32Array;
    fillColors: Float32Array;
    strokeColors: Float32Array;
    strokeWidthsPx: Float32Array;
    shapes: Int32Array;
}

/**
 * Build uniform arrays from control point data.
 * @param controlPoints - Array of control points to render
 * @param maxCount - Maximum capacity (must match shader MAX_CONTROL_POINTS)
 * @returns Packed uniform data
 */
export function buildControlPointUniforms(
    controlPoints: readonly ControlPoint[],
    maxCount: number,
): ControlPointUniforms {
    const count = Math.min(controlPoints.length, maxCount);

    const positions = new Float32Array(maxCount * 2);
    const radiiPx = new Float32Array(maxCount);
    const fillColors = new Float32Array(maxCount * 4);
    const strokeColors = new Float32Array(maxCount * 4);
    const strokeWidthsPx = new Float32Array(maxCount);
    const shapes = new Int32Array(maxCount);

    for (let i = 0; i < count; i++) {
        const cp = controlPoints[i];
        positions[i * 2] = cp.position.x;
        positions[i * 2 + 1] = cp.position.y;
        radiiPx[i] = cp.radiusPx;
        fillColors[i * 4] = cp.fillColor.r;
        fillColors[i * 4 + 1] = cp.fillColor.g;
        fillColors[i * 4 + 2] = cp.fillColor.b;
        fillColors[i * 4 + 3] = cp.fillColor.a;
        strokeColors[i * 4] = cp.strokeColor.r;
        strokeColors[i * 4 + 1] = cp.strokeColor.g;
        strokeColors[i * 4 + 2] = cp.strokeColor.b;
        strokeColors[i * 4 + 3] = cp.strokeColor.a;
        strokeWidthsPx[i] = cp.strokeWidthPx;
        shapes[i] = cp.shape;
    }

    return {
        count,
        positions,
        radiiPx,
        fillColors,
        strokeColors,
        strokeWidthsPx,
        shapes,
    };
}

/**
 * Convert HalfPlaneControlPoints to ControlPoint array for WebGL rendering.
 * Fixed points are rendered as squares, free points as circles.
 * @param halfPlaneControlPoints - Dynamic control points from UI state
 * @returns Array of control points with visual properties
 */
export function convertHalfPlaneControlPointsToRenderPoints(
    halfPlaneControlPoints: HalfPlaneControlPoints[] | null | undefined,
): ControlPoint[] {
    if (!halfPlaneControlPoints) {
        return [];
    }

    const points: ControlPoint[] = [];
    const seenIds = new Set<string>();

    for (const pair of halfPlaneControlPoints) {
        for (const point of pair) {
            // Skip duplicates (same id appearing in multiple planes)
            if (seenIds.has(point.id)) {
                continue;
            }
            seenIds.add(point.id);

            // Fixed points: red square, Free points: blue circle
            const isFixed = point.fixed;
            points.push({
                position: { x: point.x, y: point.y },
                radiusPx: 8,
                fillColor: isFixed
                    ? { r: 0.9, g: 0.2, b: 0.2, a: 0.8 } // Red for fixed
                    : { r: 0.2, g: 0.4, b: 0.9, a: 0.8 }, // Blue for free
                strokeColor: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
                strokeWidthPx: 2,
                shape: isFixed ? SHAPE_SQUARE : SHAPE_CIRCLE,
            });
        }
    }

    return points;
}
