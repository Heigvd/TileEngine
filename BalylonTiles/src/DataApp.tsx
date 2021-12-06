import {
  Vector3,
  MeshBuilder,
  Color3,
  Scene,
  Mesh,
  VertexBuffer,
  FloatArray,
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
import { Building, useBuildings } from "./hooks/useBuildings";
import { Buffer } from "buffer";
import { OSMGround } from "./Components/OSMGround";
import { ReactSceneProps, ReactScene } from "./Components/ReactScene";
import { useHeights } from "./hooks/useHeights";
import { Tree, useTrees } from "./hooks/useTrees";
import { debugBoundaries } from "./helpers/debugging";
import { worldData } from "./helpers/worldData";
import { TERRAIN_WIDTH, ZOOM } from "./config";
import JSZip from "jszip";
import saveAs from "file-saver";
import { Buildings } from "./Components/Buildings";
import { Trees } from "./Components/Trees";

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
  trees: "loading" | Tree[];
  buildings: "loading" | Building[];
  terrain: {
    terrainVertices?: "loading" | number[];
    terrainUV?: "loading" | FloatArray;
    tiles?: "loading" | Blob[];
  };
}

export default function App() {
  const [currentCoordinates, setCurrentCoordinates] =
    React.useState<DataCoordinates>(
      //HEIG-VD
      {
        minLongitude: 6.643,
        maxLongitude: 6.654,
        minLatitude: 46.777,
        maxLatitude: 46.784,
      }
      //ZERMATT
      // {
      //   minLongitude: 7.72,
      //   maxLongitude: 7.7674,
      //   minLatitude: 46.01,
      //   maxLatitude: 46.029,
      // }
      //CAVANDONE
      // {
      //   minLongitude: 8.5113,
      //   maxLongitude: 8.52738,
      //   minLatitude: 45.94065,
      //   maxLatitude: 45.94746,
      // }
    );

  const [dataCoordinates, setDataCoordinates] =
    React.useState<DataCoordinates>(currentCoordinates);

  const [exportValues, setExportValues] = React.useState<ExportedValues>({
    trees: [],
    terrain: {},
    buildings: [],
  });

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

  const buildingsData = useBuildings(
    minLatitude,
    minLongitude,
    maxLatitude,
    maxLongitude
  );

  const treesData = useTrees(
    minLatitude,
    minLongitude,
    maxLatitude,
    maxLongitude
  );

  // const { heights, points } = useHeights(
  //   minLatitude,
  //   minLongitude,
  //   maxLatitude,
  //   maxLongitude,
  //   ZOOM,
  //   xBounds,
  //   zBounds,
  //   rawXdelta,
  //   rawZdelta,
  //   rawXmin,
  //   rawZmax
  // );

  const onSceneReady = React.useCallback<
    NonNullable<ReactSceneProps["onSceneReady"]>
  >(
    (_canvas, scene, _engine, camera) => {
      const initPos = wgs84ToLV95(
        (maxLatitude + minLatitude) / 2,
        (maxLongitude + minLongitude) / 2
      );

      getHeight(initPos.E, initPos.N).then((height) => {
        camera.setPosition(new Vector3(initPos.E, height, initPos.N));
        camera.setTarget(new Vector3(initPos.E, height, initPos.N));
        camera.alpha = (Math.PI * 3) / 2;
        camera.radius = 10;
      });

      debugBoundaries(scene, dataCoordinates, {
        minLatitude,
        minLongitude,
        maxLatitude,
        maxLongitude,
      });
    },
    [dataCoordinates, maxLatitude, maxLongitude, minLatitude, minLongitude]
  );

  const onOSMGroundLoad = React.useCallback(
    (ground: Mesh, tilesURL: string[]) => {
      setExportValues({
        trees: [],
        buildings: [],
        terrain: {
          terrainVertices: "loading",
          terrainUV: "loading",
          tiles: "loading",
        },
      });

      const vertices = ground.getVerticesData(VertexBuffer.PositionKind);
      const uv = ground.getVerticesData(VertexBuffer.UVKind);

      if (uv != null) {
        setExportValues((o) => ({
          ...o,
          terrain: { ...o.terrain, terrainUV: uv },
        }));
      }

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
              positions[i][0],
              height,
              // 0,
              positions[i][1],
            ])
          )
          .then((data) => {
            const flatValues = data.flatMap((d) => d);
            ground.setVerticesData(VertexBuffer.PositionKind, flatValues);
            setExportValues((o) => ({
              ...o,
              terrain: { ...o.terrain, terrainVertices: flatValues },
            }));
          })
          .catch((e) => {
            // eslint-disable-next-line no-alert
            alert(e);
          });

        Promise.all(
          tilesURL.map((tileUrl) => fetch(tileUrl).then((res) => res.blob()))
        )
          .then((blobs) => {
            setExportValues((o) => ({
              ...o,
              terrain: { ...o.terrain, tiles: blobs },
            }));
          })

          .catch((e) => {
            // eslint-disable-next-line no-alert
            alert(e);
          });
      }
    },
    [rawXdelta, rawXmin, rawZdelta, rawZmax, xBounds, zBounds]
  );

  React.useEffect(() => {
    setExportValues((o) => ({ ...o, buildings: buildingsData }));
  }, [buildingsData]);

  React.useEffect(() => {
    setExportValues((o) => ({ ...o, trees: treesData }));
  }, [treesData]);

  console.log(buildingsData[0]);
  console.log(treesData[0]);

  const exportReady =
    Object.values(exportValues.terrain).filter(
      (v) => v === null || v === "loading"
    ).length === 0;
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
          setExportValues({
            terrain: {
              terrainUV: "loading",
              terrainVertices: "loading",
              tiles: "loading",
            },
            buildings: "loading",
            trees: "loading",
          });

          setDataCoordinates(currentCoordinates);
        }}
      >
        Gather data
      </button>
      <br />

      <button
        disabled={!exportReady}
        onClick={() => {
          const { terrainUV, terrainVertices, tiles } = exportValues.terrain;

          const zip = new JSZip();
          const terrain = zip.folder("terrain");

          if (terrain != null) {
            if (terrainVertices != null && terrainVertices !== "loading") {
              const data = Buffer.from(
                JSON.stringify(terrainVertices)
              ).toString("base64");

              terrain.file("vertices.json", data, { base64: true });
            }

            if (terrainUV != null && terrainUV !== "loading") {
              const data = Buffer.from(JSON.stringify(terrainUV)).toString(
                "base64"
              );

              terrain.file("uv.json", data, { base64: true });
            }

            const tilesFolder = terrain.folder("tiles");

            if (tilesFolder != null && tiles != null && tiles !== "loading") {
              tiles.forEach((tile, i) => {
                tilesFolder.file(`${i}.png`, tile, { base64: true });
              });
            }
          }

          const buildings = zip.folder("buildings");
          if (buildings != null) {
            const data = Buffer.from(
              JSON.stringify(exportValues.buildings)
            ).toString("base64");

            buildings.file("buildings.json", data, { base64: true });
          }

          const trees = zip.folder("trees");
          if (trees != null) {
            const data = Buffer.from(
              JSON.stringify(exportValues.buildings)
            ).toString("base64");

            trees.file("trees.json", data, { base64: true });
          }

          zip.generateAsync({ type: "blob" }).then(function (content) {
            saveAs(content, "data.zip");
          });
        }}
      >
        {exportReady ? "Export values" : "Loading"}
      </button>

      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />

      <ReactScene
        containerProps={containerProps}
        onSceneReady={onSceneReady}
        canvasProps={canvasProps}
        // onRender={onRender}
      >
        {(_canvas, scene, _engine, _camera, _light) => (
          <>
            {/* <Player scene={scene} position={playerPosition} /> */}
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
              onLoad={onOSMGroundLoad}
            />

            {/* <Vision
              scene={scene}
              buildingsData={buildingsData}
              playerPosition={playerPosition}
            /> */}
            <Buildings scene={scene} buildingsData={buildingsData} />
            <Trees scene={scene} treesData={treesData} />
          </>
        )}
      </ReactScene>
    </div>
  );
}
