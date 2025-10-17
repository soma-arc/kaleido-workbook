#version 300 es
precision highp float;

in vec2 vFragCoord;
layout(location = 0) out vec4 outColor;

uniform vec2 uResolution;
uniform vec3 uViewport; // (scale, tx, ty)

uniform float uMirrorLineWidthPx;
uniform float uMirrorFeatherPx;
uniform vec3 uMirrorLineColor;
uniform vec3 uMirrorFillColor;
uniform vec3 uBackgroundColor;

uniform vec2 uRectangleCenter;
uniform vec2 uRectangleHalfExtents;
uniform vec4 uRectangleFallbackColor;
uniform float uRectangleFeatherPx;

const int MAX_TEXTURE_SLOTS = __MAX_TEXTURE_SLOTS__;
uniform int uTextureCount;
uniform int uTextureEnabled[MAX_TEXTURE_SLOTS];
uniform vec2 uTextureOffset[MAX_TEXTURE_SLOTS];
uniform vec2 uTextureScale[MAX_TEXTURE_SLOTS];
uniform float uTextureRotation[MAX_TEXTURE_SLOTS];
uniform float uTextureOpacity[MAX_TEXTURE_SLOTS];
uniform sampler2D uTextures[MAX_TEXTURE_SLOTS];

const int MAX_GEODESICS = __MAX_GEODESICS__;
uniform int uGeodesicCount;
uniform vec4 uGeodesicsA[MAX_GEODESICS];

float signedDistance(vec2 point, vec4 plane) {
    vec2 normal = plane.xy;
    vec2 anchor = plane.zw;
    return dot(normal, point - anchor);
}

vec2 reflectPoint(vec2 point, vec4 plane) {
    vec2 normal = plane.xy;
    vec2 anchor = plane.zw;
    float dist = dot(normal, point - anchor);
    return point - 2.0 * dist * normal;
}

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

vec2 transformWorldPoint(int slot, vec2 worldPoint) {
    vec2 scaled = worldPoint * uTextureScale[slot];
    vec2 rotated = rotationMatrix(uTextureRotation[slot]) * scaled;
    return rotated + uTextureOffset[slot];
}

vec4 sampleTextureSlot(int slot, vec2 uv) {
__SAMPLE_TEXTURE_CASES__
    return vec4(0.0);
}

vec4 sampleTextures(vec2 worldPoint) {
    vec4 accum = vec4(0.0);
    for (int i = 0; i < MAX_TEXTURE_SLOTS; ++i) {
        if (i >= uTextureCount) {
            break;
        }
        if (uTextureEnabled[i] == 0) {
            continue;
        }
        vec2 uv = transformWorldPoint(i, worldPoint);
        vec4 texColor = sampleTextureSlot(i, uv);
        float opacity = clamp(uTextureOpacity[i], 0.0, 1.0);
        texColor.a *= opacity;
        accum.rgb = mix(accum.rgb, texColor.rgb, texColor.a);
        accum.a = max(accum.a, texColor.a);
    }
    return accum;
}

vec3 palette(float t) {
    const float TAU = 6.2831853;
    vec3 phase = vec3(0.0, 2.0943951, 4.1887902);
    return 0.58 + 0.42 * cos(TAU * t + phase);
}

void main() {
    vec2 worldPoint = screenToWorld(vFragCoord);

    float minAbsDistance = 1e9;
    for (int i = 0; i < MAX_GEODESICS; ++i) {
        if (i >= uGeodesicCount) {
            break;
        }
        vec4 plane = uGeodesicsA[i];
        float d = abs(signedDistance(worldPoint, plane));
        minAbsDistance = min(minAbsDistance, d);
    }

    vec2 tracePoint = worldPoint;
    int reflections = 0;
    const int MAX_REFLECTION_STEPS = 20;

    for (int step = 0; step < MAX_REFLECTION_STEPS; ++step) {
        bool reflected = false;
        for (int i = 0; i < MAX_GEODESICS; ++i) {
            if (i >= uGeodesicCount) {
                break;
            }
            vec4 plane = uGeodesicsA[i];
            float dist = signedDistance(tracePoint, plane);
            if (dist < 0.0) {
                tracePoint = reflectPoint(tracePoint, plane);
                reflections += 1;
                reflected = true;
                break;
            }
        }
        if (!reflected) {
            break;
        }
    }

    float edgeAlpha = 0.0;
    if (uGeodesicCount > 0) {
        float pxDist = minAbsDistance * uViewport.x;
        float inner = uMirrorLineWidthPx - uMirrorFeatherPx;
        float outer = uMirrorLineWidthPx + uMirrorFeatherPx;
        edgeAlpha = 1.0 - smoothstep(inner, outer, pxDist);
        edgeAlpha = clamp(edgeAlpha, 0.0, 1.0);
    }

    vec4 textureColor = sampleTextures(tracePoint);
    vec3 bodyColor = uBackgroundColor;
    if (reflections > 0) {
        float hue = fract(float(reflections) * 0.16180339);
        vec3 reflectionPalette = palette(hue);
        vec3 baseFill = mix(uMirrorFillColor, reflectionPalette, 0.35);
        vec3 texturedFill = mix(baseFill, textureColor.rgb, textureColor.a);
        bodyColor = mix(uBackgroundColor, texturedFill, 0.75);
    }

    vec2 localRect = worldPoint - uRectangleCenter;
    vec2 absRect = abs(localRect);
    vec2 rectMargin = uRectangleHalfExtents - absRect;
    float rectInnerPx = min(rectMargin.x, rectMargin.y) * uViewport.x;
    float rectAlpha = smoothstep(0.0, max(uRectangleFeatherPx, 1e-4), rectInnerPx);

    vec3 rectColor = uRectangleFallbackColor.rgb;
    float rectOpacity = uRectangleFallbackColor.a;
    if (textureColor.a > 0.0) {
        rectColor = mix(rectColor, textureColor.rgb, textureColor.a);
        rectOpacity = mix(rectOpacity, 1.0, textureColor.a);
    }

    vec3 combinedColor = mix(bodyColor, rectColor, rectAlpha);
    float combinedAlpha = mix(1.0, rectOpacity, rectAlpha);

    combinedColor = mix(combinedColor, uMirrorLineColor, edgeAlpha);
    combinedAlpha = max(combinedAlpha, edgeAlpha);

    if (combinedAlpha <= 1e-4) {
        discard;
    }

    outColor = vec4(combinedColor, combinedAlpha);
}
