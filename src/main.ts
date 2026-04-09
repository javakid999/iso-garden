import atlas_src from './atlas.png';
import { GardenCanvas } from "./canvas";

const canvasElement = document.getElementById('c') as HTMLCanvasElement;
const atlas = new Image();
let c: GardenCanvas;
atlas.onload = () => {
    c = new GardenCanvas(canvasElement, 1280, 720, atlas);
    update();
}
atlas.src = atlas_src;

const mouse_pos: [number, number] = [0,0];

const block_buttons = document.getElementsByClassName('block-icon');
for (let i = 0; i < block_buttons.length; i++) {
    block_buttons.item(i)!.addEventListener('click', (e) => {
        for (let j = 0; j < block_buttons.length; j++) {
            block_buttons.item(j)?.classList.remove('selected')
        }
        block_buttons.item(i)?.classList.add('selected')
        change_block(i);
    });
}

canvasElement.onmousemove = (e: MouseEvent) => {
    const r = canvasElement.getBoundingClientRect();
    mouse_pos[0] =  (e.clientX - r.left) / r.width * 2 - 1;
    mouse_pos[1] = -(e.clientY - r.top) / r.height * 2 + 1;
}

canvasElement.oncontextmenu = (e) => {
    e.preventDefault();
}

canvasElement.onmousedown = (e: MouseEvent) => {
    if (e.button === 0) {
        c.place_block();
    } else if (e.button === 2) {
        e.preventDefault();
        c.remove_block();
    }
}

window.onkeydown = (e: KeyboardEvent) => {
    if (e.key === 'd') {
        c.spin_right()
    }
    if (e.key === 'a') {
        c.spin_left()
    }
}

function update() {
    c.update(mouse_pos);
    requestAnimationFrame(update);
}

function change_block(id: number) {
    switch (id) {
        case 0:
            c.held_block_id = 32*5+3;
            break;
        case 1:
            c.held_block_id = 32*15+8;
            break;
        case 2:
            c.held_block_id = 32*5+8;
            break;
    }
}