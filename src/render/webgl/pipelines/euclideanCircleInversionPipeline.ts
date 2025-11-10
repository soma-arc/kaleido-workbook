import type { Vec2 } from "@/geom/core/types";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { HalfPlaneControlPoints } from "@/geom/primitives/halfPlaneControls";
import {
    type InvertedLineImage,
    invertInCircle,
    invertLineInCircle,
} from "@/geom/transforms/inversion";
import { SCENE_IDS } from "@/ui/scenes";
import type { CircleInversionState } from "@/ui/scenes/circleInversionConfig";
import {
    buildControlPointUniforms,
    type ControlPoint as RenderControlPoint,
    SHAPE_CIRCLE,
} from "../controlPointUniforms";
import {
    registerSceneWebGLPipeline,
    type WebGLPipelineInstance,
    type WebGLPipelineRenderContext,
} from "../pipelineRegistry";
import fragmentShaderSource from "../shaders/euclideanCircleInversion.frag?raw";
import vertexShaderSource from "../shaders/geodesic.vert?raw";
import { createTextureManager, type TextureManager } from "../textureManager";
import { EUCLIDEAN_CIRCLE_INVERSION_PIPELINE_ID } from "./pipelineIds";
import { getUniformLocation } from "./uniformUtils";

const PRIMARY_RECT_COLOR = [0.9490196078, 0.4980392157, 0.4980392157, 0.75] as const;
const SECONDARY_RECT_COLOR = [0.9490196078, 0.4980392157, 0.4980392157, 0.65] as const;
const CIRCLE_COLOR = [0.95, 0.98, 1.0, 0.9] as const;

const RECT_FEATHER_PX = 1.5;
const CIRCLE_STROKE_WIDTH_PX = 2.0;
const CIRCLE_FEATHER_PX = 1.2;
const SECONDARY_RECT_FEATHER_PX = 1.5;
const LINE_COLOR = [241 / 255, 178 / 255, 74 / 255, 0.85] as const;
const INVERTED_LINE_COLOR = [241 / 255, 178 / 255, 74 / 255, 0.85] as const;
const LINE_STROKE_WIDTH_PX = 2.0;
const LINE_FEATHER_PX = 1.1;
const DEFAULT_TEXTURE_ASPECT = 1;
const LINE_START_POINT_COLOR = [0.992, 0.525, 0.255, 0.95] as const;
const LINE_END_POINT_COLOR = [0.184, 0.733, 0.965, 0.95] as const;
const CENTER_POINT_COLOR = [0.94, 0.94, 0.94, 0.9] as const;
const CONTROL_POINT_STROKE_COLOR = [0.08, 0.08, 0.08, 1.0] as const;
const INVERTED_POINT_ALPHA = 0.7;
const CONTROL_POINT_RADIUS_PX = 8;
const CONTROL_POINT_STROKE_WIDTH_PX = 2;
const MAX_CONTROL_POINTS = 16;
const CIRCLE_LINE_START_ID = "circle-line-start";
const CIRCLE_LINE_END_ID = "circle-line-end";

export type CircleInversionLineUniforms = {
    start: Vec2;
    end: Vec2;
    inverted:
        | { mode: "line"; line: { normal: Vec2; offset: number } }
        | { mode: "circle"; circle: { center: Vec2; radius: number } };
};

function deriveLineCoefficients(start: Vec2, end: Vec2): { normal: Vec2; offset: number } {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (!(length > 0)) {
        return { normal: { x: 0, y: 1 }, offset: 0 };
    }
    const normal = { x: -dy / length, y: dx / length };
    const offset = normal.x * start.x + normal.y * start.y;
    return { normal, offset };
}

function mapInvertedImage(image: InvertedLineImage) {
    if (image.kind === "circle") {
        return {
            mode: "circle" as const,
            circle: {
                center: { x: image.center.x, y: image.center.y },
                radius: image.radius,
            },
        };
    }
    return {
        mode: "line" as const,
        line: {
            normal: { x: image.normal.x, y: image.normal.y },
            offset: image.offset,
        },
    };
}

