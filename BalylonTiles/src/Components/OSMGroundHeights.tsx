import {
  Mesh,
  StandardMaterial,
  Color3,
  MultiMaterial,
  Texture,
  SubMesh,
  Scene,
  TargetCamera,
  ActionManager,
  ExecuteCodeAction,
  MorphTargetManager,
  VertexData,
  Vector3,
  MorphTarget,
} from "@babylonjs/core";
import * as React from "react";
import { HEIGHTS_ROW } from "../hooks/useHeights";

interface OSMGroundProps {
  heights: Vector3[];
  scene: Scene;
  zoom: number;
  xmin: number;
  xmax: number;
  zmin: number;
  zmax: number;
  xFirstTile: number;
  zLastTile: number;
  subdivisions: {
    w: number;
    h: number;
  };
  precision?: {
    w: number;
    h: number;
  };
}

const defaultPrecision = { w: 2, h: 2 };

export function OSMGround({
  heights,
  scene,
  zoom,
  xmin,
  xmax,
  zmin,
  zmax,
  xFirstTile,
  zLastTile,
  subdivisions,
  precision = defaultPrecision,
}: OSMGroundProps) {
  React.useEffect(() => {
    console.log("RELOAD GROUND");

    const positions = heights.flatMap((height) => [
      height.x,
      height.y,
      height.z,
    ]);

    const indices: number[] = [];
    for (let i = 0; i < heights.length; i += 1) {
      // const index = col * HEIGHTS_ROW + row;
      const col = Math.floor(i / HEIGHTS_ROW);
      const row = Math.round(i % HEIGHTS_ROW);
      const nextRowIndex = (col + 2) * HEIGHTS_ROW - row;
      if (col % 2 === 0) {
        indices.push(i);
        indices.push(nextRowIndex - 1);
        indices.push(i + 1);

        indices.push(i + 1);
        indices.push(nextRowIndex - 1);
        indices.push(nextRowIndex - 2);
      } else {
        indices.push(i);
        indices.push(i + 1);
        indices.push(nextRowIndex - 1);

        indices.push(i + 1);
        indices.push(nextRowIndex - 2);
        indices.push(nextRowIndex - 1);
      }
    }

    const minX = Math.min(...heights.map((h) => h.x));
    const maxX = Math.max(...heights.map((h) => h.x));
    const minZ = Math.min(...heights.map((h) => h.z));
    const maxZ = Math.max(...heights.map((h) => h.z));

    const uvs: number[] = [];
    for (let p = 0; p < positions.length / 3; p++) {
      uvs.push(
        (positions[3 * p] - minX) / (maxX - minX),
        (positions[3 * p + 2] - minZ) / (maxZ - minZ)
      );
    }
    const customMesh = new Mesh("custom", scene);
    const vertexData = new VertexData();
    //Empty array to contain calculated values or normals added
    const normals: number[] = [];
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals; //Assignment of normal to vertexData added
    vertexData.uvs = uvs;
    vertexData.applyToMesh(customMesh);
    // customMesh.convertToFlatShadedMesh();

    // OSM doesn't have heightmap so if we want it we should try with another dataset
    // https://opendem.info/
    // const heightmapGround = Mesh.CreateGroundFromHeightMap(
    //   "Heightmap Ground",
    //   "heightmapURL",
    //   xmax - xmin,
    //   zmax - zmin,
    //   10,
    //   0,
    //   100,
    //   scene
    // );

    // Create the Tiled Ground
    const tiledGround = Mesh.CreateTiledGround(
      "Tiled Ground",
      xmin,
      zmin,
      xmax,
      zmax,
      subdivisions,
      precision,
      scene
    );

    // Part 2 : Create the multi material
    // Create differents materials
    const whiteMaterial = new StandardMaterial("White", scene);
    whiteMaterial.diffuseColor = new Color3(1, 1, 1);

    const blackMaterial = new StandardMaterial("Black", scene);
    blackMaterial.diffuseColor = new Color3(0, 0, 0);

    // Create Multi Material
    const multimat = new MultiMaterial("multi", scene);
    for (let row = 0; row < subdivisions.h; row++) {
      for (let col = 0; col < subdivisions.w; col++) {
        const material = new StandardMaterial(
          "material" + row + "-" + col,
          scene
        );
        material.diffuseTexture = new Texture(
          // "http://b.tile.openstreetmap.org/" +
          "https://a.tile.openstreetmap.fr/osmfr/" +
            zoom +
            "/" +
            (xFirstTile + col) +
            "/" +
            (zLastTile - row) +
            ".png",
          scene
        );
        material.diffuseTexture.wrapU = Texture.CLAMP_ADDRESSMODE;
        material.diffuseTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
        material.specularColor = new Color3(0, 0, 0);
        material.backFaceCulling = false;
        multimat.subMaterials.push(material);
      }
    }

    // Part 3 : Apply the multi material
    // Define multimat as material of the tiled ground
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

    tiledGround.morphTargetManager = new MorphTargetManager();
    tiledGround.morphTargetManager.addTarget(
      MorphTarget.FromMesh(customMesh, "Heights", 1.0)
    );

    // click action for player
    // tiledGround.actionManager = new ActionManager(scene);
    // tiledGround.actionManager.registerAction(
    //   new ExecuteCodeAction(ActionManager.OnPickUpTrigger, function (event) {
    //     console.log("CLICKED", event);
    //     alert("ground clicked");
    //   })
    // );
  }, [
    heights,
    precision,
    scene,
    subdivisions,
    xFirstTile,
    xmax,
    xmin,
    zLastTile,
    zmax,
    zmin,
    zoom,
  ]);

  return null;
}
