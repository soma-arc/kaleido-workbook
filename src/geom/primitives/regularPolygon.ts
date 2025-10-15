import type { Vec2 } from "@/geom/core/types";
import { type HalfPlane, normalizeHalfPlane } from "./halfPlane";

const TAU = Math.PI * 2;
const DEFAULT_RADIUS = 1.0;

/**
 * 指定枚数の正多角形に外接する半平面を生成する。
 * - 法線ベクトルは単位長に正規化された状態で返す。
 * - アンカー点は既存の 4/5/6 面シーンと同じ外接半径を原点中心に配置する。
 */
export function generateRegularPolygonHalfplanes(sides: number): HalfPlane[] {
    if (!Number.isInteger(sides) || sides < 3) {
        throw new Error("sides must be an integer >= 3");
    }

    const angularStep = TAU / sides;
    const radius = DEFAULT_RADIUS;
    const planes: HalfPlane[] = [];

    for (let i = 0; i < sides; i += 1) {
        const angle = i * angularStep;
        const outward: Vec2 = { x: Math.cos(angle), y: Math.sin(angle) };
        const anchor: Vec2 = { x: outward.x * radius, y: outward.y * radius };
        const inwardNormal: Vec2 = { x: -outward.x, y: -outward.y };
        planes.push(normalizeHalfPlane({ anchor, normal: inwardNormal }));
    }

    return planes;
}