export function computeLineUniforms(state: CircleInversionState): CircleInversionLineUniforms {
    const base = deriveLineCoefficients(state.line.start, state.line.end);
    try {
        const inverted = invertLineInCircle(
            { start: state.line.start, end: state.line.end },
            { c: state.fixedCircle.center, r: state.fixedCircle.radius },
        );
        return {
            start: state.line.start,
            end: state.line.end,
            inverted: mapInvertedImage(inverted),
        };
    } catch {
        return {
            start: state.line.start,
            end: state.line.end,
            inverted: {
                mode: "line",
                line: base,
            },
        };
    }
}

class EuclideanCircleInversionPipeline implements WebGLPipelineInstance {
    private readonly gl: WebGL2RenderingContext;
    private readonly program: WebGLProgram;
    private readonly vao: WebGLVertexArrayObject;
    private readonly vertexBuffer: WebGLBuffer;
    private readonly uniforms: UniformLocations;
    private readonly textureManager: TextureManager;

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        this.program = linkProgram(gl, vertex, fragment);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);

        const vao = gl.createVertexArray();
        if (!vao) throw new Error("Failed to create VAO");
        this.vao = vao;
        const vertexBuffer = gl.createBuffer();
        if (!vertexBuffer) throw new Error("Failed to create vertex buffer");
        this.vertexBuffer = vertexBuffer;

        const fullscreenTriangle = new Float32Array([-1, -1, 3, -1, -1, 3]);

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, fullscreenTriangle, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        this.uniforms = resolveUniformLocations(gl, this.program);
        this.textureManager = createTextureManager(gl);

        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation outside React components.
        gl.useProgram(this.program);
        gl.uniform4f(this.uniforms.rectColor, ...PRIMARY_RECT_COLOR);
        gl.uniform4f(this.uniforms.invertedColor, ...PRIMARY_RECT_COLOR);
        gl.uniform4f(this.uniforms.circleColor, ...CIRCLE_COLOR);
        gl.uniform4f(this.uniforms.secondaryRectColor, ...SECONDARY_RECT_COLOR);
        gl.uniform4f(this.uniforms.secondaryInvertedColor, ...SECONDARY_RECT_COLOR);
        gl.uniform4f(this.uniforms.lineColor, ...LINE_COLOR);
        gl.uniform4f(this.uniforms.invertedLineColor, ...INVERTED_LINE_COLOR);
        gl.uniform1f(this.uniforms.rectFeatherPx, RECT_FEATHER_PX);
        gl.uniform1f(this.uniforms.circleStrokeWidthPx, CIRCLE_STROKE_WIDTH_PX);
        gl.uniform1f(this.uniforms.circleFeatherPx, CIRCLE_FEATHER_PX);
        gl.uniform1f(this.uniforms.secondaryRectFeatherPx, SECONDARY_RECT_FEATHER_PX);
        gl.uniform1f(this.uniforms.lineStrokeWidthPx, LINE_STROKE_WIDTH_PX);
        gl.uniform1f(this.uniforms.lineFeatherPx, LINE_FEATHER_PX);
        gl.uniform1f(this.uniforms.invertedLineStrokeWidthPx, LINE_STROKE_WIDTH_PX);
        gl.uniform1f(this.uniforms.invertedLineFeatherPx, LINE_FEATHER_PX);
        gl.uniform1i(this.uniforms.textureEnabled, 0);
        gl.uniform2f(this.uniforms.textureOffset, 0, 0);
        gl.uniform2f(this.uniforms.textureScale, 1, 1);
        gl.uniform1f(this.uniforms.textureRotation, 0);
        gl.uniform1f(this.uniforms.textureOpacity, 1);
        gl.uniform1f(this.uniforms.textureAspect, DEFAULT_TEXTURE_ASPECT);
        gl.uniform1i(this.uniforms.showReferenceRectangle, 1);
        gl.uniform1i(this.uniforms.showInvertedRectangle, 1);
        gl.uniform1i(this.uniforms.showSecondaryRectangle, 1);
        gl.uniform1i(this.uniforms.showSecondaryInvertedRectangle, 1);
        gl.uniform1i(this.uniforms.showReferenceLine, 1);
        gl.uniform1i(this.uniforms.showInvertedLine, 1);
        gl.uniform1i(this.uniforms.invertedLineIsCircle, 0);
        gl.uniform1i(this.uniforms.controlPointCount, 0);
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation outside React components.
        gl.useProgram(null);
    }

    render({
        sceneDefinition,
        renderScene,
        viewport,
        canvas,
        textures,
        halfPlaneControlPoints,
    }: WebGLPipelineRenderContext): void {
        if (renderScene.geometry !== GEOMETRY_KIND.euclidean) {
            return;
        }
        const gl = this.gl;
        const width = canvas.width || gl.drawingBufferWidth || 1;
        const height = canvas.height || gl.drawingBufferHeight || 1;

        const resolvedState = resolveInversionState(sceneDefinition?.inversionConfig, renderScene);
        if (!resolvedState) {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            return;
        }

        const lineUniforms = computeLineUniforms(resolvedState);
        const showReferenceRectangle = resolvedState.display.showReferenceRectangle ? 1 : 0;
        const showInvertedRectangle = resolvedState.display.showInvertedRectangle ? 1 : 0;
        const showSecondaryRectangle = resolvedState.display.showSecondaryRectangle ? 1 : 0;
        const showSecondaryInvertedRectangle = resolvedState.display.showSecondaryInvertedRectangle
            ? 1
            : 0;
        const showReferenceLine = resolvedState.display.showReferenceLine ? 1 : 0;
        const showInvertedLine = resolvedState.display.showInvertedLine ? 1 : 0;

        const textureData = this.textureManager.sync(textures ?? []);
        let activeTextureSlot = -1;
        for (let slot = 0; slot < textureData.enabled.length; slot += 1) {
            if (textureData.enabled[slot] === 1) {
                activeTextureSlot = slot;
                break;
            }
        }
        const textureEnabled = resolvedState.display.textureEnabled && activeTextureSlot >= 0;

        gl.viewport(0, 0, width, height);
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation outside React components.
        gl.useProgram(this.program);
        gl.uniform2f(this.uniforms.resolution, width, height);
        gl.uniform3f(this.uniforms.viewport, viewport.scale, viewport.tx, viewport.ty);
        gl.uniform2f(
            this.uniforms.circleCenter,
            resolvedState.fixedCircle.center.x,
            resolvedState.fixedCircle.center.y,
        );
        gl.uniform1f(this.uniforms.circleRadius, resolvedState.fixedCircle.radius);
        gl.uniform2f(
            this.uniforms.rectCenter,
            resolvedState.rectangle.center.x,
            resolvedState.rectangle.center.y,
        );
        gl.uniform2f(
            this.uniforms.rectHalfExtents,
            resolvedState.rectangle.halfExtents.x,
            resolvedState.rectangle.halfExtents.y,
        );
        gl.uniform1f(this.uniforms.rectRotation, resolvedState.rectangle.rotation);
        const textureAspect =
            resolvedState.textureAspect && resolvedState.textureAspect > 0
                ? resolvedState.textureAspect
                : resolvedState.rectangle.halfExtents.x /
                  Math.max(resolvedState.rectangle.halfExtents.y, 1e-6);
        gl.uniform1f(this.uniforms.textureAspect, textureAspect);
        gl.uniform2f(
            this.uniforms.secondaryRectCenter,
            resolvedState.secondaryRectangle.center.x,
            resolvedState.secondaryRectangle.center.y,
        );
        gl.uniform2f(
            this.uniforms.secondaryRectHalfExtents,
            resolvedState.secondaryRectangle.halfExtents.x,
            resolvedState.secondaryRectangle.halfExtents.y,
        );
        gl.uniform1f(
            this.uniforms.secondaryRectRotation,
            resolvedState.secondaryRectangle.rotation,
        );
        gl.uniform1i(this.uniforms.showReferenceRectangle, showReferenceRectangle);
        gl.uniform1i(this.uniforms.showInvertedRectangle, showInvertedRectangle);
        gl.uniform1i(this.uniforms.showSecondaryRectangle, showSecondaryRectangle);
        gl.uniform1i(this.uniforms.showSecondaryInvertedRectangle, showSecondaryInvertedRectangle);
        gl.uniform1i(this.uniforms.showReferenceLine, showReferenceLine);
        gl.uniform1i(this.uniforms.showInvertedLine, showInvertedLine);
        gl.uniform2f(this.uniforms.lineA, lineUniforms.start.x, lineUniforms.start.y);
        gl.uniform2f(this.uniforms.lineB, lineUniforms.end.x, lineUniforms.end.y);

        if (lineUniforms.inverted.mode === "circle") {
            gl.uniform1i(this.uniforms.invertedLineIsCircle, 1);
            gl.uniform2f(
                this.uniforms.invertedLineCircleCenter,
                lineUniforms.inverted.circle.center.x,
                lineUniforms.inverted.circle.center.y,
            );
            gl.uniform1f(
                this.uniforms.invertedLineCircleRadius,
                lineUniforms.inverted.circle.radius,
            );
            gl.uniform2f(this.uniforms.invertedLineNormal, 0, 1);
            gl.uniform1f(this.uniforms.invertedLineOffset, 0);
        } else {
            gl.uniform1i(this.uniforms.invertedLineIsCircle, 0);
            gl.uniform2f(this.uniforms.invertedLineCircleCenter, 0, 0);
            gl.uniform1f(this.uniforms.invertedLineCircleRadius, 0);
            gl.uniform2f(
                this.uniforms.invertedLineNormal,
                lineUniforms.inverted.line.normal.x,
                lineUniforms.inverted.line.normal.y,
            );
            gl.uniform1f(this.uniforms.invertedLineOffset, lineUniforms.inverted.line.offset);
        }

        if (textureEnabled) {
            const baseIndex = activeTextureSlot * 2;
            gl.uniform1i(this.uniforms.textureEnabled, 1);
            gl.uniform1i(this.uniforms.textureSampler, activeTextureSlot);
            gl.uniform2f(
                this.uniforms.textureOffset,
                textureData.offset[baseIndex],
                textureData.offset[baseIndex + 1],
            );
            gl.uniform2f(
                this.uniforms.textureScale,
                textureData.scale[baseIndex],
                textureData.scale[baseIndex + 1],
            );
            gl.uniform1f(this.uniforms.textureRotation, textureData.rotation[activeTextureSlot]);
            gl.uniform1f(this.uniforms.textureOpacity, textureData.opacity[activeTextureSlot]);
        } else {
            gl.uniform1i(this.uniforms.textureEnabled, 0);
            gl.uniform2f(this.uniforms.textureOffset, 0, 0);
            gl.uniform2f(this.uniforms.textureScale, 1, 1);
            gl.uniform1f(this.uniforms.textureRotation, 0);
            gl.uniform1f(this.uniforms.textureOpacity, 1);
            gl.uniform1f(this.uniforms.textureAspect, textureAspect);
        }

        const controlPointMarkers = buildCircleInversionControlPoints(
            halfPlaneControlPoints,
            resolvedState,
        );
        const controlPointUniforms = buildControlPointUniforms(
            controlPointMarkers,
            MAX_CONTROL_POINTS,
        );
        gl.uniform1i(this.uniforms.controlPointCount, controlPointUniforms.count);
        gl.uniform2fv(this.uniforms.controlPointPositions, controlPointUniforms.positions);
        gl.uniform1fv(this.uniforms.controlPointRadiiPx, controlPointUniforms.radiiPx);
        gl.uniform4fv(this.uniforms.controlPointFillColors, controlPointUniforms.fillColors);
        gl.uniform4fv(this.uniforms.controlPointStrokeColors, controlPointUniforms.strokeColors);
        gl.uniform1fv(
            this.uniforms.controlPointStrokeWidthsPx,
            controlPointUniforms.strokeWidthsPx,
        );
        gl.uniform1iv(this.uniforms.controlPointShapes, controlPointUniforms.shapes);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation outside React components.
        gl.useProgram(null);
    }

    dispose(): void {
        const gl = this.gl;
        this.textureManager.dispose();
        gl.deleteBuffer(this.vertexBuffer);
        gl.deleteVertexArray(this.vao);
        gl.deleteProgram(this.program);
    }
}

