export class Random {
    private state: number;

    constructor(seed: number) {
        this.state = seed >>> 0;
    }

    next(): number {
        this.state = (this.state + 0x6d2b79f5) >>> 0;
        let value = this.state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    }

    int(minimum: number, maximum: number): number {
        return minimum + Math.floor(this.next() * (maximum - minimum + 1));
    }

    percentage(minimum: number, maximum: number): number {
        return Math.round((minimum + this.next() * (maximum - minimum)) * 100) / 100;
    }

    pick<T>(items: readonly T[]): T {
        return items[this.int(0, items.length - 1)];
    }

    chance(probability: number): boolean {
        return this.next() < probability;
    }

    weighted<T>(options: ReadonlyArray<readonly [T, number]>): T {
        const total = options.reduce((sum, [, weight]) => sum + weight, 0);
        let threshold = this.next() * total;

        for (const [value, weight] of options) {
            threshold -= weight;
            if (threshold <= 0) {
                return value;
            }
        }

        return options[options.length - 1][0];
    }

    shuffle<T>(items: readonly T[]): T[] {
        const shuffled = [...items];
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
            const other = this.int(0, index);
            [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
        }

        return shuffled;
    }

    sample<T>(items: readonly T[], count: number): T[] {
        return this.shuffle(items).slice(0, Math.min(count, items.length));
    }
}
