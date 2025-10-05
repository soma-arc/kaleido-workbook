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

vec4 sampleTextures(vec2 worldPoint, float diskMask) {
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
        texColor.a *= opacity * diskMask;
        accum.rgb = mix(accum.rgb, texColor.rgb, texColor.a);
        accum.a = max(accum.a, texColor.a);
    }
    return accum;
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

    vec4 textureColor = sampleTextures(worldPoint, diskMask);

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
    if (alpha <= 0.0 && textureColor.a <= 0.0) {
        discard;
    }

    vec3 finalColor = mix(textureColor.rgb, uLineColor, alpha);
    float finalAlpha = max(textureColor.a, alpha);
    outColor = vec4(finalColor, finalAlpha);
}