type UniformLocations = {
    resolution: WebGLUniformLocation;
    viewport: WebGLUniformLocation;
    circleCenter: WebGLUniformLocation;
    circleRadius: WebGLUniformLocation;
    rectCenter: WebGLUniformLocation;
    rectHalfExtents: WebGLUniformLocation;
    rectRotation: WebGLUniformLocation;
    rectColor: WebGLUniformLocation;
    invertedColor: WebGLUniformLocation;
    circleColor: WebGLUniformLocation;
    rectFeatherPx: WebGLUniformLocation;
    circleStrokeWidthPx: WebGLUniformLocation;
    circleFeatherPx: WebGLUniformLocation;
    secondaryRectCenter: WebGLUniformLocation;
    secondaryRectHalfExtents: WebGLUniformLocation;
    secondaryRectRotation: WebGLUniformLocation;
    secondaryRectColor: WebGLUniformLocation;
    secondaryInvertedColor: WebGLUniformLocation;
    secondaryRectFeatherPx: WebGLUniformLocation;
    textureAspect: WebGLUniformLocation;
    showReferenceRectangle: WebGLUniformLocation;
    showInvertedRectangle: WebGLUniformLocation;
    showSecondaryRectangle: WebGLUniformLocation;
    showSecondaryInvertedRectangle: WebGLUniformLocation;
    showReferenceLine: WebGLUniformLocation;
    showInvertedLine: WebGLUniformLocation;
    lineA: WebGLUniformLocation;
    lineB: WebGLUniformLocation;
    lineColor: WebGLUniformLocation;
    lineStrokeWidthPx: WebGLUniformLocation;
    lineFeatherPx: WebGLUniformLocation;
    invertedLineColor: WebGLUniformLocation;
    invertedLineStrokeWidthPx: WebGLUniformLocation;
    invertedLineFeatherPx: WebGLUniformLocation;
    invertedLineCircleCenter: WebGLUniformLocation;
    invertedLineCircleRadius: WebGLUniformLocation;
    invertedLineNormal: WebGLUniformLocation;
    invertedLineOffset: WebGLUniformLocation;
    invertedLineIsCircle: WebGLUniformLocation;
    textureEnabled: WebGLUniformLocation;
    textureSampler: WebGLUniformLocation;
    textureOffset: WebGLUniformLocation;
    textureScale: WebGLUniformLocation;
    textureRotation: WebGLUniformLocation;
    textureOpacity: WebGLUniformLocation;
    controlPointCount: WebGLUniformLocation;
    controlPointPositions: WebGLUniformLocation;
    controlPointRadiiPx: WebGLUniformLocation;
    controlPointFillColors: WebGLUniformLocation;
    controlPointStrokeColors: WebGLUniformLocation;
    controlPointStrokeWidthsPx: WebGLUniformLocation;
    controlPointShapes: WebGLUniformLocation;
};

