import { Vector2, Vector3 } from "@babylonjs/core";
import * as React from "react";
import { getHeight, wgs84ToLV95, wgs84ToXY } from "../helpers/utils";

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
  node["natural"="tree"](${bbox});
  way["natural"="tree"](${bbox});
  relation["natural"="tree"](${bbox});
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

export interface Tree {
  point: Vector3;
}

export function useTrees(
  minLatitude: number,
  minLongitude: number,
  maxLatitude: number,
  maxLongitude: number
): Tree[] {
  const [trees, setTrees] = React.useState<Tree[]>([]);

  React.useEffect(() => {
    let mounted = true;
    fetch(
      overpassQuery(minLatitude, minLongitude, maxLatitude, maxLongitude)
    ).then((res) => {
      console.log("Getting trees");
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

          const trees: Tree[] = Object.values(data.node).map((node) => {
            const point = wgs84ToLV95(node.lat, node.lon);

            return { point: new Vector3(point.E, 0.58, point.N) };
          });

          if (mounted) {
            Promise.all(
              trees.map(async (tree) => {
                return {
                  point: new Vector3(
                    tree.point.x,
                    await getHeight(tree.point.x, tree.point.z),
                    tree.point.z
                  ),
                };
              })
            ).then((trees) => {
              setTrees(trees);
            });
          }
        });
      }
      return () => {
        mounted = false;
      };
    });
  }, [maxLatitude, maxLongitude, minLatitude, minLongitude]);
  return trees;
}
