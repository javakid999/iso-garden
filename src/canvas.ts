import { mat4 } from "gl-matrix";
import block_fragment from './3d-test/fragment.glsl?raw';
import block_vertex from './3d-test/vertex.glsl?raw';
import { Animation } from './animation';
import { VoxelWorld } from "./block";

export class Canvas {
    element: HTMLCanvasElement;
    gl: WebGL2RenderingContext;
    programs: {[name: string]: Program};
    global_attributes: {[name: string]: Attribute};
    draw_calls: DrawCall[];
    clear_color: [number, number, number, number] = [0,0,0,1]
    bound_textures: (WebGLTexture | null)[]

    program_vertex_data: {[program: string]: [string, Float32Array]};

    constructor(element: HTMLCanvasElement, width: number, height: number) {
        this.element = element;
        this.element.width = width;
        this.element.height = height;
        this.gl = element.getContext('webgl2')!;
        this.programs = {};
        this.program_vertex_data = {};
        this.global_attributes = {};
        this.draw_calls = [];

        const max_texture_units = this.gl.getParameter(this.gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)
        this.bound_textures = new Array(max_texture_units).fill(null);

        this.initCanvas()
    }

    private initCanvas() {
        this.gl.viewport(0, 0, this.element.width, this.element.height);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

        this.clearCanvas();
    }