type RgbaColor = readonly [number, number, number, number];
type HalfPlaneHandlePoint = HalfPlaneControlPoints[number];

function buildCircleInversionControlPoints(
    halfPlaneControlPoints: HalfPlaneControlPoints[] | null | undefined,
    inversion: CircleInversionState,
): RenderControlPoint[] {
    const markers: RenderControlPoint[] = [];
    const circle = {
        c: { x: inversion.fixedCircle.center.x, y: inversion.fixedCircle.center.y },
        r: inversion.fixedCircle.radius,
    };

    const startPoint = findControlPointById(halfPlaneControlPoints, CIRCLE_LINE_START_ID);
    if (startPoint) {
        markers.push(createCircleMarker(startPoint, LINE_START_POINT_COLOR, 1));
        markers.push(
            createCircleMarker(
                invertInCircle(startPoint, circle),
                LINE_START_POINT_COLOR,
                INVERTED_POINT_ALPHA,
            ),
        );
    }

    const endPoint = findControlPointById(halfPlaneControlPoints, CIRCLE_LINE_END_ID);
    if (endPoint) {
        markers.push(createCircleMarker(endPoint, LINE_END_POINT_COLOR, 1));
        markers.push(
            createCircleMarker(
                invertInCircle(endPoint, circle),
                LINE_END_POINT_COLOR,
                INVERTED_POINT_ALPHA,
            ),
        );
    }

    markers.push(createCircleMarker(circle.c, CENTER_POINT_COLOR, 1));

    return markers;
}

