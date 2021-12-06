import { Vector3 } from "@babylonjs/core";
import * as React from "react";
import { lv95ToWGS84, wgs84ToLV95, wgs84ToXY } from "../helpers/utils";

//https://api3.geo.admin.ch/rest/services/profile.json?geom={%22type%22%3A%22LineString%22%2C%22coordinates%22%3A[[2550050%2C1206550]%2C[2556950%2C1204150]%2C[2561050%2C1207950]]}

const geoadminURL = "https://api3.geo.admin.ch/rest/services/profile.json";

function geoadminQuery(
  minLatitude: number,
  minLongitude: number,
  maxLatitude: number,
  maxLongitude: number,
  columns: number = 50,
  nbPoints: number = 2000
) {
  const deltaLongitude = maxLongitude - minLongitude;

  const points = [];

  const coordinates = [];
  let invert = false;

  for (
    let longitude = minLongitude;
    longitude <= maxLongitude;
    longitude += deltaLongitude / columns
  ) {
    const latStart = invert ? maxLatitude : minLatitude;
    const latEnd = invert ? minLatitude : maxLatitude;
    const lv95StartPoint = wgs84ToLV95(latStart, longitude);
    const lv95EndPoint = wgs84ToLV95(latEnd, longitude);

    coordinates.push([lv95StartPoint.E, lv95StartPoint.N]);
    coordinates.push([lv95EndPoint.E, lv95EndPoint.N]);
    invert = !invert;

    points.push({ latitude: latStart, longitude });
    points.push({ latitude: latEnd, longitude });
  }

  const geoJSON = {
    type: "LineString",
    coordinates: coordinates,
  };

  const sr = 2056; // LV95 : 2056 , LV03 : 21781
  // const nb_points = 2000;

  // const offset = 1000; // The offset value (INTEGER) in order to use the exponential moving algorithm . For a given value the offset value specify the number of values before and after used to calculate the average.
  // const distinct_points = false; // If True, it will ensure the coordinates given to the service are part of the response. Possible values are True or False, default to False.
  // const callback = () => {}; // Only available for profile.json. The name of the callback function.

  return {
    url: `${geoadminURL}?geom=${JSON.stringify(
      geoJSON
    )}&sr=${sr}&nb_points=${nbPoints}`,
    points: points,
  };
  // return {
  //   url: `${geoadminURL}?geom=${JSON.stringify(geoJSON)}&sr=${sr}`,
  //   points: points,
  // };
}

interface GeoAdminAnswer {
  dist: number;
  alts: { DTM2: number; COMB: number; DTM25: number };
  easting: number;
  northing: number;
}

export const HEIGHTS_COLS = 60;
export const HEIGHTS_NB_POINTS = 2000;
export const HEIGHTS_ROW = Math.round(HEIGHTS_NB_POINTS / HEIGHTS_COLS);

export function useHeights(
  minLatitude: number,
  minLongitude: number,
  maxLatitude: number,
  maxLongitude: number,
  zoom: number,
  xBounds: number,
  zBounds: number,
  xDelta: number,
  zDelta: number,
  xmin: number,
  zmax: number,
  defaultHeight: number = 1
) {
  const [heights, setHeights] = React.useState<{
    points: Vector3[];
    heights: Vector3[];
  }>({ points: [], heights: [] });

  React.useEffect(() => {
    let mounted = true;
    const { url, points } = geoadminQuery(
      minLatitude,
      minLongitude,
      maxLatitude,
      maxLongitude,
      HEIGHTS_COLS,
      HEIGHTS_NB_POINTS
    );
    fetch(url).then((res) => {
      console.log("Getting heights");
      if (res.statusText === "OK") {
        res.json().then((json: GeoAdminAnswer[]) => {
          if (mounted) {
            let minHeight: number;
            const heights = json
              .map((geoPoint) => {
                const { latitude, longitude } = lv95ToWGS84(
                  geoPoint.easting,
                  geoPoint.northing
                );
                const height = geoPoint.alts.COMB / 100;

                minHeight =
                  minHeight == null || height < minHeight ? height : minHeight;

                // debugger;

                const point = wgs84ToXY(
                  latitude,
                  longitude,
                  zoom,
                  xBounds,
                  zBounds,
                  xDelta,
                  zDelta,
                  xmin,
                  zmax
                );
                // debugger;

                return new Vector3(point.X, height, point.Y);
              })
              .map((v) => new Vector3(v.x, v.y - minHeight, v.z));
            // debugger;
            setHeights({
              heights,
              points: points.map(({ latitude, longitude }) => {
                const point = wgs84ToXY(
                  latitude,
                  longitude,
                  zoom,
                  xBounds,
                  zBounds,
                  xDelta,
                  zDelta,
                  xmin,
                  zmax
                );
                return new Vector3(point.X, 0, point.Y);
              }),
            });
          }
        });
      }
      return () => {
        mounted = false;
      };
    });
  }, [
    defaultHeight,
    maxLatitude,
    maxLongitude,
    minLatitude,
    minLongitude,
    xBounds,
    xDelta,
    xmin,
    zBounds,
    zDelta,
    zmax,
    zoom,
  ]);
  return heights;
}
