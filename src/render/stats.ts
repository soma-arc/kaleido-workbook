/**
 * FpsAverager: maintain moving average FPS over a sliding window of N samples.
 */
export class FpsAverager {
    private times: number[] = [];
    constructor(private windowSize = 60) {}
    push(nowMs: number): void {
        this.times.push(nowMs);
        while (this.times.length > this.windowSize) this.times.shift();
    }
    get fps(): number {
        if (this.times.length < 2) return 0;
        const first = this.times[0];
        const last = this.times[this.times.length - 1];
        if (first === undefined || last === undefined) return 0;
        const dt = (last - first) / (this.times.length - 1);
        return dt > 0 ? 1000 / dt : 0;
    }
}