function findControlPointById(
    halfPlaneControlPoints: HalfPlaneControlPoints[] | null | undefined,
    id: string,
): HalfPlaneHandlePoint | null {
    if (!halfPlaneControlPoints) {
        return null;
    }
    for (const pair of halfPlaneControlPoints) {
        if (!pair) {
            continue;
        }
        for (const point of pair) {
            if (point && point.id === id) {
                return point;
            }
        }
    }
    return null;
}

function createCircleMarker(
    position: Vec2,
    color: RgbaColor,
    alphaScale: number,
): RenderControlPoint {
    return {
        position: { x: position.x, y: position.y },
        radiusPx: CONTROL_POINT_RADIUS_PX,
        fillColor: toColor(color, alphaScale),
        strokeColor: toColor(CONTROL_POINT_STROKE_COLOR, 1),
        strokeWidthPx: CONTROL_POINT_STROKE_WIDTH_PX,
        shape: SHAPE_CIRCLE,
    };
}

function toColor(color: RgbaColor, alphaScale: number): RenderControlPoint["fillColor"] {
    const clampedAlpha = Math.min(Math.max(color[3] * alphaScale, 0), 1);
    return { r: color[0], g: color[1], b: color[2], a: clampedAlpha };
}

function resolveInversionState(
    config: CircleInversionState | undefined,
    scene: WebGLPipelineRenderContext["renderScene"],
): CircleInversionState | null {
    if (scene.geometry !== GEOMETRY_KIND.euclidean) {
        return null;
    }
    const runtimeState = scene.inversion;
    if (runtimeState) {
        return {
            fixedCircle: {
                center: { ...runtimeState.fixedCircle.center },
                radius: runtimeState.fixedCircle.radius,
            },
            line: {
                start: { ...runtimeState.line.start },
                end: { ...runtimeState.line.end },
            },
            rectangle: {
                center: { ...runtimeState.rectangle.center },
                halfExtents: { ...runtimeState.rectangle.halfExtents },
                rotation: runtimeState.rectangle.rotation,
            },
            secondaryRectangle: {
                center: { ...runtimeState.secondaryRectangle.center },
                halfExtents: { ...runtimeState.secondaryRectangle.halfExtents },
                rotation: runtimeState.secondaryRectangle.rotation,
            },
            display: { ...runtimeState.display },
            textureAspect: runtimeState.textureAspect ?? null,
        };
    }
    if (config) {
        return {
            fixedCircle: {
                center: { ...config.fixedCircle.center },
                radius: config.fixedCircle.radius,
            },
            line: {
                start: { ...config.line.start },
                end: { ...config.line.end },
            },
            rectangle: {
                center: { ...config.rectangle.center },
                halfExtents: { ...config.rectangle.halfExtents },
                rotation: config.rectangle.rotation,
            },
            secondaryRectangle: {
                center: { ...config.secondaryRectangle.center },
                halfExtents: { ...config.secondaryRectangle.halfExtents },
                rotation: config.secondaryRectangle.rotation,
            },
            display: { ...config.display },
            textureAspect: config.textureAspect ?? null,
        };
    }
    return null;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Failed to create shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader) ?? "Unknown error";
        gl.deleteShader(shader);
        throw new Error(`Shader compilation failed: ${info}`);
    }
    return shader;
}