    private compileShader(src: string, type: GLenum): WebGLShader | null {
        const shader = this.gl.createShader(type)!;
        this.gl.shaderSource(shader, src);
        this.gl.compileShader(shader);
        const status = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS);
        console.log(this.gl.getShaderInfoLog(shader));
        if (status) {
            return shader;
        } else {
            console.log(this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
    }

    compileProgram(name: string, vsrc: string, fsrc: string) {
        const vertex = this.compileShader(vsrc, this.gl.VERTEX_SHADER)!;
        const fragment = this.compileShader(fsrc, this.gl.FRAGMENT_SHADER)!;
        const gl_program = this.gl.createProgram()!;

        this.gl.attachShader(gl_program, vertex);
        this.gl.attachShader(gl_program, fragment);
        this.gl.linkProgram(gl_program);

        const status = this.gl.getProgramParameter(gl_program, this.gl.LINK_STATUS);
        console.log(this.gl.getProgramInfoLog(gl_program));

        if (status) {
            const program: Program = {
                name: name,
                program: gl_program,
                vao: this.gl.createVertexArray(),
                attributes: {},
                uniforms: {},
                frame_buffers: {}
            };
            this.programs[name] = program;
        } else {
            this.gl.deleteProgram(gl_program)
        }
    }

    addFrameBuffer(name: string, program_name: string, width: number, height: number, render_buffers: RenderBuffer[], texture_types: number[]) {
        this.gl.useProgram(this.programs[program_name].program);

        // Create framebuffer
        const frame_buffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, frame_buffer)
        this.gl.viewport(0, 0, this.element.width, this.element.height);

        // Create RenderBuffers, bind to framebuffer
        for (let i = 0; i < render_buffers.length; i++) {
            const render_buffer = this.gl.createRenderbuffer();
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, render_buffer)
            this.gl.renderbufferStorage(this.gl.RENDERBUFFER, render_buffers[i].internal_format, width, height)
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, render_buffers[i].attachment, this.gl.RENDERBUFFER, render_buffer)
        }

        // Create textures, bind to framebuffer
        for (let i = 0; i < texture_types.length; i++) {
            const texture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, texture_types[i], this.gl.TEXTURE_2D, texture, 0);
        }

        this.programs[program_name].frame_buffers[name] = {
            frame_buffer: frame_buffer,
            size: [width, height],
            render_buffers: render_buffers,
            texture_types: texture_types
        }

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
    }

    addAttribute(name: string, program_name: string, size: number, type: GLenum, normalize: boolean, stride: number, offset: number, bufferType: GLenum, isVertexData: boolean) {
        const attributeLocation = this.gl.getAttribLocation(this.programs[program_name].program, name);
        this.programs[program_name].attributes[name] = {name: name, buffer: this.gl.createBuffer()!, location: attributeLocation, size: size, type: type, normalize: normalize, stride: stride, offset: offset, bufferType: bufferType, isVertexData: isVertexData};
        
        this.gl.useProgram(this.programs[program_name].program);

        this.gl.bindBuffer(bufferType, this.programs[program_name].attributes[name].buffer);
        this.gl.bindVertexArray(this.programs[program_name].vao);
        this.gl.enableVertexAttribArray(attributeLocation);
        this.gl.vertexAttribPointer(attributeLocation, size, type, normalize, stride, offset);
        this.gl.bindVertexArray(null);
    }

    attributeData(name: string, program_name: string, data: Float32Array) {
        this.gl.useProgram(this.programs[program_name].program);

        if (this.programs[program_name].attributes[name].isVertexData) {
            this.program_vertex_data[program_name] = [name, data];
        } else {
            this.gl.bindBuffer(this.programs[program_name].attributes[name].bufferType, this.programs[program_name].attributes[name].buffer);
            this.gl.bufferData(this.programs[program_name].attributes[name].bufferType, data, this.gl.STATIC_DRAW);
        }
        //Attribute Data DrawLength: Math.floor((data.length - this.programs[program_name].attributes[name].offset) / this.programs[program_name].attributes[name].size / (this.programs[program_name].attributes[name].stride == 0 ? 1 : this.programs[program_name].attributes[name].stride));
    }

    addUniform(name: string, program_name: string, type: UniformType, length: number, data?: number | Float32Array | Int32Array | mat4) {
        this.gl.useProgram(this.programs[program_name].program)
        const uniformLocation = this.gl.getUniformLocation(this.programs[program_name].program, name)!;
        this.programs[program_name].uniforms[name] = {name: name, location: uniformLocation, type: type, length: length}
        if (data !== undefined) {
            this.uniformData(name, program_name, data);
        }
    }

    createTexture(type: UniformType, texture_unit: number, texture: HTMLImageElement | HTMLImageElement[], wrap_behaviour?: [number, number], filter?: number) {
        let gl_texture = null;
        switch (type) {
            case UniformType.Texture2D:
                if (Array.isArray(texture)) {
                    console.error(`Error: Wrong texture type used for texture in slot ${texture_unit}`);
                    break;
                }
                gl_texture = this.gl.createTexture()!;
                this.gl.activeTexture(this.gl.TEXTURE0 + length);
                this.gl.bindTexture(this.gl.TEXTURE_2D, gl_texture);
                if (this.bound_textures[texture_unit] != null) console.warn(`Warning: Overwriting texture in slot ${texture_unit}`)
                this.bound_textures[texture_unit] = gl_texture;

                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, wrap_behaviour ? wrap_behaviour[0] : this.gl.REPEAT);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, wrap_behaviour ? wrap_behaviour[1] : this.gl.REPEAT);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, filter ? filter : this.gl.NEAREST);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, filter ? filter : this.gl.NEAREST);

                this.gl.texImage2D(
                    this.gl.TEXTURE_2D,
                    0,
                    this.gl.RGBA,
                    this.gl.RGBA,
                    this.gl.UNSIGNED_BYTE,
                    texture
                );
                break;
            case UniformType.CubeMap:
                if (!Array.isArray(texture)) {
                    console.error(`Error: Wrong texture type used for texture in slot ${texture_unit}`);
                    break;
                }
                gl_texture = this.gl.createTexture()!;
                this.gl.activeTexture(this.gl.TEXTURE0 + texture_unit);
                this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, gl_texture);

                this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
                this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
                
                this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, texture[0]!);
                this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, texture[1]!);
                this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, texture[2]!);
                this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, texture[3]!);
                this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, texture[4]!);
                this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, texture[5]!);
                
                this.gl.generateMipmap(this.gl.TEXTURE_CUBE_MAP);
        }
    }

    bindTexutres(program_name: string) {
        for (let uniform_name of Object.keys(this.programs[program_name].uniforms)) {
            const uniform = this.programs[program_name].uniforms[uniform_name];
            if (uniform.type == UniformType.Texture2D) {
                this.gl.activeTexture(this.gl.TEXTURE0 + uniform.length);
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.bound_textures[uniform.length])
            }
        }
    }

    getDrawLength(program_name: string) {
        const attrib_size = this.programs[program_name].attributes[this.program_vertex_data[program_name][0]].size;
        return this.program_vertex_data[program_name][1].length / attrib_size;
    }

    getPixel(program_name: string, x: number, y: number, frame_buffer?: string): Uint8Array {
        this.gl.useProgram(this.programs[program_name].program);

        if (frame_buffer) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.programs[program_name].frame_buffers[frame_buffer].frame_buffer);
        } else {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }

        const data = new Uint8Array(4);
        this.gl.readPixels(x, y, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)

        return data;
    }

    addDrawCall(program_name: string, draw_length: number, offset: number, z_layer: number, frame_buffers?: string[], options?: DrawCallOptions, pre_draw?: (c: Canvas) => void): DrawCall {
        const draw_call: DrawCall = {
            program: this.programs[program_name],
            drawLength: draw_length,
            offset: offset,
            z_layer: z_layer,
            frame_buffers: frame_buffers? frame_buffers : [],
            options: options,
            pre_draw: pre_draw
        };
        this.draw_calls.push(draw_call);
        this.draw_calls.sort((a, b) => a.z_layer- b.z_layer)
        return draw_call
    }

    clearDrawCalls(program_name?: string) {
        if (program_name !== undefined) {
            this.draw_calls = this.draw_calls.filter((d) => d.program.name !== program_name);
        } else {
            this.draw_calls = [];
        }
    }

    removeDrawCall(draw_call: DrawCall) {
        this.draw_calls = this.draw_calls.filter(c => c !== draw_call);
    }

    uniformData(name: string, program_name: string, data: number | Float32Array | Int32Array | mat4): void {
        this.gl.useProgram(this.programs[program_name].program);

        switch(this.programs[program_name].uniforms[name].type) {
            case UniformType.Float:
                switch(this.programs[program_name].uniforms[name].length) {
                    case 1:
                        if (typeof data === "number") {
                            this.gl.uniform1f(this.programs[program_name].uniforms[name].location, data);
                        }
                        break;
                }
                break;
                // todo: arrays of floats
            case UniformType.FloatArray:
            case UniformType.FloatVector:
                switch(this.programs[program_name].uniforms[name].length) {
                    case 3:
                        if (data instanceof Float32Array) {
                            this.gl.uniform3fv(this.programs[program_name].uniforms[name].location, data);
                        }
                        break;
                }
                break;
            case UniformType.Integer:
                switch(this.programs[program_name].uniforms[name].length) {
                    case 1:
                        if (typeof data === 'number') {
                            this.gl.uniform1i(this.programs[program_name].uniforms[name].location, data);
                        }
                        break;
                }
                break;
                // todo: arrays of ints
            case UniformType.IntegerArray:
            case UniformType.IntegerVector:
            case UniformType.Matrix2:
            case UniformType.Matrix3:
            case UniformType.Matrix4:
                if (typeof data !== 'number' && typeof data[Symbol.iterator] === 'function') {
                    this.gl.uniformMatrix4fv(this.programs[program_name].uniforms[name].location, false, data);
                }
                break;
            case UniformType.Texture2D:
                if (typeof data === 'number') this.gl.uniform1i(this.programs[program_name].uniforms[name].location, data);
                break;
            case UniformType.CubeMap:
                if (typeof data === 'number') this.gl.uniform1i(this.programs[program_name].uniforms[name].location, data);;
                break;
        }
    }

    clearCanvas(clear_frame_buffers?: boolean) {
        for (let program_name of Object.keys(this.programs)) {
            this.gl.useProgram(this.programs[program_name].program);
            if (clear_frame_buffers) {
                for (let frame_buffer of Object.keys(this.programs[program_name].frame_buffers)) {
                    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.programs[program_name].frame_buffers[frame_buffer].frame_buffer);
                    this.gl.clearColor(...this.clear_color);
                    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
                }
            }
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
            this.gl.clearColor(...this.clear_color);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        }
    }

    render() {
        this.clearCanvas(true);
        for (let call of this.draw_calls) {
            if (call.pre_draw) call.pre_draw(this);

            this.gl.useProgram(call.program.program);
            this.bindTexutres(call.program.name);

            const program_name = call.program.name;

            if (call.options && call.options.depth_ignore) {
                this.gl.depthFunc(this.gl.LEQUAL);
            } else {
                this.gl.depthFunc(this.gl.LESS);
            }

            this.gl.bindBuffer(this.programs[program_name].attributes[this.program_vertex_data[program_name][0]].bufferType, this.programs[program_name].attributes[this.program_vertex_data[program_name][0]].buffer);
            this.gl.bufferData(this.programs[program_name].attributes[this.program_vertex_data[program_name][0]].bufferType, this.program_vertex_data[program_name][1], this.gl.STATIC_DRAW);

            this.gl.bindVertexArray(call.program.vao);
            for (let frame_buffer of call.frame_buffers) {
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.programs[call.program.name].frame_buffers[frame_buffer].frame_buffer)
                this.gl.drawArrays((call.options && call.options.primitive_type !== undefined) ? call.options.primitive_type : this.gl.TRIANGLES, call.offset, call.drawLength);
            }
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
            if (!call.options || (call.options && call.options.draw_screen == undefined) || (call.options && call.options.draw_screen == true)) {
                this.gl.drawArrays((call.options && call.options.primitive_type !== undefined) ? call.options.primitive_type : this.gl.TRIANGLES, call.offset, call.drawLength);
            }
        }
    }
}

