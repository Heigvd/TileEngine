import { Vector2, Vector3 } from "@babylonjs/core";
import { Building } from "../hooks/useBuildings";

export interface Segment {
  buildingIndex: number;
  startPointIndex: number;
  endPointIndex: number;
  angle: number;
  //   endAngle: number;
  squareDistance: number;
}

export function filterLineOfSight(
  sourcePosition: Vector3,
  buildingsData: Building[]
) {
  //   let globalIndex = 0;
  const currentSegments = [];
  const visibleSegments = [];

  return (
    buildingsData
      // Récupérer tous les points
      .flatMap<Segment>((building, buildingIndex) => {
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
  // Parcourir les segments
  // .forEach(segment=>{
  //     currentSegments.push(segment);
  //     if(currentSegments.length > 0){
  //         //check if segment is
  //     }
  // })
}

// function getAllBuildingsPoints(
//   sourcePosition: Vector3,
//   buildingsData: Building[]
// ) {
//   return buildingsData
//     .flatMap((building, buildingIndex) =>
//       building.points.map((point, pointIndex, points) => {
//         const xDistance = point.x - sourcePosition.x;
//         const zDistance = point.z - sourcePosition.z;

//         return {
//           squareDistance: xDistance * xDistance + zDistance * zDistance,
//           angle: Math.atan2(zDistance, xDistance),
//           pointIndex,
//           previousPointIndex: (pointIndex - 1) % points.length,
//           nextPointIndex: (pointIndex + 1) % points.length,
//           buildingIndex,
//         };
//       })
//     )
//     .sort((a, b) => a.angle - b.angle);
// }

// function los(  sourcePosition: Vector3,
//   buildingsData: Building[]
// ){

// const segments {a:Vector3,}
//   getAllBuildingsPoints(sourcePosition,buildingsData).map(point=>{

//   })
// }
