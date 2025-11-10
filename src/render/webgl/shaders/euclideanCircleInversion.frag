#version 300 es
precision highp float;

const float GAMMA = 2.2;

in vec2 vFragCoord;
layout(location = 0) out vec4 outColor;

uniform vec3 uViewport; // (scale, tx, ty)
uniform vec2 uCircleCenter;
uniform float uCircleRadius;

uniform vec2 uRectCenter;
uniform vec2 uRectHalfExtents;
uniform float uRectRotation;
uniform vec4 uRectColor;
uniform vec4 uInvertedColor;
uniform vec4 uCircleColor;
uniform float uRectFeatherPx;
uniform float uCircleStrokeWidthPx;
uniform float uCircleFeatherPx;
uniform float uTextureAspect;
uniform vec2 uRect2Center;
uniform vec2 uRect2HalfExtents;
uniform float uRect2Rotation;
uniform vec4 uRect2Color;
uniform vec4 uRect2InvertedColor;
uniform float uRect2FeatherPx;
uniform int uShowReferenceRectangle;
uniform int uShowInvertedRectangle;
uniform int uShowSecondaryRectangle;
uniform int uShowSecondaryInvertedRectangle;

uniform vec2 uLineA;
uniform vec2 uLineB;
uniform vec4 uLineColor;
uniform float uLineStrokeWidthPx;
uniform float uLineFeatherPx;
uniform int uShowReferenceLine;

uniform vec4 uInvertedLineColor;
uniform float uInvertedLineStrokeWidthPx;
uniform float uInvertedLineFeatherPx;
uniform vec2 uInvertedLineCircleCenter;
uniform float uInvertedLineCircleRadius;
uniform vec2 uInvertedLineNormal;
uniform float uInvertedLineOffset;
uniform int uInvertedLineIsCircle;
uniform int uShowInvertedLine;

uniform int uTextureEnabled;
uniform sampler2D uRectTexture;
uniform vec2 uTextureOffset;
uniform vec2 uTextureScale;
uniform float uTextureRotation;
uniform float uTextureOpacity;

#define MAX_CONTROL_POINTS 16
#define SHAPE_CIRCLE 0
#define SHAPE_SQUARE 1

uniform int uControlPointCount;
uniform vec2 uControlPointPositions[MAX_CONTROL_POINTS];
uniform float uControlPointRadiiPx[MAX_CONTROL_POINTS];
uniform vec4 uControlPointFillColors[MAX_CONTROL_POINTS];
uniform vec4 uControlPointStrokeColors[MAX_CONTROL_POINTS];
uniform float uControlPointStrokeWidthsPx[MAX_CONTROL_POINTS];
uniform int uControlPointShapes[MAX_CONTROL_POINTS];

const int MAX_AA_SAMPLES = 4;
const vec2 AA_SAMPLE_OFFSETS[MAX_AA_SAMPLES] = vec2[](
    vec2(0.0, 0.0),
    vec2(0.25, -0.25),
    vec2(-0.25, 0.25),
    vec2(0.5, 0.5)
);

