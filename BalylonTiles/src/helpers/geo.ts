import { Projectable } from "ink-geom2d";

export function isPointInPolygon(point: Projectable, polygon: Projectable[]) {
  // code from Randolph Franklin (found at http://local.wasp.uwa.edu.au/~pbourke/geometry/insidepoly/)
  const { x, y } = point;
  let c = false;

  polygon.forEach((p, i, arr) => {
    const p1 = p;
    const p2 = arr[(i + 1) % arr.length];

    if (
      ((p1.y <= y && y < p2.y) || (p2.y <= y && y < p1.y)) &&
      x < ((p2.x - p1.x) * (y - p1.y)) / (p2.y - p1.y) + p1.x
    ) {
      c = !c;
    }
  });

  return c;
}