export class GardenCanvas extends Canvas {
    proj: mat4;
    view: mat4;
    view_right: [number, number, number]
    view_up: [number, number, number]
    camera_pos: [number, number, number]
    camera_animation: Animation<number>
    camera_bound_animation: Animation<number>
    looking_at: [number, number, number]
    mouse_pos: [number, number]
    held_block_id: number;
    time: number;
    world: VoxelWorld

    constructor(element: HTMLCanvasElement, width: number, height: number, atlas: HTMLImageElement) {
        super(element, width, height);
        this.gl.enable(this.gl.CULL_FACE)
        this.proj = mat4.create();
        this.view = mat4.create();
        this.time = 0;
        this.mouse_pos = [0,0];
        this.camera_animation = new Animation(Math.PI/4, Math.PI/4, 0);
        this.camera_bound_animation = new Animation(1, 2, 3000);
        this.camera_bound_animation.play();
        this.camera_animation.complete = true;
        this.held_block_id = 32*5+3;

        this.world = new VoxelWorld([10,10,10], 1);
        this.world.place_block({id: 32*3+4, position: [5,0,5]});

        this.compileProgram('block', block_vertex, block_fragment);
        this.createTexture(UniformType.Texture2D, 1, atlas, [this.gl.CLAMP_TO_EDGE, this.gl.CLAMP_TO_EDGE])
        
        this.addUniform('atlas', 'block', UniformType.Texture2D, 1, 1)
        this.addUniform('selected', 'block', UniformType.Integer, 1, 0);
        this.addUniform('proj', 'block', UniformType.Matrix4, -1);
        this.addUniform('view', 'block', UniformType.Matrix4, -1);
        const angle = this.camera_animation.get()
        this.camera_pos = [Math.cos(angle)*10+5, 5, Math.sin(angle)*10+5];
        this.looking_at = [5.5, 0.5, 5.5];
        this.addUniform('camera_pos', 'block', UniformType.FloatVector, 3, new Float32Array(this.camera_pos))
        mat4.orthoNO(this.proj, -this.world.camera_scale, this.world.camera_scale, -this.world.camera_scale*this.element.height/this.element.width, this.world.camera_scale*this.element.height/this.element.width, 0.1, 100);
        mat4.lookAt(this.view, this.camera_pos, this.looking_at, [0,1,0]);
        this.view_right = [this.view[0], this.view[4], this.view[8]];
        this.view_up = [this.view[1], this.view[5], this.view[9]];
        this.uniformData('proj', 'block',  this.proj);
        this.uniformData('view', 'block', this.view);

        this.addAttribute('vertexPosition',  'block', 3, this.gl.FLOAT, false, 0, 0, this.gl.ARRAY_BUFFER, true);
        this.addAttribute ('vertexColor', 'block', 2, this.gl.FLOAT, false, 0, 0, this.gl.ARRAY_BUFFER, false);
        const world_vertex = this.world.get_vertex_information();
        this.attributeData('vertexPosition', 'block', world_vertex[0]);
        this.attributeData('vertexColor', 'block', world_vertex[1]);
        this.addDrawCall('block', this.getDrawLength('block'), 0, -1);
    }

