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
  VertexBuffer,
  MeshBuilder,
  FloatArray,
} from "@babylonjs/core";
import * as React from "react";

export interface Terrain {
  terrainVertices: number[];
  terrainUV: FloatArray;
  tiles: Blob[];
}

interface TiledGroundProps {
  scene: Scene;
  zoom: number;
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

export const defaultPrecision = { w: 2, h: 2 };

export function TiledGround({
  scene,
  zoom,
  xmin,
  xmax,
  zmin,
  zmax,
  terrainData,
  subdivisions,
  precision = defaultPrecision,
  onLoad,
}: TiledGroundProps) {
  React.useEffect(() => {
    console.log("RELOAD GROUND");

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
    const tiledGround = MeshBuilder.CreateTiledGround(
      "Tiled Ground",
      { xmin, zmin, xmax, zmax, subdivisions, precision },
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

    // console.log(tiledGround.getVerticesData(VertexBuffer.PositionKind));
    // console.log(terrainData.terrainVertices);

    // tiledGround.setVerticesData(VertexBuffer.UVKind, terrainData.terrainUV);
    tiledGround.setVerticesData(
      VertexBuffer.PositionKind,
      terrainData.terrainVertices
    );

    onLoad && onLoad(tiledGround);

    // const blob = new Blob(["Welcome to Websparrow.org."],
    //             { type: "text/plain;charset=utf-8" });

    // click action for player
    // tiledGround.actionManager = new ActionManager(scene);
    // tiledGround.actionManager.registerAction(
    //   new ExecuteCodeAction(ActionManager.OnPickUpTrigger, function (event) {
    //     console.log("CLICKED", event);
    //     alert("ground clicked");
    //   })
    // );
  }, [
    onLoad,
    precision,
    scene,
    subdivisions,
    terrainData.terrainUV,
    terrainData.terrainVertices,
    terrainData.tiles,
    xmax,
    xmin,
    zmax,
    zmin,
    zoom,
  ]);

  return null;
}
