#version 300 es
precision highp float;

in vec2 vFragCoord;

uniform vec2 uResolution;
uniform sampler2D uDebugTexture;
uniform int uHasTexture;

out vec4 fragColor;

void main() {
    vec2 uv = vFragCoord / uResolution;
    vec2 center = vec2(0.5);
    vec2 local = (uv - center) / 0.25;
    float extent = max(abs(local.x), abs(local.y));
    if (extent > 1.0) {
        float vignette = smoothstep(1.1, 1.4, extent);
        fragColor = mix(vec4(0.0, 0.0, 0.0, 0.0), vec4(0.05, 0.08, 0.15, 0.65), vignette);
        return;
    }
    if (uHasTexture == 0) {
        float grid = step(0.02, abs(fract(local.x * 10.0) - 0.5)) * step(0.02, abs(fract(local.y * 10.0) - 0.5));
        vec3 fallback = mix(vec3(0.9, 0.2, 0.2), vec3(0.95, 0.95, 0.95), grid);
        fragColor = vec4(fallback, 1.0);
        return;
    }
    vec2 texUV = (local + 1.0) * 0.5;
    fragColor = texture(uDebugTexture, texUV);
}