    regenerate_view_matrix(camera_pos: [number, number, number], looking_at: [number, number, number]) {
        this.camera_pos = camera_pos;
        this.looking_at = looking_at;
        mat4.lookAt(this.view, this.camera_pos, this.looking_at, [0,1,0]);
        this.view_right = [this.view[0], this.view[4], this.view[8]];
        this.view_up = [this.view[1], this.view[5], this.view[9]];
        this.uniformData('view', 'block', this.view);
        this.uniformData('camera_pos', 'block', new Float32Array(this.camera_pos))
    }

    place_block() {
        const o: [number, number, number] = [
            this.camera_pos[0] + this.world.camera_scale*this.mouse_pos[0]*this.view_right[0] + (this.world.camera_scale*this.element.height/this.element.width)*this.mouse_pos[1]*this.view_up[0],
            this.camera_pos[1] + this.world.camera_scale*this.mouse_pos[0]*this.view_right[1] + (this.world.camera_scale*this.element.height/this.element.width)*this.mouse_pos[1]*this.view_up[1],
            this.camera_pos[2] + this.world.camera_scale*this.mouse_pos[0]*this.view_right[2] + (this.world.camera_scale*this.element.height/this.element.width)*this.mouse_pos[1]*this.view_up[2]
        ];
        const d: [number, number, number] = [(this.looking_at[0]-this.camera_pos[0]), (this.looking_at[1]-this.camera_pos[1]), (this.looking_at[2]-this.camera_pos[2])];
        const raycast = this.world.raytrace(o, d)
        if (raycast !== null && this.world.world[raycast[1][0]][raycast[1][1]][raycast[1][2]] === null) {
            this.world.place_block({id: this.held_block_id, position: [raycast[1][0],raycast[1][1],raycast[1][2]]})
            if (this.world.bounding_cube !== null) {
                //const new_scale = Math.max(this.world.bounding_cube[1]-this.world.bounding_cube[0]+2, this.world.bounding_cube[3]-this.world.bounding_cube[2]+2, this.world.bounding_cube[5]-this.world.bounding_cube[4]+2);
                const new_scale = Math.hypot(this.world.bounding_cube[1]-this.world.bounding_cube[0], (this.world.bounding_cube[3]-this.world.bounding_cube[2])*2, this.world.bounding_cube[5]-this.world.bounding_cube[4])+2;
                if (new_scale > this.world.camera_scale) {
                    this.camera_bound_animation.reset(this.camera_bound_animation.get(), new_scale, 500);
                    this.camera_bound_animation.play();
                }
            }
            const world_vertex = this.world.get_vertex_information();
            this.attributeData('vertexPosition', 'block', world_vertex[0]);
            this.attributeData('vertexColor', 'block', world_vertex[1]);
            this.clearDrawCalls('block');
            this.addDrawCall('block', this.getDrawLength('block'), 0, -1);
        }
    }

