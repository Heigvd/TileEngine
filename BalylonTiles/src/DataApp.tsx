import {
  Vector3,
  MeshBuilder,
  Color3,
  Scene,
  Mesh,
  VertexBuffer,
} from "@babylonjs/core";
import * as React from "react";
import {
  latLon2pixel,
  testCoordinateTranslation,
  tileToLonLat,
  wgs84ToXY,
  wgs84ToLV95,
  xyToWGS84,
  // wgs84ToLV95Proj,
} from "./helpers/utils";
import { useBuildings } from "./hooks/useBuildings";
import { Buffer } from "buffer";
import { OSMGround } from "./Components/OSMGround";
import { ReactSceneProps, ReactScene } from "./Components/ReactScene";
import { useHeights } from "./hooks/useHeights";
import { useTrees } from "./hooks/useTrees";
import { debugBoundaries } from "./helpers/debugging";
import { worldData } from "./helpers/worldData";
import { TERRAIN_WIDTH, ZOOM } from "./config";
import JSZip from "jszip";
import saveAs from "file-saver";
import { Buildings } from "./Components/Buildings";

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
  const [dataCoordinates, setDataCoordinates] = React.useState<DataCoordinates>(
    {
      minLongitude: 6.643,
      maxLongitude: 6.653,
      minLatitude: 46.779,
      maxLatitude: 46.784,
    }
  );

  const [realXYValues, setRealXYValues] = React.useState<
    number[][] | null | "loading"
  >(null);

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

  React.useEffect(() => {
    setRealXYValues("loading");
  }, [xmin, xmax, zmin, zmax, rawXmin, rawZmax, groundSubdivisions]);

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const [playerPosition, setPlayerPosition] = React.useState<Vector3>(
    new Vector3(0, 0.3, 0)
  );

  const buildingsData = useBuildings(
    minLatitude,
    minLongitude,
    maxLatitude,
    maxLongitude,
    ZOOM
  );

  const treesData = useTrees(
    minLatitude,
    minLongitude,
    maxLatitude,
    maxLongitude,
    ZOOM,
    xBounds,
    zBounds,
    rawXdelta,
    rawZdelta,
    rawXmin,
    rawZmax
  );

  // const testMinPoint = pixel2latLon(xmin, zmin, zoom);
  // const testMaxPoint = pixel2latLon(xmax, zmax, zoom);

  // const { heights, points } = useHeights(
  //   testMinPoint.latitude,
  //   testMinPoint.longitude,
  //   testMaxPoint.latitude,
  //   testMaxPoint.longitude,
  //   zoom,
  //   xBounds,
  //   zBounds,
  //   rawXdelta,
  //   rawZdelta,
  //   rawXmin,
  //   rawZmax
  // );

  // console.log({
  //   xmin,
  //   zmin,
  //   xmax,
  //   zmax,
  // });

  // const { lon: minLongitude, lat: minLatitude } = tileToLonLat(
  //   tileXmin,
  //   tileZmin,
  //   zoom
  // );

  // console.log({
  //   minLatitude,
  //   minLongitude,
  //   maxLatitude,
  //   maxLongitude,
  // });
  // console.log({
  //   minLatitude: testMinPoint.latitude,
  //   minLongitude: testMinPoint.longitude,
  //   maxLatitude: testMaxPoint.latitude,
  //   maxLongitude: testMaxPoint.longitude,
  // });

  const { heights, points } = useHeights(
    minLatitude,
    minLongitude,
    maxLatitude,
    maxLongitude,
    ZOOM,
    xBounds,
    zBounds,
    rawXdelta,
    rawZdelta,
    rawXmin,
    rawZmax
  );

  // if (playerPosition != null) {
  //   const buildingSegments = buildingsData
  //     .flatMap((building, buildingIndex) => {
  //       return building.points.map((point, i, points) => {
  //         const nextPointIndex = (i + 1) % points.length;
  //         const nextPoint = points[nextPointIndex];
  //         return {
  //           index: buildingIndex,
  //           initPoint: { x: point.x, y: point.y, z: point.z },
  //           endPoint: { x: nextPoint.x, y: nextPoint.y, z: nextPoint.z },
  //           angle: Math.atan2(
  //             point.z - playerPosition?.z,
  //             point.x - playerPosition?.x
  //           ),
  //           squareDistance: point.x * point.x + point.z * point.z,
  //         };
  //       });
  //     })
  //     .sort((a, b) => a.angle - b.angle);

  //   console.log(buildingSegments);
  // }

  const onSceneReady = React.useCallback<
    NonNullable<ReactSceneProps["onSceneReady"]>
  >(
    (_canvas, scene, _engine, _camera) => {
      const initPos = wgs84ToLV95(
        (maxLatitude + minLatitude) / 2,
        (maxLongitude + minLongitude) / 2
        // ZOOM,
        // xBounds,
        // zBounds,
        // rawXdelta,
        // rawZdelta,
        // rawXmin,
        // rawZmax
      );

      _camera.setPosition(new Vector3(initPos.E, 0, initPos.N));
      _camera.setTarget(new Vector3(initPos.E, 0, initPos.N));
      _camera.alpha = (Math.PI * 3) / 2;
      // _camera.rotation = new Vector3(Math.PI, 0, 0);

      debugBoundaries(
        scene,
        dataCoordinates,
        { minLatitude, minLongitude, maxLatitude, maxLongitude }
        // ZOOM,
        // xBounds,
        // zBounds,
        // rawXdelta,
        // rawZdelta,
        // rawXmin,
        // rawZmax
      );

      // Manage player position (Bad performance, should be done elsewhere )
      scene.onPointerDown = function (event, pickResult) {
        let vector: Vector3 = new Vector3();

        if (pickResult.pickedPoint) {
          //left mouse click
          if (event.button == 0) {
            vector = pickResult.pickedPoint;
            console.log(
              "left mouse click: " + vector.x + "," + vector.y + "," + vector.z
            );
            setPlayerPosition(new Vector3(vector.x, vector.y + 0.15, vector.z));
          }
          //right mouse click
          if (event.button == 2 && vector) {
            vector.x = pickResult.pickedPoint.x;
            vector.y = pickResult.pickedPoint.y;
            vector.z = pickResult.pickedPoint.z;
            console.log(
              "right mouse click: " + vector.x + "," + vector.y + "," + vector.z
            );
          }
          //Wheel button or middle button on mouse click
          if (event.button == 1) {
            vector["x"] = pickResult.pickedPoint["x"];
            vector["y"] = pickResult.pickedPoint["y"];
            vector["z"] = pickResult.pickedPoint["z"];
            console.log(
              "middle mouse click: " +
                vector.x +
                "," +
                vector.y +
                "," +
                vector.z
            );
          }
        }
      };
    },
    [dataCoordinates, rawXdelta, rawXmin, rawZdelta, rawZmax, xBounds, zBounds]
  );

  const onOSMGroundLoad = React.useCallback(
    (ground: Mesh) => {
      setRealXYValues("loading");

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

        Promise.all(
          positions.map((pos) =>
            fetch(
              `https://api3.geo.admin.ch/rest/services/height?easting=${pos[0]}&northing=${pos[1]}`
            ).then((response) => response.json())
          )
        )
          .then((data: { height: string }[]) =>
            data.map((_d, i) => [
              positions[i][0],
              //Number(_d.height),
              0,
              positions[i][1],
            ])
          )
          .then((data) => {
            ground.setVerticesData(
              VertexBuffer.PositionKind,
              data.flatMap((d) => d)
            );
          })
          .catch((e) => {
            console.log(e);
            debugger;
          });
      }
    },
    [rawXdelta, rawXmin, rawZdelta, rawZmax, xBounds, zBounds]
  );

  const onRender = React.useCallback(() => {
    // console.log("RERENDER");
  }, []);

  //https://playground.babylonjs.com/#95PXRY#240

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
            value={dataCoordinates.maxLatitude}
            onChange={(e) =>
              setDataCoordinates((o) => ({
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
            value={dataCoordinates.minLongitude}
            onChange={(e) =>
              setDataCoordinates((o) => ({
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
            value={dataCoordinates.maxLongitude}
            onChange={(e) =>
              setDataCoordinates((o) => ({
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
            value={dataCoordinates.minLatitude}
            onChange={(e) =>
              setDataCoordinates((o) => ({
                ...o,
                minLatitude: Number(e.target.value),
              }))
            }
          />
        </div>
      </div>

      <button
        onClick={() => {
          if (realXYValues != null && realXYValues !== "loading") {
            const zip = new JSZip();
            const data = zip.folder("data");
            if (data != null) {
              const terrainData = Buffer.from(
                JSON.stringify(realXYValues)
              ).toString("base64");

              data.file("terrain.json", terrainData, { base64: true });
              zip.generateAsync({ type: "blob" }).then(function (content) {
                // see FileSaver.js
                saveAs(content, "example.zip");
              });
            }
          }
        }}
      >
        {realXYValues === "loading" ? "Loading..." : "Save data"}
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
        onRender={onRender}
      >
        {(_canvas, scene, _engine, _camera, _light) => (
          <>
            {/* <Player scene={scene} position={playerPosition} /> */}
            <OSMGround
              // heights={heights}
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
            {/* {heights.map((height, _i, _heights) => (
              <DebugSphere
                key={JSON.stringify(height)}
                scene={scene}
                x={height.x}
                y={height.y}
                z={height.z}
                // color={new Color3(i / heights.length, 0, 0)}
              />
            ))} */}
            {/* {points.map((point, _i) => {
              {
                // console.log(point);
                return (
                  <DebugSphere
                    key={JSON.stringify(point) + "yo"}
                    scene={scene}
                    x={point.x}
                    y={point.y}
                    // z={point._z}
                    z={point.z}
                    color={Color3.Red()}
                  />
                );
              }
            })} */}
            {/* <Heightmap
              scene={scene}
              heights={heights}
              zoom={zoom}
              xFirstTile={rawXmin}
              zLastTile={rawZmax}
              subdivisions={groundSubdivisions}
            /> */}
            {/* <Trees scene={scene} treesData={treesData} /> */}
            {/* <DebugSphere
              scene={scene}
              x={A.X}
              z={A.Z}
              color={new Color3(1, 0, 0)}
            />
            <DebugSphere
              scene={scene}
              x={B.X}
              z={B.Z}
              color={new Color3(0, 1, 0)}
            />
            <DebugSphere
              scene={scene}
              x={C.X}
              z={C.Z}
              color={new Color3(0, 0, 1)}
            />
            <DebugSphere
              scene={scene}
              x={D.X}
              z={D.Z}
              color={new Color3(1, 1, 0)}
            />
            <DebugSphere scene={scene} x={batA.X} z={batA.Z} />
            <DebugSphere scene={scene} x={batB.X} z={batB.Z} />
            <DebugSphere scene={scene} x={batC.X} z={batC.Z} />
            <DebugSphere scene={scene} x={batD.X} z={batD.Z} /> */}
          </>
        )}
      </ReactScene>
    </div>
  );
}
