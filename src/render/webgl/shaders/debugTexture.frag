#version 300 es
precision highp float;

in vec2 vFragCoord;

uniform vec2 uResolution;
uniform sampler2D uDebugTexture;
uniform int uHasTexture;

out vec4 fragColor;

void main() {
    vec2 uv = vFragCoord / uResolution;
    uv.y = 1.0 - uv.y;
    if (uHasTexture == 0) {
        fragColor = vec4(uv, 0.0, 1.0);
        return;
    }
    vec4 tex = texture(uDebugTexture, uv);
    vec3 background = vec3(1);
    fragColor = vec4(mix(background, tex.rgb, tex.a), 1.0);
}
