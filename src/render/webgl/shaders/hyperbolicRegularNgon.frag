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
uniform int uMaxReflections;
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
    float orientation = packed.w >= 0.0 ? 1.0 : -1.0;
    float distance = length(worldPoint - center) - radius;
    return orientation * distance;
}

float signedDistanceLine(vec2 worldPoint, vec4 packed) {
    vec2 normal = normalize(packed.xy);
    vec2 anchor = packed.zw;
    return dot(worldPoint - anchor, normal);
}

vec2 reflectLine(vec2 point, vec4 packed) {
    vec2 normal = normalize(packed.xy);
    vec2 anchor = packed.zw;
    float dist = signedDistanceLine(point, packed);
    return point - 2.0 * dist * normal;
}

vec2 reflectCircle(vec2 point, vec4 packed) {
    vec2 center = packed.xy;
    float radius = packed.z;
    vec2 diff = point - center;
    float lenSq = max(dot(diff, diff), 1e-8);
    float scale = (radius * radius) / lenSq;
    return center + diff * scale;
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

vec4 sampleTextures(vec2 worldPoint) {
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
        texColor.a *= opacity;
        accum.rgb = mix(accum.rgb, texColor.rgb, texColor.a);
        accum.a = max(accum.a, texColor.a);
    }
    return accum;
}

vec3 palette(float t) {
    const float TAU = 6.2831853;
    vec3 phase = vec3(0.0, 2.0943951, 4.1887902);
    return 0.55 + 0.45 * cos(TAU * t + phase);
}

struct TileData {
    vec3 color;
    float alpha;
    float minAbsDistance;
};

TileData shadeTiles(vec2 worldPoint, float tileMask) {
    float minAbsDistance = 1e9;
    bool insideFundamental = true;
    for (int i = 0; i < MAX_GEODESICS; ++i) {
        if (i >= uGeodesicCount) {
            break;
        }
        vec4 packed = uGeodesicsA[i];
        float distance;
        if (uGeodesicKinds[i] == 0) {
            distance = signedDistanceCircle(worldPoint, packed);
        } else {
            distance = signedDistanceLine(worldPoint, packed);
        }
        minAbsDistance = min(minAbsDistance, abs(distance));
        if (distance < 0.0) {
            insideFundamental = false;
        }
    }

    vec2 tracePoint = worldPoint;
    int reflections = 0;
    int limit = max(uMaxReflections, 0);
    bool hitLimit = false;
    for (int step = 0; step < limit; ++step) {
        bool reflected = false;
        for (int i = 0; i < MAX_GEODESICS; ++i) {
            if (i >= uGeodesicCount) {
                break;
            }
            vec4 packed = uGeodesicsA[i];
            float distance;
            if (uGeodesicKinds[i] == 0) {
                distance = signedDistanceCircle(tracePoint, packed);
                if (distance < 0.0) {
                    tracePoint = reflectCircle(tracePoint, packed);
                    reflected = true;
                }
            } else {
                distance = signedDistanceLine(tracePoint, packed);
                if (distance < 0.0) {
                    tracePoint = reflectLine(tracePoint, packed);
                    reflected = true;
                }
            }
            if (reflected) {
                reflections += 1;
                break;
            }
        }
        if (!reflected) {
            break;
        }
        if (step == limit - 1) {
            hitLimit = true;
        }
    }

    vec3 bodyColor = vec3(0.0);
    if (reflections > 0 || insideFundamental) {
        float hue = fract(float(reflections) * 0.16180339);
        vec3 wavePalette = palette(hue);
        vec3 baseTone = normalize(uFillColor + vec3(1e-6));
        bodyColor = mix(baseTone, wavePalette, 0.65);
    }
    if (hitLimit) {
        bodyColor = vec3(0.0);
    }

    vec4 textureColor = sampleTextures(tracePoint);
    textureColor.a *= tileMask;
    vec3 fillBlend = mix(bodyColor, textureColor.rgb, textureColor.a);
    float fillAlpha = hitLimit ? 0.0 : max(textureColor.a, 0.85 * tileMask);

    TileData data;
    data.color = fillBlend;
    data.alpha = fillAlpha;
    data.minAbsDistance = minAbsDistance;
    return data;
}

void main() {
    vec2 worldPoint = screenToWorld(vFragCoord);
    float diskMask = 1.0;
    if (uClipToDisk == 1) {
        float diskDistance = (length(worldPoint) - 1.0) * uViewport.x;
        diskMask = 1.0 - smoothstep(0.0, uFeather, diskDistance);
    }

    TileData tile = shadeTiles(worldPoint, diskMask);
    float lineMask = 1.0 - smoothstep(uLineWidth, uLineWidth + uFeather, tile.minAbsDistance * uViewport.x);
    lineMask *= diskMask;

    float unitCirclePx = abs(length(worldPoint) - 1.0) * uViewport.x;
    float unitCircleAlpha = 1.0 - smoothstep(uLineWidth, uLineWidth + uFeather, unitCirclePx);

    float colorAlpha = max(tile.alpha, lineMask);
    colorAlpha = max(colorAlpha, unitCircleAlpha);
    if (colorAlpha <= 0.0 && diskMask <= 0.0) {
        discard;
    }

    vec3 shaded = tile.color;
    shaded = mix(shaded, uLineColor, lineMask);
    shaded = mix(shaded, uUnitCircleColor, unitCircleAlpha);
    shaded = pow(shaded, vec3(1.0 / GAMMA));

    outColor = vec4(shaded, colorAlpha);
}
