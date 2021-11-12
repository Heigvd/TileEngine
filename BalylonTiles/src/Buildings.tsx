import {
  ActionManager,
  Color3,
  Color4,
  ExecuteCodeAction,
  Mesh,
  MeshBuilder,
  Polygon,
  Scene,
  StandardMaterial,
  Vector3,
  Vector4,
  VertexData,
} from "@babylonjs/core";
import * as React from "react";
import { translateOSMToPixel } from "./utils";

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

interface BuildingsProps {
  scene: Scene;
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
  zoom: number;
  xBounds: number;
  zBounds: number;
  xDelta: number;
  zDelta: number;
  xmin: number;
  zmax: number;
}

export function Buildings({
  scene,
  minLatitude,
  minLongitude,
  maxLatitude,
  maxLongitude,
  zoom,
  xBounds,
  zBounds,
  xDelta,
  zDelta,
  xmin,
  zmax,
}: BuildingsProps) {
  React.useLayoutEffect(() => {
    fetch(
      overpassQuery(minLatitude, minLongitude, maxLatitude, maxLongitude)
    ).then((res) => {
      console.log("REALOAD BUILDINGS");
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

          const material = new StandardMaterial("buildingColor", scene);
          material.diffuseColor = Color3.Green();
          // material.alpha = 0.9;

          Object.values(data.way).forEach((way) => {
            const path1: Vector3[] = [];

            way.nodes.forEach((nodeId) => {
              const node = data.node[nodeId];
              const point = translateOSMToPixel(
                node.lat,
                node.lon,
                zoom,
                xBounds,
                zBounds,
                xDelta,
                zDelta,
                xmin,
                zmax
              );
              path1.push(new Vector3(point.X, 0, point.Z));
            });

            const building = MeshBuilder.ExtrudePolygon(
              "building",
              { shape: path1, depth: 1, sideOrientation: Mesh.DOUBLESIDE },
              scene
            );
            building.position = new Vector3(
              building.position._x,
              1,
              building.position._z
            );
            building.material = material;

            ///////////////////////////////////////////////
            // TEST : click action for building
            // building.isPickable = true;
            // building.actionManager = new ActionManager(scene);
            // building.actionManager.registerAction(
            //   new ExecuteCodeAction(ActionManager.OnPickUpTrigger, function () {
            //     console.log("CLICKED");
            //     alert("building clicked");
            //   })
            // );
          });
        });
      }
    });
  }, [
    maxLatitude,
    maxLongitude,
    minLatitude,
    minLongitude,
    scene,
    xBounds,
    xDelta,
    xmin,
    zBounds,
    zDelta,
    zmax,
    zoom,
  ]);

  return null;
}
