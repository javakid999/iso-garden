#version 300 es

in vec3 vertexPosition;
in vec2 vertexColor;

out vec3 vColor;
out float d;

uniform vec3 camera_pos;
uniform mat4 view;
uniform mat4 proj;
uniform float time;

void main() {
    gl_Position = proj * view * (vec4(vertexPosition, 1.0));
    vColor = vec3(vertexColor, 0.0);
    d = length(camera_pos - vertexPosition);
}