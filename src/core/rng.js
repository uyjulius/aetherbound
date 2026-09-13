export class RNG {
  constructor(seed = Date.now()) { this.state = (seed >>> 0) || 0x6d2b79f5; }

  next() {
    let x = this.state;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 0x100000000;
  }

  int(max) { return Math.floor(this.next() * Math.max(1, max)); }
  pick(list) { return list.length ? list[this.int(list.length)] : null; }
  chance(probability) { return this.next() < probability; }

  weighted(rows, weight = (row) => row.weight ?? 1) {
    const total = rows.reduce((sum, row) => sum + Math.max(0, weight(row)), 0);
    let roll = this.next() * total;
    for (const row of rows) {
      roll -= Math.max(0, weight(row));
      if (roll <= 0) return row;
    }
    return rows.at(-1) ?? null;
  }
}

export function hash(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619) >>> 0;
  }
  return value >>> 0;
}
