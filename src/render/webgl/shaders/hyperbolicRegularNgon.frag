#version 300 es
precision highp float;

const float GAMMA = 2.2;

in vec2 vFragCoord;
layout(location = 0) out vec4 outColor;

uniform int uGeodesicCount;
uniform float uLineWidth;
uniform float uFeather;
uniform vec3 uLineColor;
uniform vec3 uFillColor;
uniform vec3 uUnitCircleColor;
uniform int uClipToDisk;
uniform vec3 uViewport; // (scale, tx, ty)

const int MAX_GEODESICS = __MAX_GEODESICS__;
uniform vec4 uGeodesicsA[MAX_GEODESICS];
uniform int uGeodesicKinds[MAX_GEODESICS];

const int MAX_TEXTURE_SLOTS = __MAX_TEXTURE_SLOTS__;
uniform int uTextureCount;
uniform int uTextureEnabled[MAX_TEXTURE_SLOTS];
uniform vec2 uTextureOffset[MAX_TEXTURE_SLOTS];
uniform vec2 uTextureScale[MAX_TEXTURE_SLOTS];
uniform float uTextureRotation[MAX_TEXTURE_SLOTS];
uniform float uTextureOpacity[MAX_TEXTURE_SLOTS];
uniform sampler2D uTextures[MAX_TEXTURE_SLOTS];

vec2 screenToWorld(vec2 fragCoord) {
    float scale = max(uViewport.x, 1e-6);
    vec2 translation = uViewport.yz;
    return (fragCoord - translation) / scale;
}

float signedDistanceCircle(vec2 worldPoint, vec4 packed) {
    vec2 center = packed.xy;
    float radius = packed.z;
    float orientation = packed.w;
    float distance = length(worldPoint - center) - radius;
    return orientation * distance;
}

float signedDistanceLine(vec2 worldPoint, vec4 packed) {
    vec2 normal = normalize(packed.xy);
    vec2 anchor = packed.zw;
    return dot(worldPoint - anchor, normal);
}

mat2 rotationMatrix(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

vec2 transformedUV(int slot, vec2 worldPoint) {
    vec2 scaled = worldPoint * uTextureScale[slot];
    vec2 rotated = rotationMatrix(uTextureRotation[slot]) * scaled;
    return rotated + uTextureOffset[slot];
}

vec4 sampleTextureSlot(int slot, vec2 uv) {
__SAMPLE_TEXTURE_CASES__
    return vec4(0.0);
}

vec4 sampleTextures(vec2 worldPoint, float mask) {
    vec4 accum = vec4(0.0);
    for (int i = 0; i < MAX_TEXTURE_SLOTS; ++i) {
        if (i >= uTextureCount) {
            break;
        }
        if (uTextureEnabled[i] == 0) {
            continue;
        }
        vec2 uv = transformedUV(i, worldPoint);
        vec4 texColor = sampleTextureSlot(i, uv);
        float opacity = clamp(uTextureOpacity[i], 0.0, 1.0);
        texColor.a *= opacity * mask;
        accum.rgb = mix(accum.rgb, texColor.rgb, texColor.a);
        accum.a = max(accum.a, texColor.a);
    }
    return accum;
}

struct PolygonEval {
    float minAbsDistance;
    float inside;
};

PolygonEval evaluatePolygon(vec2 worldPoint) {
    float minAbsDistance = 1e9;
    float inside = 1.0;
    for (int i = 0; i < MAX_GEODESICS; ++i) {
        if (i >= uGeodesicCount) {
            break;
        }
        vec4 packed = uGeodesicsA[i];
        float signedDistance;
        if (uGeodesicKinds[i] == 0) {
            signedDistance = signedDistanceCircle(worldPoint, packed);
        } else {
            signedDistance = signedDistanceLine(worldPoint, packed);
        }
        minAbsDistance = min(minAbsDistance, abs(signedDistance));
        if (signedDistance < 0.0) {
            inside = 0.0;
        }
    }
    return PolygonEval(minAbsDistance, inside);
}

void main() {
    vec2 worldPoint = screenToWorld(vFragCoord);
    float diskMask = 1.0;
    if (uClipToDisk == 1) {
        float diskDistance = (length(worldPoint) - 1.0) * uViewport.x;
        diskMask = 1.0 - smoothstep(0.0, uFeather, diskDistance);
    }

    PolygonEval evalResult = evaluatePolygon(worldPoint);
    float polygonMask = evalResult.inside * diskMask;
    vec4 textureColor = sampleTextures(worldPoint, polygonMask);

    float minDistancePx = evalResult.minAbsDistance * uViewport.x;
    float lineMask = 1.0 - smoothstep(uLineWidth, uLineWidth + uFeather, minDistancePx);
    lineMask *= diskMask;

    vec2 unitCircleVec = worldPoint;
    float unitCirclePx = abs(length(unitCircleVec) - 1.0) * uViewport.x;
    float unitCircleAlpha = 1.0 - smoothstep(uLineWidth, uLineWidth + uFeather, unitCirclePx);

    float fillAlpha = max(textureColor.a, polygonMask * 0.95);
    vec3 fillColor = mix(uFillColor, textureColor.rgb, textureColor.a);

    float colorAlpha = max(fillAlpha, lineMask);
    colorAlpha = max(colorAlpha, unitCircleAlpha);

    if (colorAlpha <= 0.0 && diskMask <= 0.0) {
        discard;
    }

    vec3 shaded = fillColor;
    shaded = mix(shaded, uLineColor, lineMask);
    shaded = mix(shaded, uUnitCircleColor, unitCircleAlpha);
    shaded = pow(shaded, vec3(1.0 / GAMMA));

    outColor = vec4(shaded, colorAlpha);
}
