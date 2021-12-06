import {
  Mesh,
  StandardMaterial,
  Color3,
  MultiMaterial,
  Texture,
  SubMesh,
  Scene,
} from "@babylonjs/core";

export function tilemap(
  scene: Scene,
  zoom: number,
  xTileBase: number,
  yTileBase: number
) {
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Tiled Ground Tutorial

  // Part 1 : Creation of Tiled Ground
  // Parameters
  const xmin = -10;
  const zmin = -10;
  const xmax = 10;
  const zmax = 10;
  const precision = {
    w: 2,
    h: 2,
  };
  const subdivisions = {
    h: 8,
    w: 8,
  };
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
        "http://b.tile.openstreetmap.org/" +
          zoom +
          "/" +
          (xTileBase + col) +
          "/" +
          (yTileBase - row) +
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
    (tiledGround.getIndices()?.length || 0) / (subdivisions.w * subdivisions.h);

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
}
