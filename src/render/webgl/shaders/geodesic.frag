#version 300 es
precision highp float;

in vec2 vFragCoord;
layout(location = 0) out vec4 outColor;

uniform int uGeodesicCount;
uniform float uLineWidth;
uniform float uFeather;
uniform vec3 uLineColor;
uniform int uClipToDisk;
uniform vec3 uViewport; // (scale, tx, ty)

const int MAX_GEODESICS = __MAX_GEODESICS__;
uniform vec4 uGeodesicsA[MAX_GEODESICS];

vec2 screenToWorld(vec2 fragCoord) {
    float scale = max(uViewport.x, 1e-6);
    vec2 translation = uViewport.yz;
    return (fragCoord - translation) / scale;
}

float sdfCircleWorld(vec2 worldPoint, vec4 params) {
    vec2 center = params.xy;
    float radius = params.z;
    vec2 diff = worldPoint - center;
    float lenSq = dot(diff, diff);
    float numerator = abs(dot(worldPoint, worldPoint) + 1.0 - 2.0 * dot(worldPoint, center));
    float denom = sqrt(max(lenSq, 1e-12)) + radius;
    return numerator / max(denom, 1e-6);
}

float sdfLineWorld(vec2 worldPoint, vec2 normal, float offset) {
    return abs(dot(worldPoint, normal) + offset);
}

void main() {
    vec2 worldPoint = screenToWorld(vFragCoord);
    float diskMask = 1.0;
    if (uClipToDisk == 1) {
        float diskDistPx = (length(worldPoint) - 1.0) * uViewport.x;
        diskMask = 1.0 - smoothstep(0.0, uFeather, diskDistPx);
        if (diskMask <= 0.0) {
            discard;
        }
    }

    float minSdfWorld = 1e9;
    for (int i = 0; i < MAX_GEODESICS; ++i) {
        if (i >= uGeodesicCount) {
            break;
        }
        vec4 packed = uGeodesicsA[i];
        if (packed.w < 0.5) {
            minSdfWorld = min(minSdfWorld, sdfCircleWorld(worldPoint, packed));
        } else {
            vec2 normal = normalize(packed.xy);
            minSdfWorld = min(minSdfWorld, sdfLineWorld(worldPoint, normal, packed.z));
        }
    }

    float minSdfPx = minSdfWorld * uViewport.x;
    float alpha = 1.0 - smoothstep(uLineWidth - uFeather, uLineWidth + uFeather, minSdfPx);
    alpha *= diskMask;
    if (alpha <= 0.0) {
        discard;
    }

    outColor = vec4(uLineColor, alpha);
}
