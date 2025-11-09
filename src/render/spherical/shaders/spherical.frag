#version 300 es
precision highp float;

const float GAMMA = 2.2;

in vec2 vFragCoord;
out vec4 outColor;

uniform vec2 uResolution;
uniform int uSampleCount;
uniform float uTanHalfFov;

uniform vec3 uCameraPosition;
uniform vec3 uCameraForward;
uniform vec3 uCameraRight;
uniform vec3 uCameraUp;

uniform vec3 uTrianglePlanes[3];
uniform vec3 uLightDirection;
uniform vec3 uSphereBaseColor;
uniform vec3 uBackgroundColor;
uniform int uMaxReflections;
uniform float uBoundaryFeather;
uniform vec3 uTileBaseColor;
uniform vec3 uTileAccentColor;

const int MAX_SAMPLES = 8;
const int MAX_REFLECTION_STEPS = 48;
const float TAU = 6.28318530718;
const vec2 SAMPLE_OFFSETS[MAX_SAMPLES] = vec2[](
    vec2(0.0, 0.0),
    vec2(0.25, -0.25),
    vec2(-0.25, 0.25),
    vec2(0.5, 0.5),
    vec2(-0.5, -0.5),
    vec2(0.75, -0.75),
    vec2(-0.75, 0.75),
    vec2(-0.25, -0.75)
);

struct RayHit {
    bool hit;
    float t;
    vec3 position;
};

struct ReflectionResult {
    vec3 point;
    float minAbsDistance;
    bool hitLimit;
    bool inside;
    int reflections;
};

RayHit intersectSphere(vec3 origin, vec3 dir) {
    float b = 2.0 * dot(origin, dir);
    float c = dot(origin, origin) - 1.0;
    float discriminant = b * b - 4.0 * c;
    if (discriminant < 0.0) {
        return RayHit(false, 0.0, vec3(0.0));
    }
    float t = (-b - sqrt(discriminant)) * 0.5;
    if (t <= 0.0) {
        return RayHit(false, 0.0, vec3(0.0));
    }
    vec3 position = origin + t * dir;
    return RayHit(true, t, position);
}

bool isInsideTriangle(vec3 point) {
    float e0 = dot(uTrianglePlanes[0], point);
    float e1 = dot(uTrianglePlanes[1], point);
    float e2 = dot(uTrianglePlanes[2], point);
    bool allPositive = e0 >= 0.0 && e1 >= 0.0 && e2 >= 0.0;
    bool allNegative = e0 <= 0.0 && e1 <= 0.0 && e2 <= 0.0;
    return allPositive || allNegative;
}

vec3 reflectAcrossPlane(vec3 point, vec3 planeNormal) {
    float projection = dot(point, planeNormal);
    return point - 2.0 * projection * planeNormal;
}

vec3 palette(float t) {
    vec3 phase = vec3(0.0, 2.0943951, 4.1887902);
    return 0.55 + 0.45 * cos(TAU * t + phase);
}

ReflectionResult foldIntoTriangle(vec3 point) {
    vec3 current = normalize(point);
    float minAbsDistance = 1e9;
    for (int edge = 0; edge < 3; ++edge) {
        float d = dot(uTrianglePlanes[edge], current);
        minAbsDistance = min(minAbsDistance, abs(d));
    }
    bool inside = isInsideTriangle(current);
    int reflections = 0;
    int limit = clamp(uMaxReflections, 0, MAX_REFLECTION_STEPS);
    bool hitLimit = false;

    for (int step = 0; step < MAX_REFLECTION_STEPS; ++step) {
        if (step >= limit || inside) {
            break;
        }
        bool reflected = false;
        for (int edge = 0; edge < 3; ++edge) {
            float planeDot = dot(uTrianglePlanes[edge], current);
            minAbsDistance = min(minAbsDistance, abs(planeDot));
            if (planeDot < 0.0) {
                current = normalize(reflectAcrossPlane(current, uTrianglePlanes[edge]));
                reflections += 1;
                reflected = true;
                break;
            }
        }
        if (!reflected) {
            break;
        }
        inside = isInsideTriangle(current);
        if (step == limit - 1 && !inside) {
            hitLimit = true;
        }
    }

    ReflectionResult result;
    result.point = current;
    result.minAbsDistance = minAbsDistance;
    result.hitLimit = hitLimit;
    result.inside = inside;
    result.reflections = reflections;
    return result;
}

vec3 shadeSurface(vec3 surfaceNormal, ReflectionResult fold) {
    vec3 ambient = vec3(0.05, 0.06, 0.08);
    vec3 lightDir = normalize(uLightDirection);
    float diffuse = max(dot(surfaceNormal, lightDir), 0.0);
    if (!fold.inside || fold.hitLimit) {
        vec3 base = mix(uSphereBaseColor * 0.6, uSphereBaseColor, diffuse);
        return clamp(base + ambient, 0.0, 1.0);
    }

    float hue = float(fold.reflections) * 0.16180339;
    vec3 paletteColor = palette(hue);
    float feather = max(uBoundaryFeather, 1e-4);
    float edgeBlend = smoothstep(0.0, feather, fold.minAbsDistance);
    vec3 edgeColor = mix(uTileAccentColor, vec3(1.0), 0.15);
    vec3 tileBody = mix(uTileBaseColor, paletteColor, 1.0);
    vec3 tileColor = mix(edgeColor, tileBody, edgeBlend);
    vec3 litTile = clamp(tileColor + vec3(diffuse * 1.0, 0.0, 1.0);
    vec3 shaded = mix(tileColor, litTile, diffuse);
    return clamp(shaded + ambient, 0.0, 1.0);
}

vec3 renderSample(vec2 fragCoord) {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float ndcX = (fragCoord.x / uResolution.x) * 2.0 - 1.0;
    float ndcY = 1.0 - (fragCoord.y / uResolution.y) * 2.0;

    vec3 rayDir = normalize(
        ndcX * aspect * uTanHalfFov * uCameraRight +
        ndcY * uTanHalfFov * uCameraUp +
        uCameraForward
    );

    RayHit hit = intersectSphere(uCameraPosition, rayDir);
    if (!hit.hit) {
        return uBackgroundColor;
    }
    vec3 normal = normalize(hit.position);
    ReflectionResult fold = foldIntoTriangle(normal);
    return shadeSurface(normal, fold);
}

void main() {
    int sampleCount = clamp(uSampleCount, 1, MAX_SAMPLES);
    vec3 accumulated = vec3(0.0);
    for (int i = 0; i < MAX_SAMPLES; ++i) {
        if (i >= sampleCount) {
            break;
        }
        vec2 offset = SAMPLE_OFFSETS[i];
        vec2 sampleCoord = vFragCoord + offset;
        accumulated += renderSample(sampleCoord);
    }
    vec3 color = accumulated / float(sampleCount);
    
    // Apply gamma correction (linear to sRGB)
    vec3 gammaCorrected = pow(color, vec3(1.0 / GAMMA));
    
    outColor = vec4(gammaCorrected, 1.0);
}
