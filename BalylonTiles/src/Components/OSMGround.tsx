import {
  Mesh,
  StandardMaterial,
  Color3,
  MultiMaterial,
  Texture,
  SubMesh,
  Scene,
  MeshBuilder,
  FloatArray,
  IndicesArray,
  VertexBuffer,
  Vector3,
} from "@babylonjs/core";

import * as React from "react";

export interface Terrain {
  positions: number[];
  tiles: Blob[];
}

interface OSMGroundProps {
  scene: Scene;
  xmin: number;
  xmax: number;
  zmin: number;
  zmax: number;
  terrainData: Terrain;
  subdivisions: {
    w: number;
    h: number;
  };
  precision?: {
    w: number;
    h: number;
  };
  onLoad?: (tiledGround: Mesh) => void;
}

export const defaultPrecision = { w: 6, h: 6 };

export function OSMGround({
  scene,
  xmin,
  xmax,
  zmin,
  zmax,
  terrainData,
  subdivisions,
  precision = defaultPrecision,
  onLoad,
}: OSMGroundProps) {
  React.useEffect(() => {
    console.log("RELOAD GROUND");

    // Create the Tiled Ground
    const tiledGround = MeshBuilder.CreateTiledGround(
      "Tiled Ground",
      { xmin, zmin, xmax, zmax, subdivisions, precision },
      scene
    );
    // Part 2 : Create the multi material
    const multimat = new MultiMaterial("multi", scene);
    for (let row = 0; row < subdivisions.h; row++) {
      for (let col = 0; col < subdivisions.w; col++) {
        const material = new StandardMaterial(
          "material" + row + "-" + col,
          scene
        );
        const blobURL = URL.createObjectURL(
          terrainData.tiles[row * subdivisions.w + col]
        );
        material.diffuseTexture = new Texture(blobURL, scene);
        material.diffuseTexture.wrapU = Texture.CLAMP_ADDRESSMODE;
        material.diffuseTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
        material.specularColor = new Color3(0, 0, 0);
        //material.backFaceCulling = false;

        // Carefull with this one, avoid flickering but cause the sprite to be redered behind
        // material.useLogarithmicDepth = true;
        multimat.subMaterials.push(material);
      }
    }

    // Part 3 : Apply the multi material
    tiledGround.material = multimat;

    // Needed constiables to set subMeshes
    const verticesCount = tiledGround.getTotalVertices();
    const tileIndicesLength =
      (tiledGround.getIndices()?.length || 0) /
      (subdivisions.w * subdivisions.h);

    // Set subMeshes of the tiled ground
    tiledGround.subMeshes = [];
    let index = 0;
    let base = 0;
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
      }
    }

    tiledGround.isPickable = true;
    tiledGround.receiveShadows = true;

    tiledGround.setVerticesData(
      VertexBuffer.PositionKind,
      terrainData.positions
    );

    // const positions: Vector3[] = [];
    // for (let i = 0; i < terrainData.positions.length / 3; ++i) {
    //   positions.push(
    //     new Vector3(
    //       terrainData.positions[i * 3],
    //       terrainData.positions[i * 3 + 1],
    //       terrainData.positions[i * 3 + 2]
    //     )
    //   );
    // }
    // const building = MeshBuilder.ExtrudePolygon(
    //   "building",
    //   {
    //     shape: positions,
    //     depth: 400,
    //     sideOrientation: Mesh.DOUBLESIDE,
    //   },
    //   scene
    // );

    onLoad && onLoad(tiledGround);
  }, [
    onLoad,
    precision,
    scene,
    subdivisions,
    terrainData.positions,
    terrainData.tiles,
    xmax,
    xmin,
    zmax,
    zmin,
  ]);

  return null;
}
