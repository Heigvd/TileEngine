import {
  Color3,
  Mesh,
  MeshBuilder,
  PolygonMeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import * as React from "react";
import { Building } from "../hooks/useBuildings";

interface BuildingsProps {
  scene: Scene;
  buildingsData: Building[];
}

export function Buildings({ scene, buildingsData }: BuildingsProps) {
  React.useEffect(() => {
    console.log("Getting buildings");
    const material = new StandardMaterial("buildingColor", scene);
    material.diffuseColor = Color3.Gray();
    // material.alpha = 0.9;

    buildingsData.map((buildingData) => {
      const building = MeshBuilder.ExtrudePolygon(
        "building",
        {
          shape: buildingData.points,
          depth: buildingData.height,
          sideOrientation: Mesh.DOUBLESIDE,
        },
        scene
      );
      building.position = new Vector3(
        building.position.x,
        buildingData.points.reduce((o, point) => o + point.y, 0) /
          buildingData.points.length +
          buildingData.height,
        building.position.z
      );

      // Avoiding
      material.useLogarithmicDepth = true;
      building.material = material;

      ///////////////////////////////////////////////
      // TEST : click action for building
      // building.isPickable = true;
      // building.actionManager = new ActionManager(scene);
      // building.actionManager.registerAction(
      //   new ExecuteCodeAction(ActionManager.OnPickUpTrigger, function () {
      //     console.log("CLICKED");
      //     alert("building clicked");
      //   })
      // );
    });
  }, [buildingsData, scene]);

  return null;
}
