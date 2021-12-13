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
import { defaultPrecision } from "../Components/OSMGround";
import { getHeight, wgs84ToLV95 } from "./utils";

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
  precision: { h: number; w: number } = defaultPrecision
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
  offsetX: number,
  offsetY: number
): Promise<number[]> {
  const vertices = ground.getVerticesData(VertexBuffer.PositionKind);

  if (vertices) {
    const positions: number[][] = [];

    for (let i = 0; i < vertices.length / 3; i++) {
      positions.push([vertices[i * 3], vertices[i * 3 + 2]]);
    }

    return Promise.all(positions.map((pos) => getHeight(pos[0], pos[1])))
      .then((data) =>
        data.map((height, i) => [
          positions[i][0] - offsetX,
          height,
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
    return new Promise(() => []);
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

export async function getInitialPosition(
  minLatitude: number,
  minLongitude: number,
  maxLatitude: number,
  maxLongitude: number
): Promise<[number, number, number]> {
  const initPos = wgs84ToLV95(
    (maxLatitude + minLatitude) / 2,
    (maxLongitude + minLongitude) / 2
  );
  return [initPos.E, await getHeight(initPos.E, initPos.N), initPos.N];
}
