#version 300 es
precision highp float;

in vec2 vFragCoord;
out vec4 outColor;

uniform vec2 uResolution;
uniform int uSampleCount;
uniform float uTanHalfFov;

uniform vec3 uCameraPosition;
uniform vec3 uCameraForward;
uniform vec3 uCameraRight;
uniform vec3 uCameraUp;

uniform vec3 uTriangleVertices[3];
uniform vec3 uLightDirection;
uniform vec3 uTriangleColor;
uniform vec3 uSphereBaseColor;
uniform vec3 uBackgroundColor;

const int MAX_SAMPLES = 8;
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

float edgeSign(vec3 a, vec3 b, vec3 point) {
    vec3 normal = normalize(cross(a, b));
    return dot(normal, point);
}

bool isInsideTriangle(vec3 point) {
    float e0 = edgeSign(uTriangleVertices[0], uTriangleVertices[1], point);
    float e1 = edgeSign(uTriangleVertices[1], uTriangleVertices[2], point);
    float e2 = edgeSign(uTriangleVertices[2], uTriangleVertices[0], point);
    bool allPositive = e0 >= 0.0 && e1 >= 0.0 && e2 >= 0.0;
    bool allNegative = e0 <= 0.0 && e1 <= 0.0 && e2 <= 0.0;
    return allPositive || allNegative;
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
    float diffuse = max(dot(normal, normalize(uLightDirection)), 0.0);
    vec3 base = mix(uSphereBaseColor * 0.6, uSphereBaseColor, diffuse);
    bool inside = isInsideTriangle(normal);
    if (inside) {
        base = mix(base, uTriangleColor, 0.6) + diffuse * 0.2;
    }
    vec3 ambient = vec3(0.05, 0.06, 0.08);
    return clamp(base + ambient, 0.0, 1.0);
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
    outColor = vec4(color, 1.0);
}
