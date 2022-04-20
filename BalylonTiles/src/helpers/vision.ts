import { Vector2, Vector3 } from "@babylonjs/core";
import { Point } from "@pixi/math";
import { Projectable, Segment } from "ink-geom2d";
import { Building } from "../hooks/useBuildings";

export interface LOSSegment {
  buildingIndex: number;
  startPointIndex: number;
  endPointIndex: number;
  angle: number;
  squareDistance: number;
}

export function filterLineOfSight(
  sourcePosition: Vector3,
  buildingsData: Building[]
) {
  return (
    buildingsData
      // Récupérer tous les points
      .flatMap<LOSSegment>((building, buildingIndex) => {
        return building.points.map((point, i, points) => {
          //   globalIndex += 1;
          return {
            buildingIndex: buildingIndex,
            startPointIndex: i,
            // Indiquer index du point suivant
            endPointIndex: (i + 1) % points.length,
            // Indiquer le segment suivant
            // nextSegmentIndex: globalIndex - 1 + ((i + 1) % points.length),
            // Calculer angle et distance par rapport à la source
            angle: Math.atan2(
              point[2] - sourcePosition?.z,
              point[0] - sourcePosition?.x
            ),
            // endAngle:{

            // },
            squareDistance: point[0] * point[0] + point[2] * point[2],
          };
        });
      })
      // Trier par angle
      .sort((a, b) => a.angle - b.angle)
  );
}

function angleDistanceToXY(
  startPosition: Projectable,
  distance: number,
  angle: number
) {
  return {
    x: startPosition.x + distance * Math.cos(angle),
    y: startPosition.y + distance * Math.sin(angle),
  };
}

interface ObjectSegment {
  id: string;
  point: [number, number, number];
  lastId: string;
  nextId: string;
  angle: number;
  squareDistance: number;
  segment: Segment;
}

export interface VisionPoint {
  angle: number;
  squareDistance: number;
  point: Projectable;
}

export function computeVisionPolygon(
  position: Projectable,
  buildings: Building[],
  visionDistance: number = 100,
  nbBoundingSegments: number = 50
): VisionPoint[] {
  // Creating vision bounds
  const surroundingBuildings: Building[] = [];

  for (let i = 0; i < nbBoundingSegments; ++i) {
    const { x: x1, y: y1 } = angleDistanceToXY(
      position,
      visionDistance,
      (i * 2 * Math.PI) / nbBoundingSegments
    );
    const { x: x2, y: y2 } = angleDistanceToXY(
      position,
      visionDistance,
      ((i + 1) * 2 * Math.PI) / nbBoundingSegments
    );

    surroundingBuildings.push({
      height: 0,
      points: [
        [x1, 0, y1],
        [x2, 0, y2],
      ],
    });
  }

  const segments = [...surroundingBuildings, ...buildings]
    .flatMap(function mapDistanceSegments(building, bi) {
      return building.points.map((p, i, arr) => {
        const lastIndex = (i - 1) % arr.length;
        const nextIndex = (i + 1) % arr.length;

        // const last = arr[lastIndex];
        const next = arr[nextIndex];

        const dx = p[0] - position.x;
        const dz = p[2] - position.y;

        return {
          id: `${bi}-${i}`,
          point: p,
          lastId: `${bi}-${lastIndex}`,
          nextId: `${bi}-${nextIndex}`,
          angle: Math.atan2(dz, dx),
          squareDistance: dx * dx + dz * dz,
          arrayLenght: arr.length,
          segment: new Segment(
            { x: p[0], y: p[2] },
            { x: next[0], y: next[2] }
          ),
        };
      });
    })
    .sort(function sortDistanceSegments(a, b) {
      return a.angle - b.angle;
    })
    .reduce<{
      [id: string]: ObjectSegment;
    }>(function reduceDistanceSegments(o, item) {
      o[item.id] = item;
      return o;
    }, {});

  const visionPoints = Object.values(segments)
    .map(function mapVisionPoints(segment) {
      const segmentFromPlayer = new Segment(
        { x: position.x, y: position.y },
        { x: segment.point[0], y: segment.point[2] }
      );

      const intersections = Object.values(segments)
        .map(function mapIntersections(segment2) {
          return segmentFromPlayer.intersectionWithSegment(segment2.segment);
        })
        .filter(function filterIntersections(intersection) {
          return intersection.hasIntersection && intersection.point != null;
        })
        .map(function computeIntersections(intersection) {
          const dx = intersection.point!.x - position.x;
          const dz = intersection.point!.y - position.y;
          const squareDistance = dx * dx + dz * dz;
          const angle = Math.atan2(dz, dx);
          const point = intersection.point!;

          return {
            angle,
            squareDistance,
            point,
          };
        })
        .sort(function sortIntersections(a, b) {
          return a.squareDistance - b.squareDistance;
        });

      return intersections[0];
    })
    .filter(function filterVisionPoints(pt) {
      return pt != null;
    });

  return visionPoints;
}
