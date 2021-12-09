import {
  Engine,
  EngineOptions,
  Mesh,
  MeshBuilder,
  Nullable,
  Scene,
  SceneOptions,
  SubMesh,
  VertexBuffer,
} from "@babylonjs/core";
import { ZOOM } from "../config";
import { xyToWGS84, wgs84ToLV95, getHeight } from "./utils";

export function createScene(
  canvas: Nullable<HTMLCanvasElement | WebGLRenderingContext>,
  antialias?: boolean,
  engineOptions?: EngineOptions,
  adaptToDeviceRatio?: boolean,
  sceneOptions?: SceneOptions
) {
  const engine = new Engine(
    canvas,
    antialias,
    engineOptions,
    adaptToDeviceRatio
  );
  const scene = new Scene(engine, sceneOptions);
  return { engine, scene };
}

export function createTiledGround(
  scene: Scene,
  xmin: number,
  zmin: number,
  xmax: number,
  zmax: number,
  subdivisions: { h: number; w: number },
  zoom: number,
  xStartTile: number,
  yStartTile: number,
  precision?: { h: number; w: number }
) {
  const tiledGround = MeshBuilder.CreateTiledGround(
    "Tiled Ground",
    {
      xmin,
      zmin,
      xmax,
      zmax,
      subdivisions,
      precision,
    },
    scene
  );

  // Needed constiables to set subMeshes
  const verticesCount = tiledGround.getTotalVertices();
  const tileIndicesLength =
    (tiledGround.getIndices()?.length || 0) / (subdivisions.w * subdivisions.h);

  // Set subMeshes of the tiled ground
  tiledGround.subMeshes = [];
  let index = 0;
  let base = 0;
  const tilesURL: string[] = [];

  for (let row = 0; row < subdivisions.h; row++) {
    for (let col = 0; col < subdivisions.w; col++) {
      const submesh = new SubMesh(
        index++,
        0,
        verticesCount,
        base,
        tileIndicesLength,
        tiledGround
      );
      tiledGround.subMeshes.push(submesh);
      base += tileIndicesLength;

      const tileURL =
        "https://a.tile.openstreetmap.fr/osmfr/" +
        zoom +
        "/" +
        (xStartTile + col) +
        "/" +
        (yStartTile - row - 2) +
        ".png";
      tilesURL.push(tileURL);
    }
  }
  return { tiledGround, tilesURL };
}

export function getGroundHeights(
  ground: Mesh,
  xBounds: number,
  zBounds: number,
  rawXdelta: number,
  rawZdelta: number,
  rawXmin: number,
  rawZmax: number,
  offsetX: number,
  offsetY: number
) {
  const vertices = ground.getVerticesData(VertexBuffer.PositionKind);

  if (vertices) {
    const verices3D: number[][] = [];

    for (let i = 0; i < vertices.length / 3; i++) {
      verices3D.push([vertices[i * 3], Math.random(), vertices[i * 3 + 2]]);
    }

    const positions = verices3D.map((pos) => {
      const { latitude, longitude } = xyToWGS84(
        pos[0],
        pos[2],
        ZOOM,
        xBounds,
        zBounds,
        rawXdelta,
        rawZdelta,
        rawXmin,
        rawZmax
      );

      const { E, N } = wgs84ToLV95(latitude, longitude);

      return [E, N, pos[0], pos[2]];
    });

    return Promise.all(positions.map((pos) => getHeight(pos[0], pos[1])))
      .then((data) =>
        data.map((height, i) => [
          positions[i][0] - offsetX,
          height,
          // 0,
          positions[i][1] - offsetY,
        ])
      )
      .then((data) => {
        return data.flatMap((d) => d);
      })
      .catch((e) => {
        throw e;
      });
  } else {
    return [];
  }
}

export function getTiles(tilesURL: string[]) {
  return Promise.all(
    tilesURL.map((tileUrl) => fetch(tileUrl).then((res) => res.blob()))
  )
    .then((blobs) => {
      return blobs;
    })

    .catch((e) => {
      throw e;
    });
}
