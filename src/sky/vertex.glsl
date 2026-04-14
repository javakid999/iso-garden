#version 300 es
precision highp float;

in vec2 screenPosition;

out vec2 fragCoord;

void main() {
    gl_Position = vec4(screenPosition, 1.0, 1.0);
    fragCoord = screenPosition;
}