    remove_block() {
        const o: [number, number, number] = [
            this.camera_pos[0] + this.world.camera_scale*this.mouse_pos[0]*this.view_right[0] + (this.world.camera_scale*this.element.height/this.element.width)*this.mouse_pos[1]*this.view_up[0],
            this.camera_pos[1] + this.world.camera_scale*this.mouse_pos[0]*this.view_right[1] + (this.world.camera_scale*this.element.height/this.element.width)*this.mouse_pos[1]*this.view_up[1],
            this.camera_pos[2] + this.world.camera_scale*this.mouse_pos[0]*this.view_right[2] + (this.world.camera_scale*this.element.height/this.element.width)*this.mouse_pos[1]*this.view_up[2]
        ];
        const d: [number, number, number] = [(this.looking_at[0]-this.camera_pos[0]), (this.looking_at[1]-this.camera_pos[1]), (this.looking_at[2]-this.camera_pos[2])];
        const raycast = this.world.raytrace(o, d)
        if (raycast !== null && raycast[0].id !== 32*3+4) {
            this.world.world[raycast[0].position[0]][raycast[0].position[1]][raycast[0].position[2]] = null;
            const world_vertex = this.world.get_vertex_information();
            this.attributeData('vertexPosition', 'block', world_vertex[0]);
            this.attributeData('vertexColor', 'block', world_vertex[1]);
            this.clearDrawCalls('block');
            this.addDrawCall('block', this.getDrawLength('block'), 0, -1);
        }
    }

    spin_left() {
        if (!this.camera_animation.complete) return;
        const current_angle = this.camera_animation.end;
        this.camera_animation.reset(current_angle, current_angle + Math.PI/2, 300);
        this.camera_animation.play()
        
    }

    spin_right() {
        if (!this.camera_animation.complete) return;
        const current_angle = this.camera_animation.end;
        this.camera_animation.reset(current_angle, current_angle - Math.PI/2, 300);
        this.camera_animation.play()
    }

