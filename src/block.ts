export interface Block {
    id: number
    position: [number, number, number]
}

export function get_block_verticies(b: Block, faces?: [number, number, number, number, number, number]) {
    const texture_pos = [(b.id % 32) / 32, Math.floor(b.id / 32) / 32]
    const vertex_uv = [
        [
            texture_pos[0],    texture_pos[1],      texture_pos[0]+1/32,texture_pos[1],      texture_pos[0]+1/32,texture_pos[1]+1/32,
            texture_pos[0],    texture_pos[1],      texture_pos[0]+1/32,texture_pos[1]+1/32,  texture_pos[0],    texture_pos[1]+1/32
        ],
        [
            texture_pos[0],    texture_pos[1]+1/32,  texture_pos[0]+1/32,texture_pos[1],      texture_pos[0],    texture_pos[1],
            texture_pos[0],    texture_pos[1]+1/32,  texture_pos[0]+1/32,texture_pos[1]+1/32,  texture_pos[0]+1/32,texture_pos[1]
        ],
        [
            texture_pos[0]+1/32,texture_pos[1],      texture_pos[0],    texture_pos[1]+1/32,  texture_pos[0],    texture_pos[1],
            texture_pos[0]+1/32,texture_pos[1],      texture_pos[0]+1/32,texture_pos[1]+1/32,  texture_pos[0],    texture_pos[1]+1/32
        ],
        [
            texture_pos[0]+1/32,texture_pos[1],      texture_pos[0],    texture_pos[1]+1/32,  texture_pos[0],    texture_pos[1],
            texture_pos[0]+1/32,texture_pos[1],      texture_pos[0]+1/32,texture_pos[1]+1/32,  texture_pos[0],    texture_pos[1]+1/32
        ],
        [
            texture_pos[0],    texture_pos[1]+1/32,  texture_pos[0],    texture_pos[1],      texture_pos[0]+1/32,texture_pos[1],
            texture_pos[0],    texture_pos[1]+1/32,  texture_pos[0]+1/32,texture_pos[1],      texture_pos[0]+1/32,texture_pos[1]+1/32
        ],
        
        [
            texture_pos[0],    texture_pos[1],      texture_pos[0]+1/32,texture_pos[1],      texture_pos[0]+1/32,texture_pos[1]+1/32,
            texture_pos[0],    texture_pos[1],      texture_pos[0]+1/32,texture_pos[1]+1/32,  texture_pos[0],    texture_pos[1]+1/32
        ],
    ];

    const vertex_position = [
        [
            b.position[0], b.position[1],     b.position[2],
            b.position[0], b.position[1],     b.position[2] + 1,
            b.position[0], b.position[1] + 1, b.position[2] + 1,

            b.position[0], b.position[1],     b.position[2],
            b.position[0], b.position[1] + 1, b.position[2] + 1,
            b.position[0], b.position[1] + 1, b.position[2]
        ],

        [
            b.position[0],     b.position[1], b.position[2],
            b.position[0] + 1, b.position[1], b.position[2] + 1,
            b.position[0],     b.position[1], b.position[2] + 1,

            b.position[0],     b.position[1], b.position[2],
            b.position[0] + 1, b.position[1], b.position[2],
            b.position[0] + 1, b.position[1], b.position[2] + 1
        ],

        [
            b.position[0],     b.position[1],     b.position[2],
            b.position[0] + 1, b.position[1] + 1, b.position[2],
            b.position[0] + 1, b.position[1],     b.position[2],

            b.position[0],     b.position[1],     b.position[2],
            b.position[0],     b.position[1] + 1, b.position[2],
            b.position[0] + 1, b.position[1] + 1, b.position[2]
        ],

        [
            b.position[0] + 1, b.position[1],     b.position[2],
            b.position[0] + 1, b.position[1] + 1, b.position[2] + 1,
            b.position[0] + 1, b.position[1],     b.position[2] + 1,

            b.position[0] + 1, b.position[1],     b.position[2],
            b.position[0] + 1, b.position[1] + 1, b.position[2],
            b.position[0] + 1, b.position[1] + 1, b.position[2] + 1
        ],

        [
            b.position[0],     b.position[1] + 1, b.position[2],
            b.position[0],     b.position[1] + 1, b.position[2] + 1,
            b.position[0] + 1, b.position[1] + 1, b.position[2] + 1,

            b.position[0],     b.position[1] + 1, b.position[2],
            b.position[0] + 1, b.position[1] + 1, b.position[2] + 1,
            b.position[0] + 1, b.position[1] + 1, b.position[2]
        ],

        [
            b.position[0],     b.position[1],     b.position[2] + 1,
            b.position[0] + 1, b.position[1],     b.position[2] + 1,
            b.position[0] + 1, b.position[1] + 1, b.position[2] + 1,

            b.position[0],     b.position[1],     b.position[2] + 1,
            b.position[0] + 1, b.position[1] + 1, b.position[2] + 1,
            b.position[0],     b.position[1] + 1, b.position[2] + 1
        ],
    ];

    if (faces !== undefined) {
        for (let i = 5; i >= 0; i--) {
            if (faces[i] === 0) {
                vertex_position.splice(i,1)
                vertex_uv.splice(i,1)
            }
        }
    }
    return [vertex_position.flat(), vertex_uv.flat()]
}

