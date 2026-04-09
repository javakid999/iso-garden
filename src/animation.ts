export class Animation<T> {
    current_time: number
    last_time: number;
    animation_time: number
    duration: number
    paused: boolean;
    complete: boolean;
    start: T;
    end: T;

    constructor(start: T, end: T, duration: number) {
        this.animation_time = 0;
        this.current_time = 0;
        this.last_time = -1;
        this.duration = duration;
        this.paused = true;
        this.complete = false;
        if (typeof start !== 'number' && !(start instanceof Array)) console.error('Generic is not of supported type')
        if (typeof start !== typeof end) console.error('Start and end types mismatch')
        if (start instanceof Array && end instanceof Array && start.length !== end.length) console.error('Start and end lengths mismatch')
        this.start = start;
        this.end = end;
    }

    reset(start: T, end: T, duration: number) {
        this.animation_time = 0;
        this.current_time = 0;
        this.last_time = -1;
        this.duration = duration;
        this.paused = true;
        this.complete = false;
        if (typeof start !== typeof end) console.error('Start and end types mismatch')
        if (start instanceof Array && end instanceof Array && start.length !== end.length) console.error('Start and end lengths mismatch')
        this.start = start;
        this.end = end;
    }

    // function should take one number in the range of 0 - 1 and return one in that same range
    func(x: number): number {
        return x**0.7;
    }

    get(): T {
        if (this.complete) return this.end
        if (this.animation_time > this.duration) {
            this.complete = true;
            return this.end;
        }

        let v: T;
        if (typeof this.start === 'number' && typeof this.end === 'number') {
            v = (this.end - this.start) * this.func(this.animation_time / this.duration) + this.start as T;
        } else if (this.start instanceof Array && this.end instanceof Array) {
            const a = []
            for (let i = 0; i < this.start.length; i++) {
                a.push((this.end[i] - this.start[i]) * this.func(this.animation_time / this.duration) + this.start[1])
            }
            v = a as T
        } else {
            v = null as T
        }

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