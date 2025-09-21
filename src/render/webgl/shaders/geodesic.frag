#version 300 es
precision highp float;

in vec2 vFragCoord;
layout(location = 0) out vec4 outColor;

uniform vec2 uResolution;
uniform vec4 uDisk;
uniform int uGeodesicCount;
uniform float uLineWidth;
uniform float uFeather;
uniform vec3 uLineColor;

const int MAX_GEODESICS = __MAX_GEODESICS__;
uniform vec4 uGeodesicsA[MAX_GEODESICS];
uniform vec4 uGeodesicsB[MAX_GEODESICS];

float sdfCircle(vec2 point, vec4 params) {
    return abs(length(point - params.xy) - params.z);
}

float sdfLine(vec2 point, vec4 a, vec4 b) {
    vec2 base = a.xy;
    vec2 dir = normalize(vec2(a.z, b.x));
    vec2 diff = point - base;
    return abs(diff.x * dir.y - diff.y * dir.x);
}

void main() {
    vec2 fragCoord = vFragCoord;
    float diskDist = length(fragCoord - uDisk.xy) - uDisk.z;
    float diskMask = 1.0 - smoothstep(0.0, uFeather, diskDist);
    if (diskMask <= 0.0) {
        discard;
    }

    float minSdf = 1e9;
    for (int i = 0; i < MAX_GEODESICS; ++i) {
        if (i >= uGeodesicCount) {
            break;
        }
        vec4 a = uGeodesicsA[i];
        vec4 b = uGeodesicsB[i];
        if (a.w < 0.5) {
            minSdf = min(minSdf, sdfCircle(fragCoord, a));
        } else {
            minSdf = min(minSdf, sdfLine(fragCoord, a, b));
        }
    }

    float alpha = 1.0 - smoothstep(uLineWidth - uFeather, uLineWidth + uFeather, minSdf);
    alpha *= diskMask;
    if (alpha <= 0.0) {
        discard;
    }

    outColor = vec4(uLineColor, alpha);
}