export class VoxelWorld {
    world: (Block | null)[][][];
    camera_scale: number
    size: [number, number, number]
    selected_block: [number, number, number] | null
    bounding_cube: [number, number, number, number, number, number] | null
    constructor(size: [number, number, number], camera_scale: number) {
        this.size = size;
        this.world = new Array(size[0]).fill(0).map(() => new Array(size[1]).fill(0).map(() => new Array(size[2]).fill(null)))
        this.bounding_cube = null;
        this.camera_scale = camera_scale;
        this.selected_block = null;
    }

    raytrace(o: [number, number, number], d: [number, number, number]): [Block, [number, number, number]] | null {
        const len = Math.hypot(...d);
        const rd = [d[0]/len, d[1]/len, d[2]/len];

        let x = Math.floor(o[0]);
        let y = Math.floor(o[1]);
        let z = Math.floor(o[2]);

        const sx = rd[0] >= 0 ? 1 : -1;
        const sy = rd[1] >= 0 ? 1 : -1;
        const sz = rd[2] >= 0 ? 1 : -1;

        const tmx = rd[0] === 0 ? Infinity : ((rd[0] > 0 ? (x+1 - o[0]) : (o[0] - x)) / Math.abs(rd[0]));
        const tmy = rd[1] === 0 ? Infinity : ((rd[1] > 0 ? (y+1 - o[1]) : (o[1] - y)) / Math.abs(rd[1]));
        const tmz = rd[2] === 0 ? Infinity : ((rd[2] > 0 ? (z+1 - o[2]) : (o[2] - z)) / Math.abs(rd[2]));

        const tdx = rd[0] === 0 ? Infinity : 1 / Math.abs(rd[0]);
        const tdy = rd[1] === 0 ? Infinity : 1 / Math.abs(rd[1]);
        const tdz = rd[2] === 0 ? Infinity : 1 / Math.abs(rd[2]);

        const tm = [tmx, tmy, tmz];
        const td = [tdx, tdy, tdz];

        let place_pos: [number, number, number] = [0,0,0];

        const MAX_STEPS = 100;
        for (let i = 0; i < MAX_STEPS; i++) {
            if (x >= 0 && x < this.size[0] && y >= 0 && y < this.size[1] && z >= 0 && z < this.size[2]) {
                const block = this.world[x][y][z];
                if (block !== null) return [block, place_pos];
            }
            // Step along the axis with the smallest tMax
            place_pos = [x,y,z];
            if (tm[0] < tm[1]) {
                if (tm[0] < tm[2]) {
                    x += sx;
                    tm[0] += td[0];
                } else {
                    z += sz;
                    tm[2] += td[2];
                }
            } else {
                if (tm[1] < tm[2]) {
                    y += sy;
                    tm[1] += td[1];
                } else {
                    z += sz;
                    tm[2] += td[2];
                }
            }

            // Early exit if we've left the world entirely
            //if (x < -1 || x > this.size[0] || y < -1 || y > this.size[1] || z < -1 || z > this.size[2]) break;
        }
        return null;
    }

