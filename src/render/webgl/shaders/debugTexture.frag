#version 300 es
precision highp float;

const float GAMMA = 2.2;

in vec2 vFragCoord;

uniform vec2 uResolution;
uniform sampler2D uDebugTexture;
uniform int uHasTexture;

out vec4 fragColor;

void main() {
    vec2 uv = vFragCoord / uResolution;
    uv.y = 1.0 - uv.y;
    if (uHasTexture == 0) {
        vec3 gammaCorrected = pow(vec3(uv, 0.0), vec3(1.0 / GAMMA));
        fragColor = vec4(gammaCorrected, 1.0);
        return;
    }
    vec4 tex = texture(uDebugTexture, uv);
    
    // Degamma texture (sRGB to linear)
    tex.rgb = pow(tex.rgb, vec3(GAMMA));
    
    vec3 background = vec3(1);
    vec3 blended = mix(background, tex.rgb, tex.a);
    
    // Apply gamma correction (linear to sRGB)
    vec3 gammaCorrected = pow(blended, vec3(1.0 / GAMMA));
    
    fragColor = vec4(gammaCorrected, 1.0);
}
