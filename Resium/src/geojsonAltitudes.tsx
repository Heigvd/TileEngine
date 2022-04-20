import {
  FeatureCollection,
  GeoJsonObject,
  GeoJsonProperties,
  Geometry,
  Polygon,
} from "geojson";
import { lv95ToWGS84, wgs84ToLV95 } from "./proj";

function compareNumber(
  number1: number,
  number2: number,
  precision: number = 100
) {
  return (
    Math.round(parseFloat(String(number1)) * precision) / precision ===
    Math.round(parseFloat(String(number2)) * precision) / precision
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

export function getHeights(points: number[][]) {
  return fetch(
    `https://api3.geo.admin.ch/rest/services/profile.json?geom={%22type%22%3A%22LineString%22%2C%22coordinates%22%3A[${points.map(
      (point) => {
        const swissPoint = wgs84ToLV95(point[1], point[0]);
        return `[${swissPoint.E.toFixed(1)}%2C${swissPoint.N.toFixed(1)}]`;
      }
    )}]}&sr=2056&nb_points=${points.length}&distinct_points=true`,
    {
      method: "GET",
    }
  ).then(
    (res) =>
      res.json() as Promise<
        {
          dist: number;
          alts: { DTM2: number; COMB: number; DTM25: number };
          easting: number;
          northing: number;
        }[]
      >
  );
}

function isFeatureCollection(
  geojson: GeoJsonObject
): geojson is FeatureCollection {
  return geojson.type === "FeatureCollection";
}

function isPolygon(geometry: GeoJsonObject): geometry is Polygon {
  return geometry.type === "Polygon";
}

export function geojsonAltitudes(geojson: GeoJsonObject) {
  if (isFeatureCollection(geojson)) {
    const test = geojson.features.flatMap((feature) => {
      if (isPolygon(feature.geometry)) {
        return feature.geometry.coordinates.flatMap((coordinate) => {
          return coordinate;
        });
      } else {
        return [];
      }
    });

    const splicedData = [];
    const batchSize = 100;

    for (let i = 0; i < test.length / batchSize; i++) {
      splicedData.push(test.slice(i + batchSize, batchSize + i * batchSize));
    }

    const promisedData = splicedData.map((testdata) => {
      return getHeights(testdata).then((test) => {
        const gatheredData = [];
        let dataI = 0;

        for (let i = 0; i < test.length && dataI < testdata.length; i++) {
          const testItem = lv95ToWGS84(test[i].easting, test[i].northing);
          const dataItem = testdata[dataI];

          if (
            compareNumber(dataItem[0], testItem.longitude) &&
            compareNumber(dataItem[1], testItem.latitude)
          ) {
            gatheredData.push({ ...testItem, altitude: test[i].alts.COMB });
            dataI += 1;
          }
        }
        return gatheredData;
      });
    });

    return Promise.all(promisedData)
      .then((promise) => promise.flatMap((batch) => batch))
      .then((data) => {
        let dataI = 0;

        const newGeoJSON = { ...geojson };

        for (let i = 0; i < geojson.features.length; i++) {
          const feature = geojson.features[i];

          const newFeature = { ...feature };

          if (isPolygon(newFeature.geometry)) {
            for (let j = 0; j < newFeature.geometry.coordinates.length; j++) {
              const newCoordinates = newFeature.geometry.coordinates[j];

              for (let k = 0; k < newCoordinates.length; k++) {
                const dataItem = data[dataI];

                newCoordinates[k] = [
                  dataItem.longitude,
                  dataItem.latitude,
                  dataItem.altitude,
                ];
                dataI += 1;
              }
            }
          }

          newGeoJSON.features[i] = newFeature;
        }
        return newGeoJSON;
      });

    // return getHeights(testdata).then((test) => {
    //   const gatheredData = [];
    //   let dataI = 0;

    //   for (let i = 0; i < test.length && dataI < testdata.length; i++) {
    //     const testItem = lv95ToWGS84(test[i].easting, test[i].northing);
    //     const dataItem = testdata[dataI];

    //     if (
    //       compareNumber(dataItem[0], testItem.longitude) &&
    //       compareNumber(dataItem[1], testItem.latitude)
    //     ) {
    //       gatheredData.push({ ...testItem, altitude: test[i].alts.COMB });
    //       dataI += 1;
    //     }
    //   }

    //   console.log(test);
    //   console.log(gatheredData);

    //   return gatheredData;
    // });
  }
}
