#version 300 es
precision highp float;

uniform sampler2D atlas;
uniform bool selected;
in vec3 vColor;
in float d;
out vec4 fragColor;


void main() {
    vec4 ao = vec4(clamp(vec3(1.9-d/10.0)+0.2, 0.0, 1.0), 1.0);
    fragColor = (selected ? 0.2 : 0.0) + ao * texture(atlas, vColor.xy);
}