    update(mouse_pos: [number, number]) {
        this.mouse_pos = mouse_pos;
        const o: [number, number, number] = [
            this.camera_pos[0] + this.world.camera_scale*this.mouse_pos[0]*this.view_right[0] + (this.world.camera_scale*this.element.height/this.element.width)*this.mouse_pos[1]*this.view_up[0],
            this.camera_pos[1] + this.world.camera_scale*this.mouse_pos[0]*this.view_right[1] + (this.world.camera_scale*this.element.height/this.element.width)*this.mouse_pos[1]*this.view_up[1],
            this.camera_pos[2] + this.world.camera_scale*this.mouse_pos[0]*this.view_right[2] + (this.world.camera_scale*this.element.height/this.element.width)*this.mouse_pos[1]*this.view_up[2]
        ];
        const d: [number, number, number] = [(this.looking_at[0]-this.camera_pos[0]), (this.looking_at[1]-this.camera_pos[1]), (this.looking_at[2]-this.camera_pos[2])];
        const raycast = this.world.raytrace(o, d)
        if (raycast !== null) {
            this.world.selected_block = [...raycast[0].position]
        } else {
            this.world.selected_block = null
        }

        if (!this.camera_animation.paused && !this.camera_animation.complete) {
            const angle = this.camera_animation.get()
            this.regenerate_view_matrix([Math.cos(angle)*10+5, 5, Math.sin(angle)*10+5], [5.5, 0.5, 5.5])
        }
        if (!this.camera_bound_animation.paused && !this.camera_bound_animation.complete) {
            const bounds = this.camera_bound_animation.get()
            this.world.camera_scale = bounds
            mat4.orthoNO(this.proj, -bounds, bounds, -(bounds * this.element.height / this.element.width), (bounds * this.element.height / this.element.width), 0.1, 100);
            this.uniformData('proj', 'block', this.proj);
        }

        this.time += 1/60;

        this.render();
    }
}

// this is a little bit of a reminder to myself because every time i have to write this fucking boilerplate
// i forget how this works. gl.ARRAY_BUFFER is not just a value that tells webgl what kind of buffer it is,
// it binds the buffer to a global variable which you then use to give shit to the program


// vaos are a collection of how to access attributes. it will contain all the settings you have for giving data to
// attributes *only*. what happens when you bind it, is you are telling it to listen to all the pointers you set for them,
// so you bind it, make all the pointers, and then unbind it. right before you render the things which require the attributes
// you rebind it, and it skips having to set all of those every single frame.

export enum UniformType {
    Float,
    FloatArray,
    FloatVector,
    Integer,
    IntegerArray,
    IntegerVector,
    Matrix2,
    Matrix3,
    Matrix4,
    Texture2D,
    CubeMap
}

interface Program {
    name: string;
    program: WebGLProgram;
    vao: WebGLVertexArrayObject;
    attributes: {[name: string]: Attribute};
    uniforms: {[name: string]: Uniform};
    frame_buffers: {[name: string]: FrameBuffer};
}

interface DrawCall {
    program: Program;
    drawLength: number;
    offset: number;
    z_layer: number;
    frame_buffers: string[];
    options?: DrawCallOptions;
    pre_draw?: (c: Canvas) => void
}

interface DrawCallOptions {
    draw_screen?: boolean;
    depth_ignore?: boolean;
    primitive_type?: number;
}

interface Attribute {
    name: string;
    buffer: WebGLBuffer
    location: GLuint;
    size: number;
    type: GLenum;
    normalize: boolean;
    stride: number;
    offset: number;
    bufferType: GLenum;
    isVertexData: boolean;
}

interface Uniform {
    name: string;
    location: WebGLUniformLocation;
    type: UniformType;
    length: number;
}

interface TextureParams {
    mag_filter: number;
    min_filter: number;
    texture_wrap: [number, number];
}

interface ImageTexture {
    image: HTMLImageElement;
    slot: number;
    params: TextureParams;
}

interface CubemapTexture {
    images: HTMLImageElement[];
    slot: number;
    params: TextureParams;
}

interface FrameBuffer {
    frame_buffer: WebGLFramebuffer,
    size: [number, number];
    render_buffers: RenderBuffer[]; //attachment points of renderbuffers
    texture_types: number[]; //attachment points of textures
}

interface RenderBuffer {
    internal_format: number,
    attachment: number
}