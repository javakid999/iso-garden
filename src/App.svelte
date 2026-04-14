<script lang='ts'>
    import { onMount } from 'svelte';
    import atlas_src from './atlas.png';
    import { GardenCanvas } from "./canvas";

    let canvasElement: HTMLCanvasElement;
    const atlas = new Image();
    const mouse_pos: [number, number] = [0,0];
    let c: GardenCanvas;
    atlas.onload = () => {
        c = new GardenCanvas(canvasElement, 900, 720, atlas);
        update();
    }
    atlas.src = atlas_src;

    function update() {
        c.update(mouse_pos);
        requestAnimationFrame(update);
    }

    function change_block(id: number) {
        c.held_block_id = id;
    }

    onMount(() => {
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

        window.onkeydown = (e: KeyboardEvent) => {
            if (e.key === 'd') {
                c.spin_right()
            }
            if (e.key === 'a') {
                c.spin_left()
            }
        }
    })
</script>

<div id="game-window">
    <div id="canvas-wrapper">
        <canvas id="c" bind:this={canvasElement} 
        on:mousemove={(e: MouseEvent) => {
            const r = canvasElement.getBoundingClientRect();
            mouse_pos[0] =  (e.clientX - r.left) / r.width * 2 - 1;
            mouse_pos[1] = -(e.clientY - r.top) / r.height * 2 + 1;
        }}
        on:contextmenu={(e) => {
            e.preventDefault();
        }}
        on:mousedown={(e: MouseEvent) => {
            if (e.button === 0) {
                c.place_block();
            } else if (e.button === 2) {
                e.preventDefault();
                c.remove_block();
            }
        }}
        ></canvas>
        <div id="selected-block" class="block-icon selected">
            <div class="cube">
                <div class="f1"></div>
                <div class="f2"></div>
                <div class="f3"></div>
                <div class="f4"></div>
                <div class="f5"></div>
                <div class="f6"></div>
            </div>
        </div>
    </div>
    <div id="block-picker">
        {#each {length: 4} as _, j}
            {#each {length: 5} as _, i}
                <div style="--i: {i}; --j: {j}" class="block-card" on:click={()=>{change_block(j*5+i)}}></div>
            {/each}
        {/each}
    </div>
</div>

<style lang="css">
#game-window {
    display: flex;
}

@keyframes spin {
    0% {
        transform: translate(0px, 15px) rotate3d(0, 1, 0, 0);
    }

    100% {
        transform: translate(0px, 15px) rotate3d(0, 1, 0, 360deg);
    }
}

#canvas-wrapper {
    position: relative;
    width: 900px;
    height: 720px;
}

#c {
    position: absolute;
    top: 0;
    left: 0;
}

#selected-block {
    position: absolute;
    top: 0.5em;
    left: 0.5em;
    --i: 3;
    --j: 5;
}

#block-picker {
    width: 15em;
    display: flex;
    flex-wrap: wrap;
    gap: 1em;
    background-color: #110f17;
}

.block-card {
    border-radius: 0.5em;
    width: 4em;
    margin: auto;
    height: calc(4em * 2 / sqrt(3));
    background-image: url('./block_icons.png');
    image-rendering: pixelated;
    background-size: 500%;
    background-position: calc(-1 * var(--i) * 100%) calc(-24px - var(--j) * 100%);
}

.block-card:hover {
    background-color: #7167bd97;
}

.block-icon {
    width: 5em;
    height: 5em;
    perspective: 500px;
    border-radius: 1em;
}

.cube {
    margin: auto;
    width: 50px;
    height: 50px;
    transform-style: preserve-3d;
    transform-origin: center center 0px;
    animation: spin 2s infinite linear;

    div {
        width: 50px;
        height: 50px;
        background-image: url('./atlas.png');
        image-rendering: pixelated;
        background-size: calc((100% + 50px) * 16);
        background-position: calc(-50px*var(--i)) calc(-50px*var(--j));
    }
}

.f1 {
    position: absolute;
    transform: translateZ(25px);
}

.f2 {
    position: absolute;
    transform: rotateY(180deg) translateZ(25px);
}

.f3 {
    position: absolute;
    transform: rotateY(-90deg) translateZ(25px);
}

.f4 {
    position: absolute;
    transform: rotateY(90deg) translateZ(25px);
}

.f5 {
    position: absolute;
    transform: rotateX(90deg) translateZ(25px);
}

.f6 {
    position: absolute;
    transform: rotateX(-90deg) translateZ(25px);
}
</style>