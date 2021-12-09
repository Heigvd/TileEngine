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
import { OSMGround } from "./Components/OSMGround";
import { ReactSceneProps, ReactScene } from "./Components/ReactScene";
import { useHeights } from "./hooks/useHeights";
import { useTrees } from "./hooks/useTrees";

const zoom = 19;

//HEIG-VD
// const rawMinLongitude = 6.643;
// const rawMaxLongitude = 6.653;
// const rawMinLatitude = 46.779;
// const rawMaxLatitude = 46.784;

//Yverdon-Les-Bains
// const rawMinLongitude = 6.63;
// const rawMaxLongitude = 6.66;
// const rawMinLatitude = 46.77;
// const rawMaxLatitude = 46.79;

//Aigle
// const rawMinLongitude = 6.95075;
// const rawMaxLongitude = 6.97446;
// const rawMinLatitude = 46.30826;
// const rawMaxLatitude = 46.31767;

//HUG
// const rawMinLongitude = 6.143;
// const rawMaxLongitude = 6.154;
// const rawMinLatitude = 46.18948;
// const rawMaxLatitude = 46.196;

//Laurent
const rawMinLongitude = 6.30521;
const rawMaxLongitude = 6.31707;
const rawMinLatitude = 46.43186;
const rawMaxLatitude = 46.43656;

//Zermatt
// const rawMinLongitude = 7.72;
// const rawMaxLongitude = 7.7674;
// const rawMinLatitude = 46.01;
// const rawMaxLatitude = 46.029;

//46° 02' 38.87 8° 43' 49.79
// 46.044131, 8.730497
//460441.31, 87304.97
// const test = wgs84ToLV95(46.044131, 8.730497);
// console.log(test);
// console.log(lv95ToWGS84(test.E, test.N, test.h));
//wgs84ToLV95(46, 8);

// const { X: tileXmin, Y: tileZmin } = latLon2tile(
//   rawMinLatitude,
//   rawMinLongitude,
//   zoom
// );
// const { X: tileXmax, Y: tileZmax } = latLon2tile(
//   rawMaxLatitude,
//   rawMaxLongitude,
//   zoom
// );

const minTile = latLon2pixel(rawMinLatitude, rawMinLongitude, zoom);
const tileXmin = Math.floor(minTile.X) + 1;
const tileZmin = Math.floor(minTile.Y);
const maxTile = latLon2pixel(rawMaxLatitude, rawMaxLongitude, zoom);
const tileXmax = Math.floor(maxTile.X);
const tileZmax = Math.floor(maxTile.Y) + 1;

const { lon: minLongitude, lat: minLatitude } = tileToLonLat(
  tileXmin,
  tileZmin,
  zoom
);
const { lon: maxLongitude, lat: maxLatitude } = tileToLonLat(
  tileXmax,
  tileZmax,
  zoom
);

const rawXmin = Math.min(tileXmin, tileXmax);
const rawXmax = Math.max(tileXmin, tileXmax);
const rawZmin = Math.min(tileZmin, tileZmax);
const rawZmax = Math.max(tileZmin, tileZmax);
const rawXdelta = rawXmax - rawXmin;
const rawZdelta = rawZmax - rawZmin;
const zxRatio = rawZdelta / rawXdelta;

const xBounds = 200;
const zBounds = 200 * zxRatio;

const xmin = -xBounds / 2;
const xmax = xBounds / 2;
const zmin = -zBounds / 2;
const zmax = zBounds / 2;

const groundSubdivisions = {
  h: rawZdelta,
  w: rawXdelta,
};

const rawA = wgs84ToXY(
  rawMinLatitude,
  rawMinLongitude,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);
const rawB = wgs84ToXY(
  rawMinLatitude,
  rawMaxLongitude,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);
const rawC = wgs84ToXY(
  rawMaxLatitude,
  rawMaxLongitude,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);
const rawD = wgs84ToXY(
  rawMaxLatitude,
  rawMinLongitude,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);

const A = wgs84ToXY(
  minLatitude,
  minLongitude,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);
