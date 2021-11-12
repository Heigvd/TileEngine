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
} from "@babylonjs/core";
import * as React from "react";

interface OSMGroundProps {
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

    // click action for player
    // tiledGround.actionManager = new ActionManager(scene);
    // tiledGround.actionManager.registerAction(
    //   new ExecuteCodeAction(ActionManager.OnPickUpTrigger, function (event) {
    //     console.log("CLICKED", event);
    //     alert("ground clicked");
    //   })
    // );
  }, [
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
