import { Color3, MeshBuilder, Scene, Vector3 } from "@babylonjs/core";
import { Segment } from "ink-geom2d";
import * as React from "react";
import { filterLineOfSight } from "../helpers/lineOfSight";
import { Building } from "../hooks/useBuildings";

export function Vision({
  scene,
  playerPosition,
  buildingsData,
}: {
  scene: Scene;
  playerPosition: Vector3;
  buildingsData: Building[];
}) {
  React.useEffect(() => {
    ///////////////////// BLABLAAAA

    const currentSegments: Segment[] = [];

    const test = filterLineOfSight(playerPosition, buildingsData).map(
      (segment) => {
        const pointA =
          buildingsData[segment.buildingIndex].points[segment.startPointIndex];
        const pointB =
          buildingsData[segment.buildingIndex].points[segment.endPointIndex];
        const realBoundaries = MeshBuilder.CreateLines(
          "lines",
          {
            points: [
              new Vector3(pointA.x, 0, pointA.z),
              new Vector3(pointB.x, 0, pointB.z),
            ],
            updatable: true,
          },
          scene
        );
        realBoundaries.color = new Color3(
          (Math.PI + segment.angle) / (Math.PI * 2),
          Math.PI * 2 - (Math.PI + segment.angle) / (Math.PI * 2),
          0
        );

        return segment;
      }
    );
    console.log(test[0]);
    console.log(test[test.length - 1]);
  }, [buildingsData, playerPosition, scene]);
  return null;
}
