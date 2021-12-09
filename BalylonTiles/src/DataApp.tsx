import {
  Vector3,
  MeshBuilder,
  Color3,
  Scene,
  Mesh,
  VertexBuffer,
  FloatArray,
  DirectionalLight,
  ShadowGenerator,
  PointLight,
  StandardMaterial,
  MultiMaterial,
  SubMesh,
  ArcRotateCamera,
} from "@babylonjs/core";
import * as React from "react";
import {
  latLon2pixel,
  testCoordinateTranslation,
  tileToLonLat,
  wgs84ToXY,
  wgs84ToLV95,
  xyToWGS84,
  getHeight,
  // wgs84ToLV95Proj,
} from "./helpers/utils";
import { Building, getBuildings, useBuildings } from "./hooks/useBuildings";
import { Buffer } from "buffer";
import { defaultPrecision, OSMGround } from "./Components/OSMGround2";
import { ReactSceneProps, ReactScene } from "./Components/ReactScene";
import { useHeights } from "./hooks/useHeights";
import { getTrees, Tree, useTrees } from "./hooks/useTrees";
import { debugBoundaries } from "./helpers/debugging";
import { worldData } from "./helpers/worldData";
import { TERRAIN_WIDTH, ZOOM } from "./config";
import JSZip from "jszip";
import saveAs from "file-saver";
import { Buildings } from "./Components/Buildings";
import { Trees } from "./Components/Trees";
import {
  createScene,
  createTiledGround,
  getGroundHeights,
  getTiles,
} from "./helpers/babylonHelpers";
import { Terrain, TiledGround } from "./Components/TiledGround2";

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

interface ExportedValues {
  trees: Tree[];
  buildings: Building[];
  terrain: Terrain;
}

