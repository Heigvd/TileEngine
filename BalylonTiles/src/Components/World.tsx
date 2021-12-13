import { Engine, Mesh, Scene, Vector3 } from "@babylonjs/core";
import * as React from "react";
import { ExportedValues } from "../DataApp";
import { isPointInPolygon } from "../helpers/geo";
import { Buildings } from "./Buildings";
import { OSMGround } from "./OSMGround";
import { Player } from "./Player";
import { Trees } from "./Trees";
import { Vision } from "./Vision";

interface WorldProps {
  exportedValues: ExportedValues;
  scene: Scene;
  engine: Engine;
}

export function World({ exportedValues, engine, scene }: WorldProps) {
  const [playerPosition, setPlayerPosition] = React.useState(new Vector3());
  const [visionPolygon, setVisionPoligon] = React.useState<Vector3[]>([]);

  const trees = React.useMemo(() => {
    return exportedValues.trees.filter((tree) => {
      return isPointInPolygon(new Vector3(...tree.point), visionPolygon);
    });
  }, [exportedValues.trees, visionPolygon]);

  return (
    <>
      <OSMGround
        scene={scene}
        xmin={exportedValues.worldData.xmin}
        xmax={exportedValues.worldData.xmax}
        zmin={exportedValues.worldData.zmin}
        zmax={exportedValues.worldData.zmax}
        subdivisions={exportedValues.worldData.groundSubdivisions}
        terrainData={exportedValues.terrain}
      />
      <Vision
        engine={engine}
        scene={scene}
        exportedData={exportedValues}
        playerPosition={playerPosition}
        onVision={setVisionPoligon}
      />
      <Buildings scene={scene} buildingsData={exportedValues.buildings} />
      <Trees scene={scene} treesData={trees} />
      <Player
        scene={scene}
        exportedData={exportedValues}
        onPlayerMove={setPlayerPosition}
      />
    </>
  );
}
