#version 300 es
precision highp float;

in vec2 vFragCoord;
layout(location = 0) out vec4 outColor;

uniform int uGeodesicCount;
uniform float uLineWidth;
uniform float uFeather;
uniform vec3 uLineColor;
uniform vec3 uFillColor;
uniform float uFillOpacity;
uniform vec3 uViewport; // (scale, tx, ty)

const int MAX_GEODESICS = __MAX_GEODESICS__;
uniform vec4 uGeodesicsA[MAX_GEODESICS];

const int MAX_TEXTURE_SLOTS = __MAX_TEXTURE_SLOTS__;
uniform int uTextureCount;
uniform int uTextureEnabled[MAX_TEXTURE_SLOTS];
uniform vec2 uTextureOffset[MAX_TEXTURE_SLOTS];
uniform vec2 uTextureScale[MAX_TEXTURE_SLOTS];
uniform float uTextureRotation[MAX_TEXTURE_SLOTS];
uniform float uTextureOpacity[MAX_TEXTURE_SLOTS];
uniform sampler2D uTextures[MAX_TEXTURE_SLOTS];

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

float reflect01(float value) {
    float period = 2.0;
    float wrapped = mod(value, period);
    if (wrapped < 0.0) {
        wrapped += period;
    }
    return wrapped <= 1.0 ? wrapped : 2.0 - wrapped;
}

vec2 mirrorTile(vec2 uv) {
    return vec2(reflect01(uv.x), reflect01(uv.y));
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
        vec2 mirrored = mirrorTile(uv);
        vec4 texColor = sampleTextureSlot(i, mirrored);
        float opacity = clamp(uTextureOpacity[i], 0.0, 1.0);
        texColor.a *= opacity;
        accum.rgb = mix(accum.rgb, texColor.rgb, texColor.a);
        accum.a = max(accum.a, texColor.a);
    }
    return accum;
}

float signedDistance(vec2 worldPoint, vec4 packed) {
    vec2 normal = packed.xy;
    vec2 anchor = packed.zw;
    return dot(normal, worldPoint - anchor);
}

void main() {
    vec2 worldPoint = screenToWorld(vFragCoord);
    float maxSigned = -1e9;
    float minAbs = 1e9;

    for (int i = 0; i < MAX_GEODESICS; ++i) {
        if (i >= uGeodesicCount) {
            break;
        }
        vec4 packed = uGeodesicsA[i];
        float distance = signedDistance(worldPoint, packed);
        maxSigned = max(maxSigned, distance);
        minAbs = min(minAbs, abs(distance));
    }

    float edgeAlpha = 0.0;
    float fillMask = 0.0;

    if (uGeodesicCount > 0) {
        float distancePx = minAbs * uViewport.x;
        edgeAlpha = 1.0 - smoothstep(uLineWidth - uFeather, uLineWidth + uFeather, distancePx);
        edgeAlpha = clamp(edgeAlpha, 0.0, 1.0);

        float fillDistancePx = maxSigned * uViewport.x;
        fillMask = 1.0 - smoothstep(0.0, uFeather, fillDistancePx);
        fillMask = clamp(fillMask, 0.0, 1.0);
    }

    vec4 textureColor = sampleTextures(worldPoint);
    float fillAlpha = clamp(fillMask * uFillOpacity, 0.0, 1.0);
    vec3 fillBlend = mix(textureColor.rgb, uFillColor, fillAlpha);
    float fillLayerAlpha = max(textureColor.a, fillAlpha);

    float finalAlpha = max(fillLayerAlpha, edgeAlpha);
    if (finalAlpha <= 1e-4) {
        discard;
    }

    vec3 finalColor = mix(fillBlend, uLineColor, edgeAlpha);
    outColor = vec4(finalColor, finalAlpha);
}
