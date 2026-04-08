#version 300 es

precision highp float;

in vec3 vColor;
out vec4 fragColor;

uniform int id;

void main() {
    float d = length(vColor.xy-0.5);
    if (d > 0.5) discard;
    fragColor = vec4(float(id)/255.0, 0.0, 0.0, 1.0);
}