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

// ===============================================
// Control Points - Uniforms
// ===============================================
#define MAX_CONTROL_POINTS __MAX_CONTROL_POINTS__
#define SHAPE_CIRCLE 0
#define SHAPE_SQUARE 1

uniform int uControlPointCount;
uniform vec2 uControlPointPositions[MAX_CONTROL_POINTS];
uniform float uControlPointRadiiPx[MAX_CONTROL_POINTS];
uniform vec4 uControlPointFillColors[MAX_CONTROL_POINTS];
uniform vec4 uControlPointStrokeColors[MAX_CONTROL_POINTS];
uniform float uControlPointStrokeWidthsPx[MAX_CONTROL_POINTS];
uniform int uControlPointShapes[MAX_CONTROL_POINTS];

// Anti-aliasing sample offsets (spherical scene pattern)
const int MAX_AA_SAMPLES = 4;
const vec2 AA_SAMPLE_OFFSETS[MAX_AA_SAMPLES] = vec2[](
    vec2(0.0, 0.0),
    vec2(0.25, -0.25),
    vec2(-0.25, 0.25),
    vec2(0.5, 0.5)
);

// ===============================================
// Geodesic Functions
// ===============================================
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

// ===============================================
// Control Points - Rendering Functions
// ===============================================
float controlPointCircleSDF(vec2 point, vec2 center, float radius) {
    return length(point - center) - radius;
}

float controlPointSquareSDF(vec2 point, vec2 center, float halfSize) {
    vec2 d = abs(point - center) - vec2(halfSize);
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

vec4 renderControlPoint(vec2 worldPoint, int index) {
    vec2 cpPosition = uControlPointPositions[index];
    float radiusPx = uControlPointRadiiPx[index];
    vec4 fillColor = uControlPointFillColors[index];
    vec4 strokeColor = uControlPointStrokeColors[index];
    float strokeWidthPx = uControlPointStrokeWidthsPx[index];
    int shape = uControlPointShapes[index];
    
    // World-space radius
    float worldRadius = radiusPx / uViewport.x;
    float worldStrokeRadius = (radiusPx + strokeWidthPx) / uViewport.x;
    
    // Multi-sampling for anti-aliasing
    vec4 accumulated = vec4(0.0);
    for (int s = 0; s < MAX_AA_SAMPLES; s++) {
        // Screen-space offset, then convert to world space
        vec2 screenOffset = AA_SAMPLE_OFFSETS[s];
        vec2 sampleScreen = vFragCoord + screenOffset;
        vec2 sampleWorld = screenToWorld(sampleScreen);
        
        // SDF calculation
        float sdf = (shape == SHAPE_CIRCLE) 
            ? controlPointCircleSDF(sampleWorld, cpPosition, worldRadius)
            : controlPointSquareSDF(sampleWorld, cpPosition, worldRadius);
        
        if (sdf <= 0.0) {
            // Inside fill
            accumulated += fillColor;
        } else if (strokeWidthPx > 0.0) {
            // Stroke check
            float strokeSDF = (shape == SHAPE_CIRCLE)
                ? controlPointCircleSDF(sampleWorld, cpPosition, worldStrokeRadius)
                : controlPointSquareSDF(sampleWorld, cpPosition, worldStrokeRadius);
            
            if (strokeSDF <= 0.0) {
                accumulated += strokeColor;
            }
        }
    }
    
    return accumulated / float(MAX_AA_SAMPLES);
}

vec3 palette(float t) {
    const float TAU = 6.2831853;
    vec3 phase = vec3(0.0, 2.0943951, 4.1887902);
    // 彩度を上げるため、基準値を下げて振幅を上げる
    return 0.5 + 0.5 * cos(TAU * t + phase);
}

// HSV変換による彩度強調関数
vec3 saturate(vec3 rgb, float amount) {
    float gray = dot(rgb, vec3(0.299, 0.587, 0.114));
    return mix(vec3(gray), rgb, amount);
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
        
        // Degamma texture (sRGB to linear)
        texColor.rgb = pow(texColor.rgb, vec3(GAMMA));
        
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
    const int MAX_REFLECTION_STEPS = 100;

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
        // ミックス比率を上げて、彩度を強調
        bodyColor = mix(baseTone, wavePalette, 0.85);
        // 彩度を1.1倍に強調（微調整）
        bodyColor = saturate(bodyColor, 1.1);
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

    // Apply gamma correction (linear to sRGB)
    vec3 gammaCorrected = pow(finalColor, vec3(1.0 / GAMMA));

    outColor = vec4(gammaCorrected, finalAlpha);
    
    // ===============================================
    // Control Points Overlay
    // ===============================================
    for (int i = 0; i < MAX_CONTROL_POINTS; ++i) {
        if (i >= uControlPointCount) {
            break;
        }
        
        vec4 cpColor = renderControlPoint(worldPoint, i);
        
        if (cpColor.a > 0.0) {
            // Alpha blending
            outColor.rgb = outColor.rgb * (1.0 - cpColor.a) + cpColor.rgb * cpColor.a;
            outColor.a = max(outColor.a, cpColor.a);
        }
    }
}
