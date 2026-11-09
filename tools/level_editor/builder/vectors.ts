// 3d points and directions, as (x, y, z) in zone units with y up

export type Vec3 = [number, number, number];

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// how much of each of a triangle's corners makes up point (on its plane, or
// near it): weights that sum to 1, none below 0
export function barycentric(point: Vec3, [a, b, c]: Vec3[]): Vec3 {
  const [ab, ac, ap] = [subtract(b, a), subtract(c, a), subtract(point, a)];
  const [abab, abac, acac, apab, apac] = [dot(ab, ab), dot(ab, ac), dot(ac, ac), dot(ap, ab), dot(ap, ac)];
  const denominator = abab * acac - abac * abac;
  if (denominator === 0) {
    return [1, 0, 0];
  }
  const towardsB = Math.max(0, (acac * apab - abac * apac) / denominator);
  const towardsC = Math.max(0, (abab * apac - abac * apab) / denominator);
  const total = Math.max(1, towardsB + towardsC);
  return [Math.max(0, 1 - (towardsB + towardsC) / total), towardsB / total, towardsC / total];
}
