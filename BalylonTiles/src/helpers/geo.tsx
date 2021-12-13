import { Vector3 } from "@babylonjs/core";

export function isPointInPolygon(point: Vector3, polygon: Vector3[]) {
  // code from Randolph Franklin (found at http://local.wasp.uwa.edu.au/~pbourke/geometry/insidepoly/)
  const { x, z } = point;
  let c = false;

  polygon.forEach((p, i, arr) => {
    const p1 = p;
    const p2 = arr[(i + 1) % arr.length];

    if (
      ((p1.z <= z && z < p2.z) || (p2.z <= z && z < p1.z)) &&
      x < ((p2.x - p1.x) * (z - p1.z)) / (p2.z - p1.z) + p1.x
    ) {
      c = !c;
    }
  });

  return c;
}
