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

const float INSIDE_EPS_BASE = 1e-6;  // 初期の内側判定閾値
const float NUDGE_EPS       = 0.1;  // 反射直後の押し戻し量
const float FD_H            = 2e-4;  // 有限差分のステップ

// 64bit順序非依存ハッシュの更新（XORベース）
uvec2 mixHash64(uvec2 acc, uint edge) {
    uint h = edge * 1664525u + 1013904223u;
    h ^= h << 13; h ^= h >> 17; h ^= h << 5;
    acc.x ^= h * 0x9E3779B9u;
    acc.y ^= (h ^ 0x85EBCA6Bu) * 0xC2B2AE35u;
    return acc;
}

float hashToHue(uvec2 acc) {
    uint folded = acc.x ^ (acc.y * 0x27D4EB2Du);
    return fract(float(folded) * (1.0 / 4294967296.0) * 0.61803398875 + 0.12345);
}

// 辺 i のSDF（circle/line）を wrap
float edgeSDF(int i, vec2 p) {
    vec4 pk = uGeodesicsA[i];
    return (uGeodesicKinds[i]==0) ? signedDistanceCircle(p, pk)
                                  : signedDistanceLine(p,   pk);
}

// 辺 i のSDF勾配（有限差分・正規化）
vec2 edgeSDFGrad(int i, vec2 p) {
    float dx = edgeSDF(i, p + vec2(FD_H, 0.0)) - edgeSDF(i, p - vec2(FD_H, 0.0));
    float dy = edgeSDF(i, p + vec2(0.0, FD_H)) - edgeSDF(i, p - vec2(0.0, FD_H));
    vec2 g = vec2(dx, dy) * (0.5 / FD_H);
    float L = max(length(g), 1e-30);
    return g / L;
}

TileData shadeTiles(vec2 worldPoint, float tileMask) {
    // 基本SDFとフレーム情報
    float minAbsDistance = 1e9;
    bool insideFundamental = true;
    for (int i = 0; i < MAX_GEODESICS; ++i) {
        if (i >= uGeodesicCount) break;
        float d = edgeSDF(i, worldPoint);
        minAbsDistance = min(minAbsDistance, abs(d));
        if (d < -INSIDE_EPS_BASE) insideFundamental = false;
    }

    vec2  z = worldPoint;
    int   reflections = 0;
    uvec2 tileId = uvec2(0u);

    int  limit = max(uMaxReflections, 0);
    bool hitLimit = false;

    for (int step = 0; step < limit; ++step) {
        // ステップが進むほど判定をわずかに緩める（貼り付き回避）
        float INSIDE_EPS = INSIDE_EPS_BASE * (1.0 + 0.5 * float(step) / float(max(1, limit)));

        // 最も負の辺を選ぶ（同値はインデックス最小）
        float mostNeg = 0.0;
        int   idx     = -1;
        for (int i = 0; i < MAX_GEODESICS; ++i) {
            if (i >= uGeodesicCount) break;
            float d = edgeSDF(i, z);
            if (d < mostNeg - 0.0) { mostNeg = d; idx = i; }
            else if (abs(d - mostNeg) <= 1e-12 && d < -INSIDE_EPS) {
                if (idx == -1 || i < idx) idx = i;
            }
        }

        // 全て非負（≧ -EPS）なら基本領域に到達
        if (idx == -1 || mostNeg >= -INSIDE_EPS) break;

        // その1本のみ反射
        vec4 pk = uGeodesicsA[idx];
        if (uGeodesicKinds[idx]==0) z = reflectCircle(z, pk);
        else                        z = reflectLine(z,   pk);
        reflections += 1;
        tileId = mixHash64(tileId, uint(idx));

        // 反射直後：その辺のSDFの勾配方向へ微小に押し戻す（境界から剥がす）
        vec2 n = edgeSDFGrad(idx, z);
        // SDFは負が「内側」なので、外側へ出すには +n 方向に押す
        z += n * NUDGE_EPS;

        if (step == limit - 1) hitLimit = true;
    }

    // 色：順序非依存64bit ID を hue に写像
    vec3 bodyColor = vec3(0.0);
    bool hasTile = (reflections > 0) || insideFundamental;
    if (hasTile) {
        float hue = hashToHue(tileId);
        vec3 wavePalette = palette(hue);
        vec3 baseTone = normalize(uFillColor + vec3(1e-6));
        bodyColor = mix(baseTone, wavePalette, 0.65);
    }
    if (hitLimit) bodyColor = vec3(0.0);

    // テクスチャ合成（既存のまま）
    vec4 tex = sampleTextures(z);
    tex.a *= tileMask;
    vec3 fill  = mix(bodyColor, tex.rgb, tex.a);
    float alpha = hitLimit ? 0.0 : max(tex.a, 0.85 * tileMask);
    if (!hasTile || uMaxReflections == 0) {
        alpha = 0.0;
        fill = vec3(0.0);
    }

    TileData t;
    t.color = fill;
    t.alpha = alpha;
    t.minAbsDistance = minAbsDistance;
    return t;
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
