import proj4 from "proj4";
import * as React from "react";

export function lon2x(lon: number, zoom: number) {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

export function x2lon(X: number, zoom: number) {
  return (X / Math.pow(2, zoom)) * 360 - 180;
}

export function lat2y(lat: number, zoom: number) {
  return (
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
    Math.pow(2, zoom)
  );
}

export function y2lat(Y: number, zoom: number) {
  const n = Math.PI - (2 * Math.PI * Y) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export function latLon2pixel(lat: number, lon: number, zoom: number) {
  return {
    X: lon2x(lon, zoom),
    Y: lat2y(lat, zoom),
  };
}

export function latLon2tile(lat: number, lon: number, zoom: number) {
  return {
    X: Math.floor(lon2x(lon, zoom)),
    Y: Math.floor(lat2y(lat, zoom)),
  };
}

export function pixel2latLon(X: number, Y: number, zoom: number) {
  return {
    longitude: x2lon(X, zoom),
    latitude: y2lat(Y, zoom),
  };
}

export function tileToLonLat(x: number, y: number, zoom: number) {
  return {
    lon: x2lon(x, zoom),
    lat: y2lat(y, zoom),
  };
}

export function wgs84ToXY2(
  latitude: number,
  longitude: number,
  zoom: number,
  xBounds: number,
  zBounds: number,
  xDelta: number,
  zDelta: number,
  xmin: number,
  zmax: number
) {
  const { X, Y } = latLon2pixel(latitude, longitude, zoom);
  const ratioX = xBounds / xDelta;
  const ratioZ = zBounds / zDelta;
  // The given (x,z) position is top,left but as the engine is inverting top and bottom, the resulting position is bottom,left.
  // We then have to remove 1 in odrder to take the top of the next tile so we take the bottom of the current one
  const offsetZ = Y - 1;
  return {
    X: (X - xmin) * ratioX - xBounds / 2,
    Y: (zmax - offsetZ) * ratioZ - zBounds / 2,
  };
}

export function xyToWGS84(
  X: number,
  Y: number,
  zoom: number,
  xBounds: number,
  zBounds: number,
  xDelta: number,
  zDelta: number,
  xmin: number,
  zmax: number
) {
  const ratioX = xBounds / xDelta;
  const ratioZ = zBounds / zDelta;
  const computedX = (X + xBounds / 2) / ratioX + xmin;
  const computedY = -((Y + zBounds / 2) / ratioZ + 1 - zmax);

  return pixel2latLon(computedX, computedY, zoom);
}

export function wgs84ToXY(
  latitude: number,
  longitude: number,
  zoom: number,
  _xBounds: number,
  _zBounds: number,
  _xDelta: number,
  _zDelta: number,
  _xmin: number,
  _zmax: number
) {
  const { X, Y } = latLon2pixel(latitude, longitude, zoom);
  const offsetZ = Y - 1;
  return { X, Y: -offsetZ };
}

proj4.defs([
  [
    "EPSG:4326",
    "+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees",
  ],
  [
    "EPSG:2056",
    "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs",
  ],
]);

export function wgs84ToLV95(latitude: number, longitude: number) {
  const coord = proj4("EPSG:4326", "EPSG:2056", [longitude, latitude]);
  return { E: coord[0], N: coord[1] };
}

export function lv95ToWGS84(E: number, N: number) {
  const coord = proj4("EPSG:2056", "EPSG:4326", [E, N]);
  return { longitude: coord[0], latitude: coord[1] };
}

export function testCoordinateTranslation(
  latitude: number,
  longitude: number,
  zoom: number,
  xBounds: number,
  zBounds: number,
  xDelta: number,
  zDelta: number,
  xmin: number,
  zmax: number
) {
  const wgs84lv95 = wgs84ToLV95(latitude, longitude);
  const lv95wgs84 = lv95ToWGS84(wgs84lv95.E, wgs84lv95.N);
  return wgs84ToXY(
    lv95wgs84.latitude,
    lv95wgs84.longitude,
    zoom,
    xBounds,
    zBounds,
    xDelta,
    zDelta,
    xmin,
    zmax
  );
}

export function getHeight(easting: number, northing: number) {
  return fetch(
    `https://api3.geo.admin.ch/rest/services/height?easting=${easting}&northing=${northing}`
  )
    .then((res) => res.json() as Promise<{ height: string }>)
    .then(({ height }) => {
      console.log(height);
      return Number(height);
    });
}

type ComparaisonTypes = "SIMPLE" | "SHALLOW" | "DEEP";
function simpleCheck(a: unknown, b: unknown) {
  return a !== b;
}
function shallowCheck(a: unknown, b: unknown, verbose?: boolean) {
  if (typeof a !== typeof b) {
    verbose && console.log("Not the same type");
    return false;
  }
  if (typeof a !== "object") {
    return simpleCheck(a, b);
  }

  type MyObject = Record<string, unknown>;

  const A = a as MyObject;
  const B = b as MyObject;
  const keys = Object.keys(A);
  if (deepCheck(A, B, verbose)) {
    verbose && console.log("Objects keys changed");
    return false;
  }
  for (const k in keys) {
    if (simpleCheck(A[k], B[k])) {
      verbose && console.log(`Object differ at key : ${k}`);
      return false;
    }
  }
  return true;
}
function deepCheck(a: unknown, b: unknown, verbose?: boolean) {
  try {
    return JSON.stringify(a) !== JSON.stringify(b);
  } catch (e) {
    verbose && console.log(e);
    return false;
  }
}
function compFNSelection(compType: ComparaisonTypes) {
  switch (compType) {
    case "SIMPLE":
      return (a: unknown, b: unknown, _verbose?: boolean) => simpleCheck(a, b);
    case "SHALLOW":
      return (a: unknown, b: unknown, verbose?: boolean) =>
        shallowCheck(a, b, verbose);
    case "DEEP":
      return (a: unknown, b: unknown, verbose?: boolean) =>
        deepCheck(a, b, verbose);
    default:
      console.log("Comparaison type unvailable. Test will always return false");
      return () => false;
  }
}
export function useComparator(
  object: object,
  compType: ComparaisonTypes = "SIMPLE"
) {
  const state = React.useRef(object);

  console.log("\n====== COMPARATOR ======");
  Object.keys(object).map((k: keyof object) => {
    const oldValue = state.current[k];
    const newValue = object[k];
    if (compFNSelection(compType)(oldValue, newValue)) {
      console.log(
        `Changes in ${k} : ${typeof newValue} \n----------------\nOLD : ${
          compType === "SIMPLE" ? oldValue : JSON.stringify(oldValue)
        }\nNEW : ${compType === "SIMPLE" ? newValue : JSON.stringify(newValue)}`
      );
    }
  });

  state.current = object;
}
