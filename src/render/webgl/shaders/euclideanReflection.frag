#version 300 es
precision highp float;

in vec2 vFragCoord;
layout(location = 0) out vec4 outColor;

uniform int uGeodesicCount;
uniform float uLineWidth;
uniform float uFeather;
uniform vec3 uLineColor;
uniform vec3 uFillColor;
uniform vec3 uViewport; // (scale, tx, ty)

uniform int uTextureRectEnabled;
uniform vec2 uTextureRectCenter;
uniform vec2 uTextureRectHalfExtents;
uniform float uTextureRectRotation;

const int MAX_TEXTURE_SLOTS = __MAX_TEXTURE_SLOTS__;
uniform int uTextureCount;
uniform int uTextureEnabled[MAX_TEXTURE_SLOTS];
uniform vec2 uTextureOffset[MAX_TEXTURE_SLOTS];
uniform vec2 uTextureScale[MAX_TEXTURE_SLOTS];
uniform float uTextureRotation[MAX_TEXTURE_SLOTS];
uniform float uTextureOpacity[MAX_TEXTURE_SLOTS];
uniform sampler2D uTextures[MAX_TEXTURE_SLOTS];

const int MAX_GEODESICS = __MAX_GEODESICS__;
uniform vec4 uGeodesicsA[MAX_GEODESICS]; // Packed via packLine(...) as (unitNormal.x, unitNormal.y, anchor.x, anchor.y)

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

vec3 palette(float t) {
    const float TAU = 6.2831853;
    vec3 phase = vec3(0.0, 2.0943951, 4.1887902);
    return 0.55 + 0.45 * cos(TAU * t + phase);
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

vec2 textureRectLocal(vec2 point) {
    vec2 local = point - uTextureRectCenter;
    float angle = -uTextureRectRotation;
    float c = cos(angle);
    float s = sin(angle);
    return vec2(c * local.x - s * local.y, s * local.x + c * local.y);
}

bool isInsideTextureRect(vec2 point) {
    if (uTextureRectEnabled == 0) {
        return false;
    }
    vec2 rotated = textureRectLocal(point);
    vec2 bounds = max(uTextureRectHalfExtents, vec2(1e-6));
    return abs(rotated.x) <= bounds.x && abs(rotated.y) <= bounds.y;
}

vec4 sampleTextureSlot(int slot, vec2 uv) {
__SAMPLE_TEXTURE_CASES__
    return vec4(0.0);
}

vec4 sampleTextures(vec2 worldPoint) {
    if (!isInsideTextureRect(worldPoint)) {
        return vec4(0.0);
    }
    vec2 local = textureRectLocal(worldPoint);
    vec2 bounds = max(uTextureRectHalfExtents, vec2(1e-6));
    vec2 normalized = vec2(local.x / bounds.x, local.y / bounds.y);
    vec4 accum = vec4(0.0);
    for (int i = 0; i < MAX_TEXTURE_SLOTS; ++i) {
        if (i >= uTextureCount) {
            break;
        }
        if (uTextureEnabled[i] == 0) {
            continue;
        }
        vec2 uv = transformWorldPoint(i, normalized);
        vec4 texColor = sampleTextureSlot(i, uv);
        float opacity = clamp(uTextureOpacity[i], 0.0, 1.0);
        texColor.a *= opacity;
        accum.rgb = mix(accum.rgb, texColor.rgb, texColor.a);
        accum.a = max(accum.a, texColor.a);
    }
    return accum;
}

void main() {
    vec2 worldPoint = screenToWorld(vFragCoord);

    // Distance metrics for line rendering.
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
    const int MAX_REFLECTION_STEPS = 10;

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
        edgeAlpha = 1.0 - smoothstep(uLineWidth - uFeather, uLineWidth + uFeather, pxDist);
        edgeAlpha = clamp(edgeAlpha, 0.0, 1.0);
    }

    vec3 bodyColor;
    if (reflections > 0) {
        float refNorm = float(reflections);
        float hue = fract(refNorm * 0.16180339);
        vec3 wavePalette = palette(hue);
        vec3 baseTone = normalize(uFillColor + vec3(1e-6));
        bodyColor = mix(baseTone, wavePalette, 0.65);
    } else {
        bodyColor = vec3(0);
    }
    vec4 textureColor = sampleTextures(tracePoint);
    vec3 fillBlend = mix(bodyColor, textureColor.rgb, textureColor.a);

    vec3 finalColor = mix(fillBlend, uLineColor, edgeAlpha);
    float finalAlpha = max(max(textureColor.a, edgeAlpha), 0.9);
    if (finalAlpha <= 1e-4) {
        discard;
    }

    outColor = vec4(finalColor, finalAlpha);
}
