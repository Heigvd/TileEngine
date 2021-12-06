import { Vector2, Vector3 } from "@babylonjs/core";
import * as React from "react";
import { wgs84ToLV95, wgs84ToXY } from "../helpers/utils";

const overpassURL = "https://overpass-api.de/api/interpreter";

function overpassQuery(
  minLatitude: number,
  minLongitude: number,
  maxLatitude: number,
  maxLongitude: number
) {
  const bbox = `${minLatitude},${minLongitude},${maxLatitude},${maxLongitude}`;

  //   const test = `[out:json][timeout:30];(way["building"](46.77998349692696,6.643627882003784,46.78328225522533,6.651175618171692);relation["building"]["type"="multipolygon"](46.77998349692696,6.643627882003784,46.78328225522533,6.651175618171692););out;>;out+qt;`;

  return `${overpassURL}?data=[out:json][timeout:30];(
  way["building"](${bbox});
  relation["building"]["type"="multipolygon"](${bbox});
  );out;>;out+qt;
  `;

  //   return `${overpassURL}?data=${test}`;
}

interface OSMWay {
  type: "way";
  id: number;
  nodes: number[];
  tags: { [key: string]: string };
}

interface OSMNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
}

interface OSMRelation {
  type: "relation";
  id: number;
  tags: { [key: string]: string };
  members: { ref: number; role: "inner" | "outer"; type: string }[];
}

type OverpassElement = OSMWay | OSMNode | OSMRelation;

interface OverpassAnswer {
  elements: OverpassElement[];
  generator: string;
  osm3s: {
    copyright: string;
    timestamp_osm_base: string;
  };
  version: number;
}

interface OSMData {
  way: { [id: number]: OSMWay };
  node: { [id: number]: OSMNode };
}

export interface Building {
  height: number;
  points: Vector3[];
}

export function useBuildings(
  minLatitude: number,
  minLongitude: number,
  maxLatitude: number,
  maxLongitude: number,
  defaultHeight: number = 10
): Building[] {
  const [buildings, setBuildings] = React.useState<Building[]>([]);

  React.useEffect(() => {
    let mounted = true;
    fetch(
      overpassQuery(minLatitude, minLongitude, maxLatitude, maxLongitude)
    ).then((res) => {
      console.log("Getting buildings");
      if (res.statusText === "OK") {
        res.json().then((json: OverpassAnswer) => {
          const data: OSMData = { way: {}, node: {} };
          json.elements.forEach((element) => {
            if (element.type === "node" || element.type === "way") {
              data[element.type][element.id] = element;
            } else {
              console.log("Unused type : " + element.type);
            }
          });

          const buildings: Building[] = [];

          Object.values(data.way).forEach((way) => {
            const path: Vector3[] = [];

            way.nodes.forEach((nodeId) => {
              const node = data.node[nodeId];
              if (node != null) {
                const computedLat = Math.max(
                  minLatitude,
                  Math.min(maxLatitude, node.lat)
                );
                const computedLon = Math.max(
                  minLongitude,
                  Math.min(maxLongitude, node.lon)
                );
                const point = wgs84ToLV95(computedLat, computedLon);
                path.push(new Vector3(point.E, 0, point.N));
              }
            });

            buildings.push({ height: defaultHeight, points: path });
          });

          if (mounted) {
            setBuildings(buildings);
          }
        });
      }
      return () => {
        mounted = false;
      };
    });
  }, [defaultHeight, maxLatitude, maxLongitude, minLatitude, minLongitude]);
  return buildings;
}
