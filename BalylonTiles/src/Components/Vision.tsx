import {
  Color3,
  Engine,
  LinesMesh,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import { Segment, Vector } from "ink-geom2d";
import * as React from "react";
import { ExportedValues } from "../DataApp";
import { filterLineOfSight } from "../helpers/lineOfSight";
import { Building } from "../hooks/useBuildings";

const NB_BOUNDING_SEGMENTS = 50;
const DEFAULT_VISION_DISTANCE = 100;

interface ObjectSegment {
  id: string;
  point: [number, number, number];
  lastId: string;
  nextId: string;
  angle: number;
  squareDistance: number;
  segment: Segment;
}

function angleDistanceToXY(
  startPosition: Vector3,
  distance: number,
  angle: number
) {
  return {
    x: startPosition.x + distance * Math.cos(angle),
    y: startPosition.z + distance * Math.sin(angle),
  };
}

interface VisionProps {
  engine: Engine;
  scene: Scene;
  playerPosition: Vector3;
  exportedData: ExportedValues;
  visionDistance?: number;
  onVision?: (polygon: Vector3[]) => void;
}
export function Vision({
  engine,
  scene,
  playerPosition,
  exportedData,
  visionDistance = DEFAULT_VISION_DISTANCE,
  onVision,
}: VisionProps) {
  const extrudeRef = React.useRef<Mesh>();

  React.useEffect(() => {
    // Creating vision bounds
    const surroundingBuildings: Building[] = [];

    for (let i = 0; i < NB_BOUNDING_SEGMENTS; ++i) {
      const { x: x1, y: y1 } = angleDistanceToXY(
        playerPosition,
        visionDistance,
        (i * 2 * Math.PI) / NB_BOUNDING_SEGMENTS
      );
      const { x: x2, y: y2 } = angleDistanceToXY(
        playerPosition,
        visionDistance,
        ((i + 1) * 2 * Math.PI) / NB_BOUNDING_SEGMENTS
      );

      surroundingBuildings.push({
        height: 0,
        points: [
          [x1, 0, y1],
          [x2, 0, y2],
        ],
      });
    }

    const segments = [...surroundingBuildings, ...exportedData.buildings]
      .flatMap((building, bi) => {
        return building.points.map((p, i, arr) => {
          const lastIndex = (i - 1) % arr.length;
          const nextIndex = (i + 1) % arr.length;

          // const last = arr[lastIndex];
          const next = arr[nextIndex];

          const dx = p[0] - playerPosition.x;
          const dz = p[2] - playerPosition.z;

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
      .sort((a, b) => {
        return a.angle - b.angle;
      })
      .reduce<{
        [id: string]: ObjectSegment;
      }>(
        (o, item) => ({
          ...o,
          [item.id]: item,
        }),
        {}
      );

    const visionPoints = Object.values(segments)
      .map((segment) => {
        const segmentFromPlayer = new Segment(
          { x: playerPosition.x, y: playerPosition.z },
          { x: segment.point[0], y: segment.point[2] }
        );

        const intersections = Object.values(segments)
          .map((segment2) => {
            return segmentFromPlayer.intersectionWithSegment(segment2.segment);
          })
          .filter(
            (intersection) =>
              intersection.hasIntersection && intersection.point != null
          )
          .map((intersection) => {
            const dx = intersection.point!.x - playerPosition.x;
            const dz = intersection.point!.y - playerPosition.z;
            const squareDistance = dx * dx + dz * dz;
            const angle = Math.atan2(dz, dx);
            const point = intersection.point!;

            return {
              angle,
              squareDistance,
              point,
            };
          })
          .sort((a, b) => a.squareDistance - b.squareDistance);

        return intersections[0];
      })
      .filter((pt) => pt != null);

    if (extrudeRef.current != null) {
      extrudeRef.current.dispose();
    }

    const polygon = visionPoints.map(
      (pt) => new Vector3(pt.point?.x, playerPosition.y, pt.point?.y)
    );

    extrudeRef.current = MeshBuilder.ExtrudePolygon(
      "building",
      {
        shape: visionPoints.map(
          (pt) => new Vector3(pt.point?.x, playerPosition.y, pt.point?.y)
        ),
        depth: visionDistance,
        sideOrientation: Mesh.DOUBLESIDE,
      },
      scene
    );

    extrudeRef.current.position.y = exportedData.initialPosition[1] + 50;

    const material = new StandardMaterial("maskColor", scene);
    material.diffuseColor = Color3.Purple();
    material.alpha = 0.2;
    extrudeRef.current.material = material;
    extrudeRef.current.isPickable = false;

    onVision && onVision(polygon);
  }, [
    engine,
    exportedData.buildings,
    exportedData.initialPosition,
    exportedData.worldData.xmax,
    exportedData.worldData.xmin,
    exportedData.worldData.zmax,
    exportedData.worldData.zmin,
    onVision,
    playerPosition,
    scene,
    visionDistance,
  ]);

  return null;
}