const B = wgs84ToXY(
  minLatitude,
  maxLongitude,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);
const C = wgs84ToXY(
  maxLatitude,
  maxLongitude,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);
const D = wgs84ToXY(
  maxLatitude,
  minLongitude,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);

const Aprim = testCoordinateTranslation(
  minLatitude,
  minLongitude,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);
const Bprim = testCoordinateTranslation(
  minLatitude,
  maxLongitude,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);
const Cprim = testCoordinateTranslation(
  maxLatitude,
  maxLongitude,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);
const Dprim = testCoordinateTranslation(
  maxLatitude,
  minLongitude,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);

const realA = wgs84ToXY(
  46.7789436,
  6.6426456,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);
const realB = wgs84ToXY(
  46.78267762272321,
  6.642692254818578,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);
const realC = wgs84ToXY(
  46.782688807066144,
  6.65289167421224,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);
const realD = wgs84ToXY(
  46.77884774727607,
  6.652771445273231,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);

const batA = wgs84ToXY(
  46.7799578,
  6.6489357,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);
const batB = wgs84ToXY(
  46.7799192,
  6.6490839,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);
const batC = wgs84ToXY(
  46.7798541,
  6.6490477,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);
const batD = wgs84ToXY(
  46.7798927,
  6.6488995,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);

