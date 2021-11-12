import {
  Vector3,
  MeshBuilder,
  Color3,
  Color4,
  StandardMaterial,
  Scene,
} from "@babylonjs/core";
import * as React from "react";
import { Buildings } from "./Buildings";
import { OSMGround } from "./OSMGround";
import { ReactScene, ReactSceneProps } from "./ReactScene";
import { DebugSphere } from "./DebugSphere";
import { latLon2tile, translateOSMToPixel } from "./utils";
import { Player } from "./Player";

function tile2long(x: number, z: number) {
  return (x / Math.pow(2, z)) * 360 - 180;
}
function tile2lat(y: number, z: number) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function tileToLonLat(x: number, y: number, zoom: number) {
  return {
    lon: tile2long(x, zoom),
    lat: tile2lat(y, zoom),
  };
}

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
const rawMinLongitude = 6.95075;
const rawMaxLongitude = 6.97446;
const rawMinLatitude = 46.30826;
const rawMaxLatitude = 46.31767;

const { X: tileXmin, Z: tileZmin } = latLon2tile(
  rawMinLatitude,
  rawMinLongitude,
  zoom
);
const { X: tileXmax, Z: tileZmax } = latLon2tile(
  rawMaxLatitude,
  rawMaxLongitude,
  zoom
);
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

console.log(minLongitude, minLatitude, maxLongitude, maxLatitude);

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

const rawA = translateOSMToPixel(
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
const rawB = translateOSMToPixel(
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
const rawC = translateOSMToPixel(
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
const rawD = translateOSMToPixel(
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

const A = translateOSMToPixel(
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
const B = translateOSMToPixel(
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
const C = translateOSMToPixel(
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
const D = translateOSMToPixel(
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

const realA = translateOSMToPixel(
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
const realB = translateOSMToPixel(
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
const realC = translateOSMToPixel(
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
const realD = translateOSMToPixel(
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

const batA = translateOSMToPixel(
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
const batB = translateOSMToPixel(
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
const batC = translateOSMToPixel(
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
const batD = translateOSMToPixel(
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
  const [playerPosition, setPlayerPosition] = React.useState<Vector3>();

  const onSceneReady = React.useCallback<
    NonNullable<ReactSceneProps["onSceneReady"]>
  >((_canvas, scene, _engine, _camera) => {
    const boundaries = MeshBuilder.CreateLines(
      "lines",
      {
        points: [
          new Vector3(A.X, 0, A.Z),
          new Vector3(B.X, 0, B.Z),
          new Vector3(C.X, 0, C.Z),
          new Vector3(D.X, 0, D.Z),
          new Vector3(A.X, 0, A.Z),
        ],
        updatable: true,
      },
      scene
    );
    boundaries.color = new Color3(0, 1, 0);

    const rawBoundaries = MeshBuilder.CreateLines(
      "lines",
      {
        points: [
          new Vector3(rawA.X, 0, rawA.Z),
          new Vector3(rawB.X, 0, rawB.Z),
          new Vector3(rawC.X, 0, rawC.Z),
          new Vector3(rawD.X, 0, rawD.Z),
          new Vector3(rawA.X, 0, rawA.Z),
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
          new Vector3(realA.X, 0, realA.Z),
          new Vector3(realB.X, 0, realB.Z),
          new Vector3(realC.X, 0, realC.Z),
          new Vector3(realD.X, 0, realD.Z),
          new Vector3(realA.X, 0, realA.Z),
        ],
        updatable: true,
      },
      scene
    );
    realBoundaries.color = new Color3(0, 0, 1);

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
          setPlayerPosition(new Vector3(vector._x, vector._y + 0.3, vector._z));
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

  const onRender = React.useCallback(() => {
    // console.log("RERENDER");
  }, []);

  return (
    <div className="App">
      <h1>Babylon tileworld</h1>
      <ReactScene
        containerProps={containerProps}
        onSceneReady={onSceneReady}
        canvasProps={canvasProps}
        onRender={onRender}
      >
        {(_canvas, scene, _engine, _camera, _light) => (
          <>
            <Player scene={scene} position={playerPosition} />
            <OSMGround
              scene={scene}
              zoom={zoom}
              xmin={xmin}
              xmax={xmax}
              zmin={zmin}
              zmax={zmax}
              xFirstTile={rawXmin}
              zLastTile={rawZmax}
              subdivisions={groundSubdivisions}
            />
            <Buildings
              scene={scene}
              maxLatitude={maxLatitude}
              maxLongitude={maxLongitude}
              minLatitude={minLatitude}
              minLongitude={minLongitude}
              zoom={zoom}
              xBounds={xBounds}
              zBounds={zBounds}
              xDelta={rawXdelta}
              zDelta={rawZdelta}
              xmin={rawXmin}
              zmax={rawZmax}
            />
            {/* <DebugSphere scene={scene} />
            <DebugSphere
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