mat2 rotationMatrix(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

vec2 screenToWorld(vec2 fragCoord) {
    float scale = max(uViewport.x, 1e-6);
    vec2 translation = uViewport.yz;
    return (fragCoord - translation) / scale;
}

float rectangleSDF(vec2 point) {
    vec2 local = rotationMatrix(-uRectRotation) * (point - uRectCenter);
    vec2 d = abs(local) - uRectHalfExtents;
    vec2 outside = max(d, 0.0);
    float outsideDist = length(outside);
    float insideDist = min(max(d.x, d.y), 0.0);
    return outsideDist + insideDist;
}

vec2 invertPoint(vec2 point) {
    vec2 diff = point - uCircleCenter;
    float distSq = dot(diff, diff);
    float radiusSq = uCircleRadius * uCircleRadius;
    if (distSq <= 1e-8) {
        return uCircleCenter + vec2(radiusSq, 0.0);
    }
    return uCircleCenter + (radiusSq / distSq) * diff;
}

float smoothFill(float sdfPx, float featherPx) {
    return 1.0 - smoothstep(0.0, featherPx, sdfPx);
}

float lineDistancePx(vec2 point, vec2 a, vec2 b, float scale) {
    vec2 ab = b - a;
    float denom = length(ab);
    if (denom <= 1e-6) {
        return 1e6;
    }
    float crossVal = abs((point.x - a.x) * ab.y - (point.y - a.y) * ab.x);
    return (crossVal / denom) * scale;
}

float lineStrokeMask(float distPx, float strokeWidthPx, float featherPx) {
    float inner = max(strokeWidthPx - featherPx, 0.0);
    float outer = strokeWidthPx + featherPx;
    return 1.0 - smoothstep(inner, outer, distPx);
}

vec2 applyTextureTransform(vec2 uv) {
    vec2 scaled = uv * uTextureScale;
    float c = cos(uTextureRotation);
    float s = sin(uTextureRotation);
    vec2 rotated = vec2(c * scaled.x - s * scaled.y, s * scaled.x + c * scaled.y);
    return rotated + uTextureOffset;
}

vec4 sampleRectangleColor(vec2 local, vec4 fallbackColor) {
    if (uTextureEnabled == 0) {
        return fallbackColor;
    }
    vec2 safeHalfExtents = max(uRectHalfExtents, vec2(1e-6));
    float aspect = max(uTextureAspect, 1e-6);
    vec2 normalized = vec2(local.x / (safeHalfExtents.y * aspect), local.y / safeHalfExtents.y);
    vec2 uv = applyTextureTransform(normalized);
    vec4 texColor = texture(uRectTexture, uv);
    
    // Degamma texture (sRGB to linear)
    texColor.rgb = pow(texColor.rgb, vec3(GAMMA));
    
    float opacity = clamp(mix(fallbackColor.a, texColor.a, uTextureOpacity), 0.0, 1.0);
    vec3 blended = mix(fallbackColor.rgb, texColor.rgb, uTextureOpacity);
    return vec4(blended, opacity);
}

float controlPointCircleSDF(vec2 point, vec2 center, float radius) {
    return length(point - center) - radius;
}

float controlPointSquareSDF(vec2 point, vec2 center, float halfSize) {
    vec2 d = abs(point - center) - vec2(halfSize);
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

vec4 renderControlPoint(int index) {
    vec2 cpPosition = uControlPointPositions[index];
    float radiusPx = uControlPointRadiiPx[index];
    vec4 fillColor = uControlPointFillColors[index];
    vec4 strokeColor = uControlPointStrokeColors[index];
    float strokeWidthPx = uControlPointStrokeWidthsPx[index];
    int shape = uControlPointShapes[index];
    float viewportScale = max(uViewport.x, 1e-6);
    float worldRadius = radiusPx / viewportScale;
    float worldStrokeRadius = (radiusPx + strokeWidthPx) / viewportScale;

    vec4 accumulated = vec4(0.0);
    for (int s = 0; s < MAX_AA_SAMPLES; s++) {
        vec2 sampleScreen = vFragCoord + AA_SAMPLE_OFFSETS[s];
        vec2 sampleWorld = screenToWorld(sampleScreen);
        float sdf =
            (shape == SHAPE_CIRCLE)
                ? controlPointCircleSDF(sampleWorld, cpPosition, worldRadius)
                : controlPointSquareSDF(sampleWorld, cpPosition, worldRadius);
        if (sdf <= 0.0) {
            accumulated += fillColor;
        } else if (strokeWidthPx > 0.0) {
            float strokeSdf =
                (shape == SHAPE_CIRCLE)
                    ? controlPointCircleSDF(sampleWorld, cpPosition, worldStrokeRadius)
                    : controlPointSquareSDF(sampleWorld, cpPosition, worldStrokeRadius);
            if (strokeSdf <= 0.0) {
                accumulated += strokeColor;
            }
        }
    }
    return accumulated / float(MAX_AA_SAMPLES);
}

void main() {
    vec2 worldPoint = screenToWorld(vFragCoord);
    float scale = max(uViewport.x, 1e-6);

    vec2 rectLocal = rotationMatrix(-uRectRotation) * (worldPoint - uRectCenter);
    float rectSdfPx = length(max(abs(rectLocal) - uRectHalfExtents, 0.0)) * scale;
    float rectFill = smoothFill(rectSdfPx, uRectFeatherPx);

    vec2 invertedPoint = invertPoint(worldPoint);
    vec2 invertedLocal = rotationMatrix(-uRectRotation) * (invertedPoint - uRectCenter);
    float invertedSdfPx = length(max(abs(invertedLocal) - uRectHalfExtents, 0.0)) * scale;
    float invertedFill = smoothFill(invertedSdfPx, uRectFeatherPx);

    vec2 rect2Local = rotationMatrix(-uRect2Rotation) * (worldPoint - uRect2Center);
    float rect2SdfPx = length(max(abs(rect2Local) - uRect2HalfExtents, 0.0)) * scale;
    float rect2Fill = smoothFill(rect2SdfPx, uRect2FeatherPx);

    vec2 invertedLocal2 = rotationMatrix(-uRect2Rotation) * (invertedPoint - uRect2Center);
    float invertedRect2SdfPx = length(max(abs(invertedLocal2) - uRect2HalfExtents, 0.0)) * scale;
    float invertedRect2Fill = smoothFill(invertedRect2SdfPx, uRect2FeatherPx);

    float circlePxDistance = abs(length(worldPoint - uCircleCenter) - uCircleRadius) * scale;
    float circleStroke = lineStrokeMask(circlePxDistance, uCircleStrokeWidthPx, uCircleFeatherPx);

    vec4 color = vec4(0.0);

    if (uShowReferenceRectangle == 1 && rectFill > 0.0) {
        vec4 fillColor = sampleRectangleColor(rectLocal, uRectColor);
        float alpha = rectFill * fillColor.a;
        color.rgb = mix(color.rgb, fillColor.rgb, alpha);
        color.a = max(color.a, alpha);
    }

    if (uShowInvertedRectangle == 1 && invertedFill > 0.0) {
        vec4 fillColor = sampleRectangleColor(invertedLocal, uInvertedColor);
        float alpha = invertedFill * fillColor.a;
        color.rgb = mix(color.rgb, fillColor.rgb, alpha);
        color.a = max(color.a, alpha);
    }

    if (uShowSecondaryRectangle == 1 && rect2Fill > 0.0) {
        float alpha = rect2Fill * uRect2Color.a;
        color.rgb = mix(color.rgb, uRect2Color.rgb, alpha);
        color.a = max(color.a, alpha);
    }

    if (uShowSecondaryInvertedRectangle == 1 && invertedRect2Fill > 0.0) {
        float alpha = invertedRect2Fill * uRect2InvertedColor.a;
        color.rgb = mix(color.rgb, uRect2InvertedColor.rgb, alpha);
        color.a = max(color.a, alpha);
    }

    if (uShowReferenceLine == 1) {
        float lineDistPx = lineDistancePx(worldPoint, uLineA, uLineB, scale);
        float stroke = lineStrokeMask(lineDistPx, uLineStrokeWidthPx, uLineFeatherPx);
        if (stroke > 0.0) {
            float alpha = stroke * uLineColor.a;
            color.rgb = mix(color.rgb, uLineColor.rgb, alpha);
            color.a = max(color.a, alpha);
        }
    }

    if (uShowInvertedLine == 1) {
        float stroke = 0.0;
        if (uInvertedLineIsCircle == 1) {
            float dist = abs(length(worldPoint - uInvertedLineCircleCenter) - uInvertedLineCircleRadius) * scale;
            stroke = lineStrokeMask(dist, uInvertedLineStrokeWidthPx, uInvertedLineFeatherPx);
        } else {
            float dist = abs(dot(uInvertedLineNormal, worldPoint) - uInvertedLineOffset) * scale;
            stroke = lineStrokeMask(dist, uInvertedLineStrokeWidthPx, uInvertedLineFeatherPx);
        }
        if (stroke > 0.0) {
            float alpha = stroke * uInvertedLineColor.a;
            color.rgb = mix(color.rgb, uInvertedLineColor.rgb, alpha);
            color.a = max(color.a, alpha);
        }
    }

    if (circleStroke > 0.0) {
        float alpha = circleStroke * uCircleColor.a;
        color.rgb = mix(color.rgb, uCircleColor.rgb, alpha);
        color.a = max(color.a, alpha);
    }

    bool overlayHit = false;
    
    // Apply gamma correction (linear to sRGB)
    vec3 gammaCorrected = pow(color.rgb, vec3(1.0 / GAMMA));

    vec4 finalColor = vec4(gammaCorrected, color.a);

    for (int i = 0; i < MAX_CONTROL_POINTS; ++i) {
        if (i >= uControlPointCount) {
            break;
        }
        vec4 cpColor = renderControlPoint(i);
        if (cpColor.a > 0.0) {
            finalColor.rgb = finalColor.rgb * (1.0 - cpColor.a) + cpColor.rgb * cpColor.a;
            finalColor.a = max(finalColor.a, cpColor.a);
            overlayHit = true;
        }
    }

    if (finalColor.a <= 1e-4 && !overlayHit) {
        discard;
    }

    outColor = finalColor;
}
