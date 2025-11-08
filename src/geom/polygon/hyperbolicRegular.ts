import type { Vec2 } from "@/geom/core/types";
import { GEODESIC_KIND, type Geodesic, geodesicThroughPoints } from "@/geom/primitives/geodesic";
import type { OrientedGeodesic } from "@/geom/primitives/orientedGeodesic";

const TAU = 2 * Math.PI;
const DEFAULT_TOLERANCE = 1e-12;
const DEFAULT_MAX_ITERATIONS = 128;
const MIN_RHO = 1e-9;
const MAX_RHO = 1 - 1e-9;

export type HyperbolicRegularNgonOptions = {
    rotation?: number;
    tolerance?: number;
    maxIterations?: number;
};

export type HyperbolicRegularNgonParams = {
    n: number;
    q: number;
} & HyperbolicRegularNgonOptions;

export type HyperbolicRegularNgonResult = {
    n: number;
    q: number;
    rho: number;
    alpha: number;
    edgeLength: number;
    vertices: Vec2[];
    geodesics: OrientedGeodesic[];
};

export function isHyperbolicNgonFeasible(n: number, q: number): boolean {
    return Number.isInteger(n) && Number.isInteger(q) && n >= 3 && q >= 3 && (n - 2) * (q - 2) > 4;
}

export function solveHyperbolicVertexRadius(
    n: number,
    alpha: number,
    options: HyperbolicRegularNgonOptions = {},
): number {
    if (!Number.isInteger(n) || n < 3) {
        throw new Error("n must be an integer >= 3");
    }
    if (!(alpha > 0 && alpha < Math.PI)) {
        throw new Error("alpha must be within (0, π)");
    }
    const edgeLength = edgeLengthFromAlpha(n, alpha);
    return rhoFromEdgeLength(n, edgeLength, options.tolerance, options.maxIterations);
}

export function buildHyperbolicRegularNgon(
    params: HyperbolicRegularNgonParams,
): HyperbolicRegularNgonResult {
    const { n, q, rotation = 0 } = params;
    if (!isHyperbolicNgonFeasible(n, q)) {
        throw new Error("(n, q) does not satisfy hyperbolic feasibility condition");
    }
    const alpha = (2 * Math.PI) / q;
    const rho = solveHyperbolicVertexRadius(n, alpha, params);
    const vertices = generateRegularVertices(n, rho, rotation);
    const interior = pickInteriorPoint(vertices);
    const geodesics = buildEdgeGeodesics(vertices, interior);
    const edgeLength = edgeLengthFromRho(n, rho);
    return {
        n,
        q,
        rho,
        alpha,
        edgeLength,
        vertices,
        geodesics,
    };
}

function edgeLengthFromRho(n: number, rho: number): number {
    if (!(rho > 0 && rho < 1)) {
        throw new Error("rho must be within (0, 1)");
    }
    const sinTerm = Math.sin(Math.PI / n);
    const numerator = 8 * rho * rho * sinTerm * sinTerm;
    const denominator = (1 - rho * rho) ** 2;
    const arg = 1 + numerator / denominator;
    return 2 * Math.acosh(arg);
}

function edgeLengthFromAlpha(n: number, alpha: number): number {
    const sinHalf = Math.sin(alpha / 2);
    if (!(sinHalf > 0 && sinHalf < 1)) {
        throw new Error("alpha produces invalid sine term");
    }
    const ratio = Math.cos(Math.PI / n) / sinHalf;
    if (!(ratio > 1)) {
        throw new Error("ratio must exceed 1 for hyperbolic polygons");
    }
    return 2 * Math.acosh(ratio);
}

function rhoFromEdgeLength(
    n: number,
    edgeLength: number,
    tolerance: number = DEFAULT_TOLERANCE,
    maxIterations: number = DEFAULT_MAX_ITERATIONS,
): number {
    let lo = MIN_RHO;
    let hi = MAX_RHO;
    let mid = 0.5 * (lo + hi);
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
        mid = 0.5 * (lo + hi);
        const value = edgeLengthFromRho(n, mid);
        if (Math.abs(value - edgeLength) <= tolerance) {
            return mid;
        }
        if (value > edgeLength) {
            hi = mid;
        } else {
            lo = mid;
        }
    }
    return mid;
}

