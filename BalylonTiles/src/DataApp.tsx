import {
  Vector3,
  Color3,
  Mesh,
  PointLight,
  StandardMaterial,
} from "@babylonjs/core";
import * as React from "react";
import { Building, getBuildings } from "./hooks/useBuildings";
import { Buffer } from "buffer";
import { OSMGround, Terrain } from "./Components/OSMGround";
import { ReactSceneProps, ReactScene } from "./Components/ReactScene";
import { getTrees, Tree } from "./hooks/useTrees";
import { debugBoundaries } from "./helpers/debugging";
import { WorldData, worldData } from "./helpers/worldData";
import { ZOOM } from "./config";
import JSZip from "jszip";
import saveAs from "file-saver";
import { Buildings } from "./Components/Buildings";
import { Trees } from "./Components/Trees";
import {
  createScene,
  createTiledGround,
  getGroundHeights,
  getInitialPosition,
  getTiles,
} from "./helpers/babylonHelpers";
import { World } from "./Components/World";
import { VisionPoint } from "./helpers/vision";

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

export interface ExportedValues {
  trees: Tree[];
  buildings: Building[];
  terrain: Terrain;
  worldData: WorldData;
  initialPosition: [number, number, number];
}

export default function App() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [displayScene, setDisplayScene] = React.useState(false);
  const [exportedValues, setExportedValues] = React.useState<ExportedValues>();

  const [currentCoordinates, setCurrentCoordinates] =
    React.useState<DataCoordinates>(
      //HEIG-VD
      // {
      //   minLongitude: 6.643,
      //   maxLongitude: 6.654,
      //   minLatitude: 46.777,
      //   maxLatitude: 46.784,
      // }
      // ZERMATT
      // {
      //   minLongitude: 7.72,
      //   maxLongitude: 7.7674,
      //   minLatitude: 46.01,
      //   maxLatitude: 46.029,
      // }
      // CAVANDONE
      {
        minLongitude: 8.5113,
        maxLongitude: 8.52738,
        minLatitude: 45.94065,
        maxLatitude: 45.94746,
      }
      //CREUX-DU-VAN
      // {
      //   minLongitude: 6.6991,
      //   maxLongitude: 6.7465,
      //   minLatitude: 46.9247,
      //   maxLatitude: 46.9437,
      // }
      //CREUX-DU-VAN (mini)
      // {
      //   minLongitude: 6.72,
      //   maxLongitude: 6.74,
      //   minLatitude: 46.93,
      //   maxLatitude: 46.94,
      // }
      // Test batiments
      // {
      //   minLongitude: 6.65573,
      //   maxLongitude: 6.66166,
      //   minLatitude: 46.77648,
      //   maxLatitude: 46.77887,
      // }
    );

  const [dataCoordinates, setDataCoordinates] =
    React.useState<DataCoordinates>(currentCoordinates);
  const [playerPosition, setPlayerPosition] = React.useState(new Vector3());
  const [visionPolygon, setVisionPoligon] = React.useState<VisionPoint[]>([]);

  const {
    minLatitude,
    minLongitude,
    maxLatitude,
    maxLongitude,
    xmin,
    xmax,
    zmin,
    zmax,
    offsetX,
    offsetZ,
    groundSubdivisions,
  } = React.useMemo(() => worldData(dataCoordinates, ZOOM), [dataCoordinates]);

  const onSceneReady = React.useCallback<
    NonNullable<ReactSceneProps["onSceneReady"]>
  >(
    (_canvas, scene, _engine, camera) => {
      getInitialPosition(
        minLatitude,
        minLongitude,
        maxLatitude,
        maxLongitude
      ).then(([E, H, N]) => {
        camera.position.x += E - offsetX;
        camera.position.y += H;
        camera.position.z += N - offsetZ;

        camera.target.x += E - offsetX;
        camera.target.y += H;
        camera.target.z += N - offsetZ;

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
        (sun.material as StandardMaterial).emissiveColor = new Color3(1, 1, 0);
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
    },
    [
      dataCoordinates,
      maxLatitude,
      maxLongitude,
      minLatitude,
      minLongitude,
      offsetX,
      offsetZ,
    ]
  );

  const onGenerateValues = React.useCallback(() => {
    setExporting(false);
    setGenerating(true);
    setExportedValues(undefined);
    const canvas = canvasRef.current;
    if (canvas) {
      const data = worldData(dataCoordinates, ZOOM);
      const {
        minLatitude,
        minLongitude,
        maxLatitude,
        maxLongitude,
        rawXmin,
        rawZmax,
        xmin,
        xmax,
        zmin,
        zmax,
        groundSubdivisions,
      } = data;

      const { scene } = createScene(canvas, false, {}, false, {});

      const { tiledGround, tilesURL } = createTiledGround(
        scene,
        xmin,
        zmin,
        xmax,
        zmax,
        groundSubdivisions,
        ZOOM,
        rawXmin,
        rawZmax
      );
      Promise.all([
        // getGroundHeights(tiledGround, offsetX, offsetZ),
        getTiles(tilesURL),
        // getBuildings(
        //   minLatitude,
        //   minLongitude,
        //   maxLatitude,
        //   maxLongitude,
        //   offsetX,
        //   offsetZ
        // ),
        // getTrees(
        //   minLatitude,
        //   minLongitude,
        //   maxLatitude,
        //   maxLongitude,
        //   offsetX,
        //   offsetZ
        // ),
        // getInitialPosition(
        //   minLatitude,
        //   minLongitude,
        //   maxLatitude,
        //   maxLongitude
        // ),
      ])
        // .then((data) => {
        //   console.log(data);
        // })
        .then(
          ([
            // terrainVertices,
            tiles,
            // buildingsData,
            // treesData,
            // initialPosition,
          ]) => {
            console.log(tiles);
            debugger;
            // setExportedValues({
            //   trees: treesData,
            //   buildings: buildingsData,
            //   terrain: {
            //     positions: terrainVertices,
            //     tiles,
            //   },
            //   worldData: data,
            //   initialPosition,
            // });
          }
        )
        .catch((e) => {
          console.log(e);
        })
        .finally(() => {
          setGenerating(false);
        });
    }
  }, [dataCoordinates]);

  const onExportValues = React.useCallback(() => {
    setExporting(true);

    if (exportedValues != null) {
      const {
        worldData,
        buildings: buildingsData,
        terrain: terrainData,
        trees: treesData,
        initialPosition,
      } = exportedValues;
      const { positions: terrainVertices, tiles } = terrainData;
      const zip = new JSZip();
      const terrain = zip.folder("terrain");

      if (terrain != null) {
        if (terrainVertices != null) {
          const data = Buffer.from(JSON.stringify(terrainVertices)).toString(
            "base64"
          );

          terrain.file("vertices.json", data, { base64: true });
        }

        const tilesFolder = terrain.folder("tiles");

        if (tilesFolder != null) {
          tiles.forEach((tile, i) => {
            tilesFolder.file(`${i}.png`, tile, { base64: true });
          });
        }
      }

      const buildings = zip.folder("buildings");
      if (buildings != null) {
        const data = Buffer.from(JSON.stringify(buildingsData)).toString(
          "base64"
        );
        buildings.file("buildings.json", data, { base64: true });
      }

      const trees = zip.folder("trees");
      if (trees != null) {
        const data = Buffer.from(JSON.stringify(treesData)).toString("base64");
        trees.file("trees.json", data, { base64: true });
      }

      const world = zip.folder("world");
      if (world != null) {
        world.file(
          "world.json",
          Buffer.from(JSON.stringify(worldData)).toString("base64"),
          { base64: true }
        );
        world.file(
          "initPosition.json",
          Buffer.from(JSON.stringify(initialPosition)).toString("base64"),
          { base64: true }
        );
      }

      zip
        .generateAsync({ type: "blob" })
        .then(function (content) {
          saveAs(content, "data.zip");
        })
        .then(() => setExporting(false))
        .catch((e) => {
          console.log(e);
        });
    }
  }, [exportedValues]);

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
      <h1>Generate data for Mimms</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto auto",
          gridTemplateRows: "auto auto auto",
        }}
      >
        <div
          style={{
            gridColumnStart: 2,
            gridColumnEnd: 2,
            gridRowStart: 1,
            gridRowEnd: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            alignItems: "center",
          }}
        >
          <p>max latitude</p>
          <input
            type="number"
            value={currentCoordinates.maxLatitude}
            onChange={(e) => {
              setCurrentCoordinates((o) => ({
                ...o,
                maxLatitude: Number(e.target.value),
              }));
              setExportedValues(undefined);
            }}
          />
        </div>
        <div
          style={{
            gridColumnStart: 1,
            gridColumnEnd: 1,
            gridRowStart: 2,
            gridRowEnd: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            alignItems: "center",
          }}
        >
          <p>min longitude</p>
          <input
            type="number"
            value={currentCoordinates.minLongitude}
            onChange={(e) =>
              setCurrentCoordinates((o) => ({
                ...o,
                minLongitude: Number(e.target.value),
              }))
            }
          />
        </div>
        <div
          style={{
            gridColumnStart: 3,
            gridColumnEnd: 3,
            gridRowStart: 2,
            gridRowEnd: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            alignItems: "center",
          }}
        >
          <p>max longitude</p>
          <input
            type="number"
            value={currentCoordinates.maxLongitude}
            onChange={(e) =>
              setCurrentCoordinates((o) => ({
                ...o,
                maxLongitude: Number(e.target.value),
              }))
            }
          />
        </div>
        <div
          style={{
            gridColumnStart: 2,
            gridColumnEnd: 2,
            gridRowStart: 3,
            gridRowEnd: 3,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            alignItems: "center",
          }}
        >
          <p>min latitude</p>
          <input
            type="number"
            value={currentCoordinates.minLatitude}
            onChange={(e) =>
              setCurrentCoordinates((o) => ({
                ...o,
                minLatitude: Number(e.target.value),
              }))
            }
          />
        </div>
      </div>

      <br />
      <button
        onClick={() => {
          setDataCoordinates(currentCoordinates);
        }}
      >
        Set coordinates
      </button>

      <button disabled={generating} onClick={onGenerateValues}>
        Generate values
      </button>

      {!generating && exportedValues != null && (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center",
          }}
        >
          <button disabled={exporting} onClick={onExportValues}>
            Export data
          </button>

          <button
            onClick={() => {
              setDisplayScene((o) => !o);
            }}
          >
            {displayScene ? "Hide scene" : "Show scene"}
          </button>
        </div>
      )}
      {/* <div {...containerProps}>
        <canvas ref={canvasRef} style={canvasProps} />
      </div> */}
      <canvas ref={canvasRef} style={{ visibility: "hidden" }} />
      {displayScene && exportedValues && (
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
              playerPosition={playerPosition}
              setPlayerPosition={setPlayerPosition}
              visionPolygon={visionPolygon}
              setVisionPolygon={setVisionPoligon}
            />
          )}
        </ReactScene>
      )}
    </div>
  );
}
