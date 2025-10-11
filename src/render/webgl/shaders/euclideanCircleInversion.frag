#version 300 es
precision highp float;

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

vec2 screenToWorld(vec2 fragCoord) {
    float scale = max(uViewport.x, 1e-6);
    vec2 translation = uViewport.yz;
    return (fragCoord - translation) / scale;
}

mat2 rotationMatrix(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
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

void main() {
    vec2 worldPoint = screenToWorld(vFragCoord);
    float scale = max(uViewport.x, 1e-6);

    float rectSdfPx = rectangleSDF(worldPoint) * scale;
    float rectFill = smoothFill(rectSdfPx, uRectFeatherPx);

    vec2 invertedPoint = invertPoint(worldPoint);
    float invertedSdfPx = rectangleSDF(invertedPoint) * scale;
    float invertedFill = smoothFill(invertedSdfPx, uRectFeatherPx);

    float circlePxDistance = abs(length(worldPoint - uCircleCenter) - uCircleRadius) * scale;
    float circleStroke = 1.0 - smoothstep(
        max(uCircleStrokeWidthPx - uCircleFeatherPx, 0.0),
        uCircleStrokeWidthPx + uCircleFeatherPx,
        circlePxDistance
    );

    vec4 color = vec4(0.0);
    if (rectFill > 0.0) {
        float alpha = rectFill * uRectColor.a;
        color.rgb = mix(color.rgb, uRectColor.rgb, alpha);
        color.a = max(color.a, alpha);
    }

    if (invertedFill > 0.0) {
        float alpha = invertedFill * uInvertedColor.a;
        color.rgb = mix(color.rgb, uInvertedColor.rgb, alpha);
        color.a = max(color.a, alpha);
    }

    if (circleStroke > 0.0) {
        float alpha = circleStroke * uCircleColor.a;
        color.rgb = mix(color.rgb, uCircleColor.rgb, alpha);
        color.a = max(color.a, alpha);
    }

    if (color.a <= 1e-4) {
        discard;
    }
    outColor = vec4(color.rgb, color.a);
}