export default function App() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [exporting, setExporting] = React.useState(false);
  const [displayScene, setDisplayScene] = React.useState(false);
  const [exportedValues, setExportedValues] = React.useState<ExportedValues>();

  const [currentCoordinates, setCurrentCoordinates] =
    React.useState<DataCoordinates>(
      //HEIG-VD
      {
        minLongitude: 6.643,
        maxLongitude: 6.654,
        minLatitude: 46.777,
        maxLatitude: 46.784,
      }
      // ZERMATT
      // {
      //   minLongitude: 7.72,
      //   maxLongitude: 7.7674,
      //   minLatitude: 46.01,
      //   maxLatitude: 46.029,
      // }
      // CAVANDONE
      // {
      //   minLongitude: 8.5113,
      //   maxLongitude: 8.52738,
      //   minLatitude: 45.94065,
      //   maxLatitude: 45.94746,
      // }
      //CREUX-DU-VAN
      // {
      //   minLongitude: 6.6991,
      //   maxLongitude: 6.7465,
      //   minLatitude: 46.9247,
      //   maxLatitude: 46.9437,
      // }
    );

  const [dataCoordinates, setDataCoordinates] =
    React.useState<DataCoordinates>(currentCoordinates);

  ///////////////////////////// OFFSETS
  const { E: minE, N: minN } = wgs84ToLV95(
    dataCoordinates.minLatitude,
    dataCoordinates.minLongitude
  );
  const { E: maxE, N: maxN } = wgs84ToLV95(
    dataCoordinates.maxLatitude,
    dataCoordinates.maxLongitude
  );

  const offsetX = (maxE + minE) / 2;
  const offsetY = (maxN + minN) / 2;
  ///////////////////////////// OFFSETS

  const {
    minLatitude,
    minLongitude,
    maxLatitude,
    maxLongitude,
    xBounds,
    zBounds,
    rawXdelta,
    rawZdelta,
    rawXmin,
    rawZmax,
    xmin,
    xmax,
    zmin,
    zmax,
    groundSubdivisions,
  } = React.useMemo(
    () => worldData(dataCoordinates, ZOOM, TERRAIN_WIDTH),
    [dataCoordinates]
  );

  const onSceneReady = React.useCallback<
    NonNullable<ReactSceneProps["onSceneReady"]>
  >(
    (_canvas, scene, _engine, camera) => {
      const initPos = wgs84ToLV95(
        (maxLatitude + minLatitude) / 2,
        (maxLongitude + minLongitude) / 2
      );

      getHeight(initPos.E, initPos.N).then((height) => {
        camera.position.x += initPos.E - offsetX;
        camera.position.y += height;
        camera.position.z += initPos.N - offsetY;

        camera.target.x += initPos.E - offsetX;
        camera.target.y += height;
        camera.target.z += initPos.N - offsetY;

        // camera.setPosition(new Vector3(initPos.E, height, initPos.N));
        // camera.setTarget(new Vector3(initPos.E, height, initPos.N));
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
      offsetY,
    ]
  );

  const onExportValues = React.useCallback(() => {
    setExporting(true);
    setExportedValues(undefined);
    const canvas = canvasRef.current;
    if (canvas) {
      const {
        minLatitude,
        minLongitude,
        maxLatitude,
        maxLongitude,
        xBounds,
        zBounds,
        rawXdelta,
        rawZdelta,
        rawXmin,
        rawZmax,
        xmin,
        xmax,
        zmin,
        zmax,
        groundSubdivisions,
      } = worldData(dataCoordinates, ZOOM, TERRAIN_WIDTH);

      const { scene } = createScene(canvas, false, {}, false, {});

      const { tiledGround, tilesURL } = createTiledGround(
        scene,
        xmin,
        xmax,
        zmin,
        zmax,
        groundSubdivisions,
        ZOOM,
        rawXmin,
        rawZmax
      );

      const terrainUV = tiledGround.getVerticesData(VertexBuffer.UVKind);

      Promise.all([
        getGroundHeights(
          tiledGround,
          xBounds,
          zBounds,
          rawXdelta,
          rawZdelta,
          rawXmin,
          rawZmax,
          offsetX,
          offsetY
        ),
        getTiles(tilesURL),
        getBuildings(
          minLatitude,
          minLongitude,
          maxLatitude,
          maxLongitude,
          offsetX,
          offsetY
        ),
        getTrees(
          minLatitude,
          minLongitude,
          maxLatitude,
          maxLongitude,
          offsetX,
          offsetY
        ),
      ])
        .then(([terrainVertices, tiles, buildingsData, treesData]) => {
          const zip = new JSZip();
          const terrain = zip.folder("terrain");

          if (terrain != null) {
            if (terrainVertices != null) {
              const data = Buffer.from(
                JSON.stringify(terrainVertices)
              ).toString("base64");

              terrain.file("vertices.json", data, { base64: true });
            }

            if (terrainUV != null) {
              const data = Buffer.from(JSON.stringify(terrainUV)).toString(
                "base64"
              );

              terrain.file("uv.json", data, { base64: true });
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
            const data = Buffer.from(JSON.stringify(treesData)).toString(
              "base64"
            );

            trees.file("trees.json", data, { base64: true });
          }

          zip.generateAsync({ type: "blob" }).then(function (content) {
            saveAs(content, "data.zip");
          });

          if (terrainUV != null) {
            setExportedValues({
              trees: treesData,
              buildings: buildingsData,
              terrain: {
                terrainUV,
                terrainVertices,
                tiles,
              },
            });
          }
        })
        .catch((e) => {
          console.log(e);
          debugger;
        })
        .finally(() => {
          setExporting(false);
        });
    }
  }, [dataCoordinates, offsetX, offsetY]);

  const onOSMGroundLoad = React.useCallback(
    (ground: Mesh) => {
      const vertices = ground.getVerticesData(VertexBuffer.PositionKind);

      if (vertices) {
        const verices3D: number[][] = [];

        for (let i = 0; i < vertices.length / 3; i++) {
          verices3D.push([vertices[i * 3], Math.random(), vertices[i * 3 + 2]]);
        }

        const positions = verices3D.map((pos) => {
          const { latitude, longitude } = xyToWGS84(
            pos[0],
            pos[2],
            ZOOM,
            xBounds,
            zBounds,
            rawXdelta,
            rawZdelta,
            rawXmin,
            rawZmax
          );

          const { E, N } = wgs84ToLV95(latitude, longitude);

          return [E, N, pos[0], pos[2]];
        });

        Promise.all(positions.map((pos) => getHeight(pos[0], pos[1])))
          .then((data) =>
            data.map((height, i) => [
              positions[i][0] - offsetX,
              height,
              // 0,
              positions[i][1] - offsetY,
            ])
          )
          .then((data) => {
            const flatValues = data.flatMap((d) => d);
            ground.setVerticesData(VertexBuffer.PositionKind, flatValues);
          })
          .catch((e) => {
            // eslint-disable-next-line no-alert
            alert(e);
          });
      }
    },
    [offsetX, offsetY, rawXdelta, rawXmin, rawZdelta, rawZmax, xBounds, zBounds]
  );

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
            onChange={(e) =>
              setCurrentCoordinates((o) => ({
                ...o,
                maxLatitude: Number(e.target.value),
              }))
            }
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
        Gather data
      </button>

      <button disabled={exporting} onClick={onExportValues}>
        Export values
      </button>

      <button
        disabled={exportedValues == null}
        onClick={() => {
          setDisplayScene((o) => !o);
        }}
      >
        {displayScene ? "Hide scene" : "Show scene"}
      </button>

      <canvas ref={canvasRef} style={{ visibility: "hidden" }} />

      {displayScene && exportedValues && (
        <ReactScene
          onSceneReady={onSceneReady}
          containerProps={containerProps}
          canvasProps={canvasProps}
        >
          {(_canvas, scene, _engine, _camera, _light) => (
            <>
              {/* <Player scene={scene} position={playerPosition} /> */}
              {/* <TiledGround
                scene={scene}
                zoom={ZOOM}
                xmin={xmin}
                xmax={xmax}
                zmin={zmin}
                zmax={zmax}
                terrainData={exportedValues.terrain}
                subdivisions={groundSubdivisions}
                onLoad={onOSMGroundLoad}
              /> */}

              <OSMGround
                scene={scene}
                zoom={ZOOM}
                xmin={xmin}
                xmax={xmax}
                zmin={zmin}
                zmax={zmax}
                xFirstTile={rawXmin}
                zLastTile={rawZmax}
                subdivisions={groundSubdivisions}
                terrainData={exportedValues.terrain}
                onLoad={onOSMGroundLoad}
              />

              {/* <Vision
              scene={scene}
              buildingsData={buildingsData}
              playerPosition={playerPosition}
            /> */}
              <Buildings
                scene={scene}
                buildingsData={exportedValues.buildings}
              />
              <Trees scene={scene} treesData={exportedValues.trees} />
            </>
          )}
        </ReactScene>
      )}
    </div>
  );
}