function linkProgram(
    gl: WebGL2RenderingContext,
    vertex: WebGLShader,
    fragment: WebGLShader,
): WebGLProgram {
    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create program");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program) ?? "Unknown error";
        gl.deleteProgram(program);
        throw new Error(`Program link failed: ${info}`);
    }
    return program;
}

function resolveUniformLocations(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
): UniformLocations {
    return {
        resolution: getUniformLocation(gl, program, "uResolution"),
        viewport: getUniformLocation(gl, program, "uViewport"),
        circleCenter: getUniformLocation(gl, program, "uCircleCenter"),
        circleRadius: getUniformLocation(gl, program, "uCircleRadius"),
        rectCenter: getUniformLocation(gl, program, "uRectCenter"),
        rectHalfExtents: getUniformLocation(gl, program, "uRectHalfExtents"),
        rectRotation: getUniformLocation(gl, program, "uRectRotation"),
        rectColor: getUniformLocation(gl, program, "uRectColor"),
        invertedColor: getUniformLocation(gl, program, "uInvertedColor"),
        circleColor: getUniformLocation(gl, program, "uCircleColor"),
        rectFeatherPx: getUniformLocation(gl, program, "uRectFeatherPx"),
        circleStrokeWidthPx: getUniformLocation(gl, program, "uCircleStrokeWidthPx"),
        circleFeatherPx: getUniformLocation(gl, program, "uCircleFeatherPx"),
        secondaryRectCenter: getUniformLocation(gl, program, "uRect2Center"),
        secondaryRectHalfExtents: getUniformLocation(gl, program, "uRect2HalfExtents"),
        secondaryRectRotation: getUniformLocation(gl, program, "uRect2Rotation"),
        secondaryRectColor: getUniformLocation(gl, program, "uRect2Color"),
        secondaryInvertedColor: getUniformLocation(gl, program, "uRect2InvertedColor"),
        secondaryRectFeatherPx: getUniformLocation(gl, program, "uRect2FeatherPx"),
        textureAspect: getUniformLocation(gl, program, "uTextureAspect"),
        showReferenceRectangle: getUniformLocation(gl, program, "uShowReferenceRectangle"),
        showInvertedRectangle: getUniformLocation(gl, program, "uShowInvertedRectangle"),
        showSecondaryRectangle: getUniformLocation(gl, program, "uShowSecondaryRectangle"),
        showSecondaryInvertedRectangle: getUniformLocation(
            gl,
            program,
            "uShowSecondaryInvertedRectangle",
        ),
        showReferenceLine: getUniformLocation(gl, program, "uShowReferenceLine"),
        showInvertedLine: getUniformLocation(gl, program, "uShowInvertedLine"),
        lineA: getUniformLocation(gl, program, "uLineA"),
        lineB: getUniformLocation(gl, program, "uLineB"),
        lineColor: getUniformLocation(gl, program, "uLineColor"),
        lineStrokeWidthPx: getUniformLocation(gl, program, "uLineStrokeWidthPx"),
        lineFeatherPx: getUniformLocation(gl, program, "uLineFeatherPx"),
        invertedLineColor: getUniformLocation(gl, program, "uInvertedLineColor"),
        invertedLineStrokeWidthPx: getUniformLocation(gl, program, "uInvertedLineStrokeWidthPx"),
        invertedLineFeatherPx: getUniformLocation(gl, program, "uInvertedLineFeatherPx"),
        invertedLineCircleCenter: getUniformLocation(gl, program, "uInvertedLineCircleCenter"),
        invertedLineCircleRadius: getUniformLocation(gl, program, "uInvertedLineCircleRadius"),
        invertedLineNormal: getUniformLocation(gl, program, "uInvertedLineNormal"),
        invertedLineOffset: getUniformLocation(gl, program, "uInvertedLineOffset"),
        invertedLineIsCircle: getUniformLocation(gl, program, "uInvertedLineIsCircle"),
        textureEnabled: getUniformLocation(gl, program, "uTextureEnabled"),
        textureSampler: getUniformLocation(gl, program, "uRectTexture"),
        textureOffset: getUniformLocation(gl, program, "uTextureOffset"),
        textureScale: getUniformLocation(gl, program, "uTextureScale"),
        textureRotation: getUniformLocation(gl, program, "uTextureRotation"),
        textureOpacity: getUniformLocation(gl, program, "uTextureOpacity"),
        controlPointCount: getUniformLocation(gl, program, "uControlPointCount"),
        controlPointPositions: getUniformLocation(gl, program, "uControlPointPositions[0]"),
        controlPointRadiiPx: getUniformLocation(gl, program, "uControlPointRadiiPx[0]"),
        controlPointFillColors: getUniformLocation(gl, program, "uControlPointFillColors[0]"),
        controlPointStrokeColors: getUniformLocation(gl, program, "uControlPointStrokeColors[0]"),
        controlPointStrokeWidthsPx: getUniformLocation(
            gl,
            program,
            "uControlPointStrokeWidthsPx[0]",
        ),
        controlPointShapes: getUniformLocation(gl, program, "uControlPointShapes[0]"),
    };
}

registerSceneWebGLPipeline(
    SCENE_IDS.euclideanCircleInversion,
    EUCLIDEAN_CIRCLE_INVERSION_PIPELINE_ID,
    (gl) => new EuclideanCircleInversionPipeline(gl),
);
