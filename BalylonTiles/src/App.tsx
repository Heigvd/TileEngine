import {
  Vector3,
  Color3,
  Mesh,
  PointLight,
  StandardMaterial,
} from "@babylonjs/core";
import * as React from "react";
import { wgs84ToLV95, getHeight } from "./helpers/utils";
import { Building } from "./hooks/useBuildings";
import { Buffer } from "buffer";
import { OSMGround } from "./Components/OSMGround";
import { ReactSceneProps, ReactScene } from "./Components/ReactScene";
import { Tree } from "./hooks/useTrees";
import { debugBoundaries } from "./helpers/debugging";
import { WorldData } from "./helpers/worldData";
import JSZip from "jszip";
import JSZipUtils from "jszip-utils";
import { Buildings } from "./Components/Buildings";
import { Trees } from "./Components/Trees";
import { readJSONZipFile } from "./helpers/jszip";
import { ExportedValues } from "./DataApp";
import { Player } from "./Components/Player";
import { World } from "./Components/World";

export interface DataCoordinates {
  minLongitude: number;
  maxLongitude: number;
  minLatitude: number;
  maxLatitude: number;
}

const containerProps: React.CanvasHTMLAttributes<HTMLDivElement> = {
  style: {
    display: "flex",
    flexDirection: "column",
    height: "1024px",
    width: "1800px",
  },
};

const canvasProps: React.CanvasHTMLAttributes<HTMLCanvasElement> = {
  style: { flex: "1 1 auto" },
};

export default function App() {
  const [exportedValues, setExportedValues] = React.useState<ExportedValues>();

  const onSceneReady = React.useCallback<
    NonNullable<ReactSceneProps["onSceneReady"]>
  >(
    (_canvas, scene, _engine, camera) => {
      if (exportedValues) {
        const {
          minLatitude,
          minLongitude,
          maxLatitude,
          maxLongitude,
          offsetX,
          offsetZ,
          dataCoordinates,
        } = exportedValues.worldData;

        const initPos = wgs84ToLV95(
          (maxLatitude + minLatitude) / 2,
          (maxLongitude + minLongitude) / 2
        );

        getHeight(initPos.E, initPos.N).then((height) => {
          camera.position.x += initPos.E - offsetX;
          camera.position.y += height;
          camera.position.z += initPos.N - offsetZ;

          camera.target.x += initPos.E - offsetX;
          camera.target.y += height;
          camera.target.z += initPos.N - offsetZ;

          camera.alpha = (Math.PI * 3) / 2;
          camera.radius = 10;

          // Light
          const spot = new PointLight(
            "spot",
            new Vector3(
              camera.position.x,
              camera.position.y + 400,
              camera.position.z
            ),
            scene
          );
          spot.diffuse = new Color3(1, 1, 1);
          spot.specular = new Color3(0, 0, 0);
          //Sphere to see the light's position
          const sun = Mesh.CreateSphere("sun", 10, 4, scene);
          sun.material = new StandardMaterial("sun", scene);
          (sun.material as StandardMaterial).emissiveColor = new Color3(
            1,
            1,
            0
          );
          //Sun animation
          scene.registerBeforeRender(function () {
            sun.position = spot.position;
            spot.position.x -= 0.5;
            if (spot.position.x < -90) spot.position.x = 100;
          });
        });

        debugBoundaries(scene, dataCoordinates, {
          minLatitude,
          minLongitude,
          maxLatitude,
          maxLongitude,
        });
      }
    },
    [exportedValues]
  );

  const [dataFilePath, setDataFilePath] = React.useState(
    // "worlds/creuxduvanmini.zip"
    "worlds/batiments.zip"
  );

  const onGameStart = React.useCallback(() => {
    JSZipUtils.getBinaryContent(
      dataFilePath,
      function (err: Error, data: Parameters<typeof JSZip.loadAsync>[0]) {
        if (err) {
          throw err; // or handle err
        }

        JSZip.loadAsync(data)
          .then(function (zip) {
            const terrainFolder = zip.folder("terrain");
            const positionFile = terrainFolder?.file("vertices.json");
            const tilesFolder = terrainFolder?.folder("tiles");

            const buildingsFolder = zip.folder("buildings");
            const buildingsFile = buildingsFolder?.file("buildings.json");

            const treesFolder = zip.folder("trees");
            const treesFile = treesFolder?.file("trees.json");

            const dataFolder = zip.folder("world");
            const dataFile = dataFolder?.file("world.json");
            const initPosFile = dataFolder?.file("initPosition.json");

            if (
              positionFile &&
              tilesFolder &&
              buildingsFile &&
              treesFile &&
              dataFile &&
              initPosFile
            ) {
              const positions = readJSONZipFile<number[]>(positionFile);

              const asyncTiles: Promise<Blob>[] = [];
              tilesFolder.forEach((_path, file) =>
                asyncTiles.push(
                  file.async("base64").then((data) => {
                    const blob = new Blob(
                      [Uint8Array.from(Buffer.from(data, "base64"))],
                      { type: "image/png" }
                    );
                    return blob;
                  })
                )
              );
              const tiles = Promise.all(asyncTiles).then((res) => res);

              const buildings = readJSONZipFile<Building[]>(buildingsFile);
              const trees = readJSONZipFile<Tree[]>(treesFile);
              const worldData = readJSONZipFile<WorldData>(dataFile);
              const initialPosition =
                readJSONZipFile<[number, number, number]>(initPosFile);

              Promise.all([
                positions,
                tiles,
                buildings,
                trees,
                worldData,
                initialPosition,
              ]).then(
                ([
                  positions,
                  tiles,
                  buildings,
                  trees,
                  worldData,
                  initialPosition,
                ]) => {
                  setExportedValues({
                    buildings,
                    trees,
                    terrain: {
                      positions,
                      tiles,
                    },
                    worldData,
                    initialPosition,
                  });
                }
              );
            }
          })
          .catch((e) => {
            console.log(e);
            debugger;
          });
      }
    );
  }, [dataFilePath]);

  return (
    <div
      className="App"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h1>Play MIMMS</h1>
      <input
        type="text"
        value={dataFilePath}
        onChange={(e) => setDataFilePath(e.target.value)}
      />
      <button onClick={onGameStart}>Start</button>

      {exportedValues && (
        <ReactScene
          onSceneReady={onSceneReady}
          containerProps={containerProps}
          canvasProps={canvasProps}
        >
          {(_canvas, scene, engine, _camera, _light) => (
            <World
              exportedValues={exportedValues}
              engine={engine}
              scene={scene}
            />
          )}
        </ReactScene>
      )}
    </div>
  );
}
