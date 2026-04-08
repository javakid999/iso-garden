export class Animation {
    current_time: number
    last_time: number;
    animation_time: number
    duration: number
    paused: boolean;
    complete: boolean;
    start: number;
    end: number;

    constructor(start: number, end: number, duration: number) {
        this.animation_time = 0;
        this.current_time = 0;
        this.last_time = -1;
        this.duration = duration;
        this.paused = true;
        this.complete = false;
        this.start = start;
        this.end = end;
    }

    reset(start: number, end: number, duration: number) {
        this.animation_time = 0;
        this.current_time = 0;
        this.last_time = -1;
        this.duration = duration;
        this.paused = true;
        this.complete = false;
        this.start = start;
        this.end = end;
    }

    // function should take one number in the range of 0 - 1 and return one in that same range
    func(x: number): number {
        return x**0.7;
    }

    get() {
        if (this.complete) return this.end
        if (this.animation_time > this.duration) {
            this.complete = true;
            return this.end;
        }
        const v = (this.end - this.start) * this.func(this.animation_time / this.duration) + this.start;

        this.current_time = performance.now()
        if (this.last_time === -1) this.last_time = performance.now()
        if (this.paused) {
            this.last_time = this.current_time;
            return v;
        };
        this.animation_time += this.current_time - this.last_time;
        this.last_time = this.current_time;
        return v;
    }

    play() {
        this.paused = false;
    }

    pause() {
        this.paused = true;
    }
}