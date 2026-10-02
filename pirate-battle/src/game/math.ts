export interface Vec { x: number; y: number; }

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const normalize = (v: Vec): Vec => {
  const d = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / d, y: v.y / d };
};
export const angleVector = (angle: number): Vec => ({ x: Math.cos(angle), y: Math.sin(angle) });
export const rotate = (v: Vec, angle: number): Vec => ({
  x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
  y: v.x * Math.sin(angle) + v.y * Math.cos(angle)
});
export const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export const circleRectCollision = (
  circle: Vec,
  radius: number,
  rect: { x: number; y: number; width: number; height: number }
) => {
  const x = clamp(circle.x, rect.x, rect.x + rect.width);
  const y = clamp(circle.y, rect.y, rect.y + rect.height);
  return distance(circle, { x, y }) <= radius;
};

/**
 * Círculo contra retângulo de cantos arredondados. Equivale a um retângulo
 * encolhido pelo raio do canto, testado com o raio do círculo somado a ele.
 */
export const circleRoundedRectCollision = (
  circle: Vec,
  radius: number,
  rect: { x: number; y: number; width: number; height: number; corner: number }
) => {
  const corner = Math.min(rect.corner, rect.width / 2, rect.height / 2);
  return circleRectCollision(
    circle,
    radius + corner,
    {
      x: rect.x + corner,
      y: rect.y + corner,
      width: rect.width - corner * 2,
      height: rect.height - corner * 2
    }
  );
};

/** Gerador pseudo-aleatório determinístico (mulberry32). Retorna valores em [0, 1). */
export type Rng = () => number;
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
