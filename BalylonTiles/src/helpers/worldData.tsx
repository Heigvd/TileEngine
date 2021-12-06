import * as React from "react";
import { DataCoordinates } from "../DataApp";
import { latLon2pixel, tileToLonLat } from "./utils";

export function worldData(
  dataCoordinates: DataCoordinates,
  zoom: number,
  terrainWidth: number
) {
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
  const zxRatio = rawZdelta / rawXdelta;

  const xBounds = terrainWidth;
  const zBounds = terrainWidth * zxRatio;

  const xmin = -xBounds / 2;
  const xmax = xBounds / 2;
  const zmin = -zBounds / 2;
  const zmax = zBounds / 2;

  const groundSubdivisions = {
    h: rawZdelta,
    w: rawXdelta,
  };
  return {
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
  };
}
