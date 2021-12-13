import { Scene, MeshBuilder, Vector3, Color3 } from "@babylonjs/core";
import { DataCoordinates } from "../DataApp";
import { wgs84ToXY, testCoordinateTranslation, wgs84ToLV95 } from "./utils";

export function debugBoundaries2(
  scene: Scene,
  dataCoordinates: DataCoordinates,
  zoom: number,
  xBounds: number,
  zBounds: number,
  rawXdelta: number,
  rawZdelta: number,
  rawXmin: number,
  rawZmax: number
) {
  const { maxLatitude, maxLongitude, minLatitude, minLongitude } =
    dataCoordinates;

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

  const rawA = wgs84ToXY(
    dataCoordinates.maxLatitude,
    dataCoordinates.minLongitude,
    zoom,
    xBounds,
    zBounds,
    rawXdelta,
    rawZdelta,
    rawXmin,
    rawZmax
  );
  const rawB = wgs84ToXY(
    dataCoordinates.minLatitude,
    dataCoordinates.maxLongitude,
    zoom,
    xBounds,
    zBounds,
    rawXdelta,
    rawZdelta,
    rawXmin,
    rawZmax
  );
  const rawC = wgs84ToXY(
    dataCoordinates.maxLatitude,
    dataCoordinates.maxLongitude,
    zoom,
    xBounds,
    zBounds,
    rawXdelta,
    rawZdelta,
    rawXmin,
    rawZmax
  );
  const rawD = wgs84ToXY(
    dataCoordinates.maxLatitude,
    dataCoordinates.minLongitude,
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

export function debugBoundaries(
  scene: Scene,
  rawDataCoordinates: DataCoordinates,
  dataCoordinates: DataCoordinates
) {
  const { maxLatitude, maxLongitude, minLatitude, minLongitude } =
    dataCoordinates;

  const A = wgs84ToLV95(minLatitude, minLongitude);
  const B = wgs84ToLV95(minLatitude, maxLongitude);
  const C = wgs84ToLV95(maxLatitude, maxLongitude);
  const D = wgs84ToLV95(maxLatitude, minLongitude);

  const rawA = wgs84ToLV95(
    rawDataCoordinates.minLatitude,
    rawDataCoordinates.minLongitude
  );
  const rawB = wgs84ToLV95(
    rawDataCoordinates.minLatitude,
    rawDataCoordinates.maxLongitude
  );
  const rawC = wgs84ToLV95(
    rawDataCoordinates.maxLatitude,
    rawDataCoordinates.maxLongitude
  );
  const rawD = wgs84ToLV95(
    rawDataCoordinates.maxLatitude,
    rawDataCoordinates.minLongitude
  );

  const boundaries = MeshBuilder.CreateLines(
    "lines",
    {
      points: [
        new Vector3(A.E, 0, A.N),
        new Vector3(B.E, 0, B.N),
        new Vector3(C.E, 0, C.N),
        new Vector3(D.E, 0, D.N),
        new Vector3(A.E, 0, A.N),
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
        new Vector3(rawA.E, 0, rawA.N),
        new Vector3(rawB.E, 0, rawB.N),
        new Vector3(rawC.E, 0, rawC.N),
        new Vector3(rawD.E, 0, rawD.N),
        new Vector3(rawA.E, 0, rawA.N),
      ],
      updatable: true,
    },
    scene
  );
  rawBoundaries.color = new Color3(1, 0, 0);
}
