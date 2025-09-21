#version 300 es
layout(location = 0) in vec2 aPosition;
uniform vec2 uResolution;
out vec2 vFragCoord;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vFragCoord = (aPosition * 0.5 + 0.5) * uResolution;
}
