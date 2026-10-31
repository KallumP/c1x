// uvs for a mesh with none (a map exported without them, like tide_ruins):
// each triangle takes its texture from the two axes it faces least, one
// texture a metre, so a 1 m grid of faces gets one texture a face, as in the game

type Axes = [number, number];

// the axes a triangle's uvs come from, by which way its normal points most
function facing(p: ArrayLike<number>, i: number): Axes {
  const e1 = [p[i + 3] - p[i], p[i + 4] - p[i + 1], p[i + 5] - p[i + 2]];
  const e2 = [p[i + 6] - p[i], p[i + 7] - p[i + 1], p[i + 8] - p[i + 2]];
  const n = [
    Math.abs(e1[1] * e2[2] - e1[2] * e2[1]),
    Math.abs(e1[2] * e2[0] - e1[0] * e2[2]),
    Math.abs(e1[0] * e2[1] - e1[1] * e2[0]),
  ];
  if (n[1] >= n[0] && n[1] >= n[2]) return [0, 2]; // a floor or ceiling: x, z
  return n[0] >= n[2] ? [2, 1] : [0, 1];             // a wall: along it, then up
}

// positions: a non-indexed triangle list (x, y, z a corner)
export function boxUvs(positions: ArrayLike<number>): Float32Array {
  const uvs = new Float32Array((positions.length / 3) * 2);
  for (let tri = 0; tri < positions.length; tri += 9) {
    const [u, v] = facing(positions, tri);
    for (let corner = 0; corner < 3; corner++) {
      const p = tri + corner * 3;
      uvs[(p / 3) * 2] = positions[p + u];
      uvs[(p / 3) * 2 + 1] = positions[p + v];
    }
  }
  return uvs;
}
