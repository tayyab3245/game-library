// src/components/GameShelf/helpers.ts
export const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

export const same = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/* shared timing constants so CSS & JS stay in lock-step */
export const TIMINGS = {
  snap : 0.25,   // seconds ­– camera / shell snap
  hover: 0.30,
  tap  : 0.18,
};