    place_block(b: Block) {
        this.world[b.position[0]][b.position[1]][b.position[2]] = b;
        console.log(b.position)
        if (this.bounding_cube === null) { // world is empty
            this.bounding_cube = [
                b.position[0], b.position[0],
                b.position[1], b.position[1],
                b.position[2], b.position[2]
            ]
        } else {
            if (b.position[0] < this.bounding_cube[0]) this.bounding_cube[0] = b.position[0]
            if (b.position[0] > this.bounding_cube[1]) this.bounding_cube[1] = b.position[0]
            if (b.position[1] < this.bounding_cube[2]) this.bounding_cube[2] = b.position[1]
            if (b.position[1] > this.bounding_cube[3]) this.bounding_cube[3] = b.position[1]
            if (b.position[2] < this.bounding_cube[4]) this.bounding_cube[4] = b.position[2]
            if (b.position[2] > this.bounding_cube[5]) this.bounding_cube[5] = b.position[2]
        }
    }

    remove_block(pos: [number, number, number]) {
        //fuh u
    }

    // get_vertex_information(): [Float32Array, Float32Array, [number, number, number][]] {
    //     const vertex_position = [];
    //     const vertex_uv = [];
    //     const positions: [number, number, number][] = [];
    //     for (let plane of this.world) {
    //         for (let row of plane) {
    //             for (let block of row) {
    //                 if (block !== null) {
    //                     const b = get_block_verticies(block);
    //                     vertex_position.push(...b[0]);
    //                     vertex_uv.push(...b[1]);
    //                     positions.push([...block.position])
    //                 }
    //             }
    //         }
    //     }
    //     return [new Float32Array(vertex_position), new Float32Array(vertex_uv), positions];
    // }

    get_vertex_information(): [Float32Array, Float32Array, [number, number, number][]] {
        const vertex_position = [];
        const vertex_uv = [];
        const positions: [number, number, number][] = [];
        for (let i = 0; i < this.size[0]; i++) {
            for (let j = 0; j < this.size[1]; j++) {
                for (let k = 0; k < this.size[2]; k++) {
                    const block = this.world[i][j][k];
                    
                    if (block !== null) {
                        const faces: [number, number, number, number, number, number] = [0,0,0,0,0,0]
                        // Check negative faces
                        if (i === 0 || this.world[i - 1][j][k] === null) { // last block is end of the world - face must be in mesh || last block is air - face must be in mesh
                            faces[0] = 1;
                        }
                        if (j === 0 || this.world[i][j - 1][k] === null) {
                            faces[1] = 1;
                        }
                        if (k === 0 || this.world[i][j][k - 1] === null) {
                            faces[2] = 1;
                        }

                        // Check positive faces
                        if (i === this.size[0] - 1 || this.world[i + 1][j][k] === null) { // current block is end of world - face must be in mesh || next block is air - face must be in mesh
                            faces[3] = 1
                        }
                        if (j === this.size[1] - 1 || this.world[i][j + 1][k] === null) {
                            faces[4] = 1
                        }
                        if (k === this.size[2] - 1 || this.world[i][j][k + 1] === null) {
                            faces[5] = 1
                        }

                        const b = get_block_verticies(block, faces);
                        vertex_position.push(...b[0]);
                        vertex_uv.push(...b[1]);
                        positions.push([...block.position])
                    }
                }
            }
        }
        return [new Float32Array(vertex_position), new Float32Array(vertex_uv), positions];
    }
}