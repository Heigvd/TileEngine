export function lon2pixel(lon: number, zoom: number) {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

export function lat2pixel(lat: number, zoom: number) {
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

export function latLon2pixel(lat: number, lon: number, zoom: number) {
  return {
    X: lon2pixel(lon, zoom),
    Z: lat2pixel(lat, zoom),
  };
}

export function latLon2tile(lat: number, lon: number, zoom: number) {
  return {
    X: Math.floor(lon2pixel(lon, zoom)),
    Z: Math.floor(lat2pixel(lat, zoom)),
  };
}

export function translateOSMToPixel(
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
  const { X, Z } = latLon2pixel(latitude, longitude, zoom);
  const ratioX = xBounds / xDelta;
  const ratioZ = zBounds / zDelta;
  // The given (x,z) position is top,left but as the engine is inverting top and bottom, the resulting position is bottom,left.
  // We then have to remove 1 in odrder to take the top of the next tile so we take the bottom of the current one
  const offsetZ = Z - 1;
  return {
    X: (X - xmin) * ratioX - xBounds / 2,
    Z: (zmax - offsetZ) * ratioZ - zBounds / 2,
  };
}

// export function latLongToPixel(lat: number, lon: number, zoomLevel: number) {
//   const minLatitude = -85.05112878;
//   const maxLatitude = 85.05112878;
//   const minLongitude = -180;
//   const maxLongitude = 180;
//   const mapSize = Math.pow(2, zoomLevel) * 256;

//   const latitude = clip(lat, minLatitude, maxLatitude);
//   const longitude = clip(lon, minLongitude, maxLongitude);

//   const p = {
//     X: ((longitude + 180.0) / 360.0) * (1 << zoomLevel),
//     Y:
//       ((1.0 -
//         Math.log(
//           Math.tan((latitude * Math.PI) / 180.0) +
//             1.0 / Math.cos(latitude * (Math.PI / 180))
//         ) /
//           Math.PI) /
//         2.0) *
//       (1 << zoomLevel),
//   };

//   const tilex = p.X;
//   const tiley = p.Y;

//   return {
//     X: clipByRange(tilex * 256 + (p.X - tilex) * 256, mapSize - 1),
//     Z: clipByRange(tiley * 256 + (p.Y - tiley) * 256, mapSize - 1),
//   };
// }

// export function latLongToTile(lat: number, lon: number, zoomLevel: number) {
//   // Just reduce the zoomLevel by 8 as a tile is 256 pixels
//   if (zoomLevel < 8) {
//     throw Error(
//       "The zoomLevel must be higher or equals to 8 because a tile is made from 256 pixels"
//     );
//   }
//   return latLongToPixel(lat, lon, zoomLevel - 8);
// }

// export function pixelXYToLatLongOSM(
//   pixelX: number,
//   pixelY: number,
//   zoomLevel: number
// ) {
//   const mapSize = Math.pow(2, zoomLevel) * 256;
//   const tileX = Math.trunc(pixelX / 256);
//   const tileY = Math.trunc(pixelY / 256);

//   const n =
//     Math.PI -
//     (2.0 * Math.PI * (clipByRange(pixelY, mapSize - 1) / 256)) /
//       Math.pow(2.0, zoomLevel);

//   return {
//     lat:
//       (clipByRange(pixelX, mapSize - 1) / 256 / Math.pow(2.0, zoomLevel)) *
//         360.0 -
//       180.0,
//     lon: (180.0 / Math.PI) * Math.atan(Math.sinh(n)),
//   };
// }

// function clipByRange(n: number, range: number) {
//   return n % range;
// }

// function clip(n: number, minValue: number, maxValue: number) {
//   return Math.min(Math.max(n, minValue), maxValue);
// }
