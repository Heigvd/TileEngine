import proj4 from "proj4";

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