function generateRegularVertices(n: number, rho: number, rotation: number): Vec2[] {
    const verts: Vec2[] = [];
    for (let k = 0; k < n; k += 1) {
        const theta = rotation + (TAU * k) / n;
        verts.push({ x: Math.cos(theta) * rho, y: Math.sin(theta) * rho });
    }
    return verts;
}

function pickInteriorPoint(vertices: Vec2[]): Vec2 {
    if (!vertices.length) {
        return { x: 0, y: 0 };
    }
    const sum = vertices.reduce((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }), { x: 0, y: 0 });
    const inv = 1 / vertices.length;
    const barycenter = { x: sum.x * inv, y: sum.y * inv };
    const distance = Math.hypot(barycenter.x, barycenter.y);
    if (distance > 1e-6) {
        return barycenter;
    }
    const first = vertices[0];
    return { x: first.x * 0.5, y: first.y * 0.5 };
}

function buildEdgeGeodesics(vertices: Vec2[], interior: Vec2): OrientedGeodesic[] {
    const edges: OrientedGeodesic[] = [];
    const count = vertices.length;
    for (let i = 0; i < count; i += 1) {
        const current = vertices[i];
        const next = vertices[(i + 1) % count];
        edges.push(orientedGeodesicBetween(current, next, interior));
    }
    return edges;
}

function orientedGeodesicBetween(p: Vec2, q: Vec2, interior: Vec2): OrientedGeodesic {
    const circle = solveOrthogonalCircle(p, q);
    if (circle) {
        return orientedCircleFromSolution(circle.center, circle.radius, interior);
    }
    const geodesic = geodesicThroughPoints(p, q);
    if (geodesic.kind === GEODESIC_KIND.circle) {
        return orientedCircleFromSolution(geodesic.c, geodesic.r, interior);
    }
    if (geodesic.kind === GEODESIC_KIND.diameter) {
        return orientedLineFromGeodesic(geodesic, interior);
    }
    throw new Error("Unsupported geodesic kind for hyperbolic n-gon edge");
}

function orientedCircleFromSolution(
    center: Vec2,
    radius: number,
    interior: Vec2,
): OrientedGeodesic {
    const dx = interior.x - center.x;
    const dy = interior.y - center.y;
    const distance = Math.hypot(dx, dy);
    const orientation: 1 | -1 = distance <= radius ? -1 : 1;
    return {
        kind: "circle",
        center: { x: center.x, y: center.y },
        radius,
        orientation,
    };
}

function orientedLineFromGeodesic(geodesic: Geodesic, interior: Vec2): OrientedGeodesic {
    if (geodesic.kind !== GEODESIC_KIND.diameter) {
        throw new Error("Expected diameter geodesic");
    }
    const normal = normalizeVector({ x: -geodesic.dir.y, y: geodesic.dir.x });
    const signed = normal.x * interior.x + normal.y * interior.y;
    const orientedNormal = signed <= 0 ? normal : { x: -normal.x, y: -normal.y };
    return {
        kind: "line",
        anchor: { x: 0, y: 0 },
        normal: orientedNormal,
    };
}

function solveOrthogonalCircle(p: Vec2, q: Vec2): { center: Vec2; radius: number } | null {
    const a = p.x;
    const b = p.y;
    const c = q.x;
    const d = q.y;
    const rhs1 = 0.5 * (1 + a * a + b * b);
    const rhs2 = 0.5 * (1 + c * c + d * d);
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-12) {
        return null;
    }
    const cx = (rhs1 * d - rhs2 * b) / det;
    const cy = (-rhs1 * c + rhs2 * a) / det;
    const radiusSq = Math.max(0, cx * cx + cy * cy - 1);
    return {
        center: { x: cx, y: cy },
        radius: Math.sqrt(radiusSq),
    };
}

function normalizeVector(v: Vec2): Vec2 {
    const length = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / length, y: v.y / length };
}
