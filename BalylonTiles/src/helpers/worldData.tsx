import * as React from "react";
import { DataCoordinates } from "../DataApp";
import { latLon2pixel, tileToLonLat, wgs84ToLV95 } from "./utils";

export function worldData(dataCoordinates: DataCoordinates, zoom: number) {
  const minTile = latLon2pixel(
    dataCoordinates.minLatitude,
    dataCoordinates.minLongitude,
    zoom
  );
  const tileXmin = Math.floor(minTile.X) + 1;
  const tileZmin = Math.floor(minTile.Y) + 1;
  const maxTile = latLon2pixel(
    dataCoordinates.maxLatitude,
    dataCoordinates.maxLongitude,
    zoom
  );
  const tileXmax = Math.floor(maxTile.X);
  const tileZmax = Math.floor(maxTile.Y) + 2;

  const { lon: minLongitude, lat: minLatitude } = tileToLonLat(
    tileXmin,
    tileZmin - 1,
    zoom
  );
  const { lon: maxLongitude, lat: maxLatitude } = tileToLonLat(
    tileXmax,
    tileZmax - 1,
    zoom
  );

  const rawXmin = Math.min(tileXmin, tileXmax);
  const rawXmax = Math.max(tileXmin, tileXmax);
  const rawZmin = Math.min(tileZmin, tileZmax);
  const rawZmax = Math.max(tileZmin, tileZmax);
  const rawXdelta = rawXmax - rawXmin;
  const rawZdelta = rawZmax - rawZmin;

  const { E: xmin, N: zmin } = wgs84ToLV95(minLatitude, minLongitude);
  const { E: xmax, N: zmax } = wgs84ToLV95(maxLatitude, maxLongitude);

  const offsetX = (xmax + xmin) / 2;
  const offsetZ = (zmax + zmin) / 2;

  const groundSubdivisions = {
    h: rawZdelta,
    w: rawXdelta,
  };

  return {
    minLatitude,
    minLongitude,
    maxLatitude,
    maxLongitude,
    rawXmin,
    rawZmax,
    xmin,
    zmin,
    xmax,
    zmax,
    offsetX,
    offsetZ,
    groundSubdivisions,
  };
}
