#version 300 es
precision highp float;

#define HTR_DEBUG 0

in vec2 vFragCoord;
layout(location = 0) out vec4 outColor;

uniform int uGeodesicCount;
uniform float uLineWidth;
uniform float uFeather;
uniform vec3 uLineColor;
uniform vec3 uFillColor;
uniform int uClipToDisk;
uniform int uMaxReflections;
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

float signedDistanceLine(vec2 point, vec2 normal, vec2 anchor) {
    return dot(point - anchor, normal);
}

float signedDistanceCircle(vec2 point, vec2 center, float radius) {
    float dist = length(point - center);
    return dist - radius;
}

vec2 reflectLine(vec2 point, vec2 normal, vec2 anchor) {
    float dist = signedDistanceLine(point, normal, anchor);
    return point - 2.0 * dist * normalize(normal);
}

vec2 reflectCircle(vec2 point, vec2 center, float radius) {
    vec2 diff = point - center;
    float lenSq = max(dot(diff, diff), 1e-8);
    float scale = (radius * radius) / lenSq;
    return center + diff * scale;
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

struct TileData {
    vec3 color;
    float alpha;
    vec2 tracePoint;
    bool hitLimit;
    bool insideFundamental;
    int reflections;
    float minAbsDistance;
};

TileData shadeTiles(const vec2 worldPoint, float tileMask) {
    float minAbsDistance = 1e9;
    bool insideFundamental = true;
    for (int i = 0; i < MAX_GEODESICS; ++i) {
        if (i >= uGeodesicCount) {
            break;
        }
        vec4 packed = uGeodesicsA[i];
        if (uGeodesicKinds[i] == 0) {
            float d = signedDistanceCircle(worldPoint, packed.xy, packed.z);
            minAbsDistance = min(minAbsDistance, abs(d));
            if (d < 0.0) {
                insideFundamental = false;
            }
        } else {
            vec2 normal = normalize(packed.xy);
            float d = signedDistanceLine(worldPoint, normal, packed.zw);
            minAbsDistance = min(minAbsDistance, abs(d));
            if (d < 0.0) {
                insideFundamental = false;
            }
        }
    }

    vec2 tracePoint = worldPoint;
    int reflections = 0;
    int limit = max(uMaxReflections, 0);
    bool hitReflectionLimit = false;
    for (int step = 0; step < limit; ++step) {
        bool reflected = false;
        for (int i = 0; i < MAX_GEODESICS; ++i) {
            if (i >= uGeodesicCount) {
                 break;
            }
            vec4 packed = uGeodesicsA[i];
            if (uGeodesicKinds[i] == 0) {
                float dist = signedDistanceCircle(tracePoint, packed.xy, packed.z);
                if (dist < 0.0) {
                    tracePoint = reflectCircle(tracePoint, packed.xy, packed.z);
                    reflections += 1;
                    reflected = true;
                    break;
                }
            } else {
                vec2 normal = normalize(packed.xy);
                float dist = signedDistanceLine(tracePoint, normal, packed.zw);
                if (dist < 0.0) {
                    tracePoint = reflectLine(tracePoint, normal, packed.zw);
                    reflections += 1;
                    reflected = true;
                    break;
                }
            }
        }
        if (!reflected) {
            break;
        }
        if (step == limit - 1) {
            hitReflectionLimit = true;
        }
    }

    vec3 bodyColor = vec3(0.0);
    if (reflections > 0 || insideFundamental) {
        float hue = fract(float(reflections) * 0.16180339);
        vec3 wavePalette = palette(hue);
        vec3 baseTone = normalize(uFillColor + vec3(1e-6));
        bodyColor = mix(baseTone, wavePalette, 0.65);
    }

    if (hitReflectionLimit) {
        bodyColor = vec3(0.0);
    }

    vec4 textureColor = sampleTextures(tracePoint);
    textureColor.a *= tileMask;
    vec3 fillBlend = mix(bodyColor, textureColor.rgb, textureColor.a);

    float fillAlpha = hitReflectionLimit ? 0.0 : 0.9 * tileMask;

    TileData data;
    data.color = fillBlend;
    data.alpha = max(textureColor.a, fillAlpha);
    data.tracePoint = tracePoint;
    data.hitLimit = hitReflectionLimit;
    data.insideFundamental = insideFundamental;
    data.reflections = reflections;
    data.minAbsDistance = minAbsDistance;
    return data;
}

float computeEdgeAlpha(float minAbsDistance) {
    if (uGeodesicCount == 0) {
        return 0.0;
    }
    float pxDist = minAbsDistance * uViewport.x;
    float edgeAlpha = 1.0 - smoothstep(uLineWidth - uFeather, uLineWidth + uFeather, pxDist);
    return clamp(edgeAlpha, 0.0, 1.0);
}

vec4 shadeDebug(vec2 worldPoint, float diskMask) {
    float minAbsDistance = 1e9;
    vec3 accumColor = vec3(0.08, 0.09, 0.14);
    float hits = 0.0;
    for (int i = 0; i < MAX_GEODESICS; ++i) {
        if (i >= uGeodesicCount) {
            break;
        }
        vec4 packed = uGeodesicsA[i];
        if (uGeodesicKinds[i] == 0) {
            float dist = signedDistanceCircle(worldPoint, packed.xy, packed.z);
            minAbsDistance = min(minAbsDistance, abs(dist));
            if (dist <= 0.0) {
                accumColor += vec3(0.35, 0.1, 0.1);
                hits += 1.0;
            }
        } else {
            vec2 normal = normalize(packed.xy);
            float dist = signedDistanceLine(worldPoint, normal, packed.zw);
            minAbsDistance = min(minAbsDistance, abs(dist));
            if (dist <= 0.0) {
                accumColor += vec3(0.1, 0.35, 0.1);
                hits += 1.0;
            }
        }
    }
    float edgeAlpha = 0.0;
    if (uGeodesicCount > 0) {
        float pxDist = minAbsDistance * uViewport.x;
        edgeAlpha = 1.0 - smoothstep(uLineWidth - uFeather, uLineWidth + uFeather, pxDist);
        edgeAlpha = clamp(edgeAlpha, 0.0, 1.0);
    }
    edgeAlpha *= diskMask;
    vec3 baseColor = accumColor;
    if (hits > 0.0) {
        baseColor /= max(hits, 1.0);
    }
    vec3 finalColor = mix(baseColor, vec3(1.0), edgeAlpha);
    float finalAlpha = max(edgeAlpha, diskMask);
    return vec4(finalColor, finalAlpha);
}

void main() {
    vec2 worldPoint = screenToWorld(vFragCoord);

    float tileMask = 1.0;
    if (uClipToDisk == 1) {
        float diskDistPx = (length(worldPoint) - 1.0) * uViewport.x;
        tileMask = 1.0 - smoothstep(0.0, uFeather, diskDistPx);
    }

    TileData tile = shadeTiles(worldPoint, tileMask);
    float edgeAlpha = computeEdgeAlpha(tile.minAbsDistance);
    if (tile.hitLimit) {
        tile.alpha = 0.0;
        tile.color = vec3(0.0);
    }

    vec4 textureColor = sampleTextures(tile.tracePoint);
    textureColor.a *= tileMask;
    vec3 fillBlend = mix(tile.color, textureColor.rgb, textureColor.a);

    float unitCircleDist = abs(length(worldPoint) - 1.0);
    float unitCirclePx = unitCircleDist * uViewport.x;
    float unitCircleAlpha = 1.0 - smoothstep(uLineWidth - uFeather, uLineWidth + uFeather, unitCirclePx);

    vec3 finalColor = mix(fillBlend, uLineColor, edgeAlpha);
    //finalColor = mix(finalColor, vec3(1.0), unitCircleAlpha);

    float finalAlpha = max(max(textureColor.a, edgeAlpha), unitCircleAlpha);
    finalAlpha = max(finalAlpha, tile.alpha);
    vec4 color = vec4(finalColor, finalAlpha);

    if (HTR_DEBUG == 1) {
        color = shadeDebug(worldPoint, tileMask);
    }

    if (color.a <= 1e-4) {
        discard;
    }
    outColor = color;
}