function debugBoundaries(scene: Scene) {
  const boundaries = MeshBuilder.CreateLines(
    "lines",
    {
      points: [
        new Vector3(A.X, 0, A.Y),
        new Vector3(B.X, 0, B.Y),
        new Vector3(C.X, 0, C.Y),
        new Vector3(D.X, 0, D.Y),
        new Vector3(A.X, 0, A.Y),
      ],
      updatable: true,
    },
    scene
  );
  boundaries.color = new Color3(0, 1, 0);

  const transBoundaries = MeshBuilder.CreateLines(
    "lines",
    {
      points: [
        new Vector3(Aprim.X, 0, Aprim.Y),
        new Vector3(Bprim.X, 0, Bprim.Y),
        new Vector3(Cprim.X, 0, Cprim.Y),
        new Vector3(Dprim.X, 0, Dprim.Y),
        new Vector3(Aprim.X, 0, Aprim.Y),
      ],
      updatable: true,
    },
    scene
  );
  transBoundaries.color = new Color3(1, 1, 0);

  const rawBoundaries = MeshBuilder.CreateLines(
    "lines",
    {
      points: [
        new Vector3(rawA.X, 0, rawA.Y),
        new Vector3(rawB.X, 0, rawB.Y),
        new Vector3(rawC.X, 0, rawC.Y),
        new Vector3(rawD.X, 0, rawD.Y),
        new Vector3(rawA.X, 0, rawA.Y),
      ],
      updatable: true,
    },
    scene
  );
  rawBoundaries.color = new Color3(1, 0, 0);

  const realBoundaries = MeshBuilder.CreateLines(
    "lines",
    {
      points: [
        new Vector3(realA.X, 0, realA.Y),
        new Vector3(realB.X, 0, realB.Y),
        new Vector3(realC.X, 0, realC.Y),
        new Vector3(realD.X, 0, realD.Y),
        new Vector3(realA.X, 0, realA.Y),
      ],
      updatable: true,
    },
    scene
  );
  realBoundaries.color = new Color3(0, 0, 1);
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

const initPos = wgs84ToXY(
  (maxLatitude + minLatitude) / 2,
  (maxLongitude + minLongitude) / 2,
  zoom,
  xBounds,
  zBounds,
  rawXdelta,
  rawZdelta,
  rawXmin,
  rawZmax
);

console.log(initPos);

export default function App() {
  const [playerPosition, setPlayerPosition] = React.useState<Vector3>(
    new Vector3(0, 0.3, 0)
  );

  const buildingsData = useBuildings(
    minLatitude,
    minLongitude,
    maxLatitude,
    maxLongitude,
    0,
    0,
    zoom
  );

  const treesData = useTrees(
    minLatitude,
    minLongitude,
    maxLatitude,
    maxLongitude,
    0,
    0
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
    zoom,
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
  >((_canvas, scene, _engine, _camera) => {
    // _camera.setPosition(new Vector3(initPos.X, 0, initPos.Y));
    // _camera.setTarget(new Vector3(initPos.X, 0, initPos.Y));
    _camera.rotation = new Vector3(0, Math.PI / 2, 0);

    debugBoundaries(scene);

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
            "middle mouse click: " + vector.x + "," + vector.y + "," + vector.z
          );
        }
      }
    };
  }, []);

  const onOSMGroundLoad = React.useCallback((ground: Mesh) => {
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
          zoom,
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
            positions[i][2],
            // Number(_d.height) / 2,
            0,
            positions[i][3],
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

      const reflattedVertices = verices3D.flatMap((d) => d);

      // ground.setVerticesData(VertexBuffer.PositionKind, reflattedVertices);

      console.log(vertices);
      console.log(reflattedVertices);
      console.log(
        JSON.stringify(vertices) === JSON.stringify(reflattedVertices)
      );
    }

    // const realXYValues = position3.map((pos) => {
    //   const { latitude, longitude } = xyToWGS84(
    //     pos[0],
    //     pos[2],
    //     zoom,
    //     xBounds,
    //     zBounds,
    //     rawXdelta,
    //     rawZdelta,
    //     rawXmin,
    //     rawZmax
    //   );

    //   const { E, N } = wgs84ToLV95(latitude, longitude);

    //   return [E, N];
    // });

    // const encoded = Buffer.from(JSON.stringify(realXYValues)).toString(
    //   "base64"
    // );
    // console.log(realXYValues);

    // (
    //   document.getElementById("testlink") as HTMLAnchorElement
    // ).href = `data:application/json;charset=utf-8;base64,${encoded}`;
  }, []);

  const onRender = React.useCallback(() => {
    // console.log("RERENDER");
  }, []);

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
      {/* <h1>Babylon tileworld</h1>
      <a id="testlink">E N map coordinates</a>
      <p>Import vertex file</p>
      <input id="vertexfileinput" type="text" value="laurent" />
      <button
        onClick={() => {
          const fileName = (
            document.getElementById("vertexfileinput") as HTMLInputElement
          ).value;

          fetch("./data/vertexes/" + fileName + ".json")
            .then((response) => response.json())
            .then((positions: [number, number][]) => {
              // debugger;
              // let positionAndHeights: number[][] = [];

              Promise.all(
                positions.map((pos) =>
                  fetch(
                    `https://api3.geo.admin.ch/rest/services/height?easting=${pos[0]}&northing=${pos[1]}`
                  ).then((response) => response.json())
                )
              )
                .then((data: { height: string }[]) =>
                  data.map((d, i) => [
                    positions[i][0],
                    Number(d.height),
                    positions[i][1],
                  ])
                )
                .then((data) => {
                  console.log(data);
                  debugger;
                })
                .catch((e) => {
                  console.log(e);
                  debugger;
                });
              // const data = JSON.parse(file);
            });
        }}
      >
        Import
      </button> */}
      <ReactScene
        containerProps={containerProps}
        onSceneReady={onSceneReady}
        canvasProps={canvasProps}
        onRender={onRender}
      >
        {(_canvas, _scene, _engine, _camera, _light) => (
          <>
            {/* <Player scene={scene} position={playerPosition} /> */}
            {/* <OSMGround
              // heights={heights}
              scene={scene}
              zoom={zoom}
              xmin={xmin}
              xmax={xmax}
              zmin={zmin}
              zmax={zmax}
              xFirstTile={rawXmin}
              zLastTile={rawZmax}
              subdivisions={groundSubdivisions}
              onLoad={onOSMGroundLoad}
            /> */}

            {/* <Vision
              scene={scene}
              buildingsData={buildingsData}
              playerPosition={playerPosition}
            /> */}
            {/* <Buildings scene={scene} buildingsData={buildingsData} /> */}
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
